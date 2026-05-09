import express from 'express';
import { body, validationResult } from 'express-validator';
import NodeCache from 'node-cache';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { Conversation, Message } from '../models/Conversation.js';
import { ToolLog } from '../models/ToolLog.js';
import { SystemPrompt } from '../models/SystemPrompt.js';
import { Memory } from '../models/Memory.js';
import { Folder } from '../models/Folder.js';
import { authenticateUser, addSSEConnection, removeSSEConnection } from '../middleware/auth.js';
import { messageLimiter } from '../middleware/rateLimit.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { TOOLS, executeTool } from '../utils/tools.js';
import { MODELS, ANTHROPIC_SMALL_FAST_MODEL, ANTHROPIC_BASE_URL } from '../utils/config.js';
import logger from '../utils/logger.js';

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: ANTHROPIC_BASE_URL,
});

const router = express.Router();

// Helper function to generate conversation title
async function generateTitleForConversation(conversationId, userMessage, userId) {
  try {
    const response = await anthropicClient.messages.create({
      model: ANTHROPIC_SMALL_FAST_MODEL,
      max_tokens: 30,
      messages: [{
        role: 'user',
        content: `Based on this first message, generate a short 4-word title for this conversation. Respond with ONLY the title, nothing else. Message: "${userMessage.slice(0, 200)}"`
      }]
    });
    const title = response.content[0].text.trim().slice(0, 50) || 'New Conversation';
    console.log('Generated title:', title);
    const updated = await Conversation.findOneAndUpdate(
      { conversationId, userId },
      { title },
      { new: true }
    );
    console.log('Updated conversation title in DB:', updated?.title);
    // Force delete cache so next fetch gets fresh data
    cache.del(`convList:${userId}`);
    return title;
  } catch (err) {
    logger.debug('Title generation failed', { error: err.message, conversationId });
    return null;
  }
}

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map(e => ({ field: e.path, message: e.msg }));
    return res.status(400).json({ errors: formatted });
  }
  next();
};

// POST /api/conversations
router.post('/', authenticateUser, asyncHandler(async (req, res) => {
  // Ensure only valid model is used (no highspeed)
  const model = MODELS.find(m => m.id === req.body.model)?.id || 'MiniMax-M2.7';
  const systemPromptId = req.body.systemPromptId || null;
  const conversation = new Conversation({
    conversationId: crypto.randomUUID(),
    userId: req.user._id,
    folderId: req.body.folderId || null,
    messages: [],
    model,
    systemPromptId,
    toolsEnabled: req.body.toolsEnabled !== undefined ? req.body.toolsEnabled : true
  });
  await conversation.save();

  cache.del(`convList:${req.user._id}`);
  logger.info('Conversation created', { conversationId: conversation.conversationId, userId: req.user._id, requestId: req.requestId });
  res.status(201).json(conversation);
}));

// GET /api/conversations
router.get('/', authenticateUser, asyncHandler(async (req, res) => {
  const cacheKey = `convList:${req.user._id}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const conversations = await Conversation.find({ userId: req.user._id })
    .select('conversationId title createdAt updatedAt folderId model toolsEnabled')
    .sort({ createdAt: -1 });
  res.json(conversations);
  cache.set(cacheKey, conversations, 60);
}));

// GET /api/conversations/search
router.get('/search', authenticateUser, asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length === 0) return res.json([]);

  const searchRegex = new RegExp(q.trim(), 'i');
  const conversations = await Conversation.find({
    userId: req.user._id,
    $or: [
      { title: searchRegex },
      { 'messages.content': searchRegex }
    ]
  }).select('conversationId title createdAt updatedAt messages').sort({ updatedAt: -1 }).limit(20);

  const results = [];
  for (const conv of conversations) {
    let matchedInTitle = false;
    let matchedInMessage = false;
    let messageSnippet = '';

    if (conv.title && searchRegex.test(conv.title)) matchedInTitle = true;

    for (const msg of conv.messages) {
      if (msg.content && searchRegex.test(msg.content)) {
        matchedInMessage = true;
        const content = msg.content;
        const matchIndex = content.search(searchRegex);
        const start = Math.max(0, matchIndex - 30);
        const end = Math.min(content.length, matchIndex + q.trim().length + 30);
        messageSnippet = (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '');
        messageSnippet = messageSnippet.replace(searchRegex, '<mark>$&</mark>');
        break;
      }
    }

    if (matchedInTitle || matchedInMessage) {
      results.push({
        conversationId: conv.conversationId,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        titleHighlight: matchedInTitle ? conv.title.replace(searchRegex, '<mark>$&</mark>') : null,
        messageSnippet: matchedInMessage ? messageSnippet : null
      });
    }
  }

  res.json(results);
}));

// GET /api/conversations/:id
router.get('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const { limit = 50, before } = req.query;
  const pageLimit = Math.min(parseInt(limit) || 50, 100);

  const conversation = await Conversation.findOne({ conversationId: req.params.id, userId: req.user._id });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  // Pagination: get messages before a certain index (for infinite scroll up)
  let messages = conversation.messages;
  let hasMore = false;

  if (before !== undefined) {
    const beforeIndex = parseInt(before);
    if (!isNaN(beforeIndex) && beforeIndex > 0) {
      messages = messages.slice(0, beforeIndex);
      hasMore = beforeIndex < conversation.messages.length;
    }
  } else {
    // Default: return last 50 messages
    messages = messages.slice(-pageLimit);
    hasMore = conversation.messages.length > pageLimit;
  }

  res.json({
    ...conversation.toObject(),
    messages,
    hasMore,
    totalMessages: conversation.messages.length
  });
}));

// GET /api/conversations/:id/tool-logs
router.get('/:id/tool-logs', authenticateUser, asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOne({ conversationId: req.params.id, userId: req.user._id });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const toolLogs = await ToolLog.find({ conversationId: req.params.id }).sort({ createdAt: -1 }).limit(100);
  res.json(toolLogs);
}));

// POST /api/conversations/:id/messages
router.post('/:id/messages',
  authenticateUser,
  messageLimiter,
  body('content').isLength({ min: 1, max: 32000 }).trim(),
  validate,
  asyncHandler(async (req, res) => {
    const { content } = req.body;

    const conversation = await Conversation.findOne({ conversationId: req.params.id, userId: req.user._id });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    conversation.messages.push({ role: 'user', content });
    await conversation.save();

    const conversationMessages = conversation.messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    addSSEConnection(res);

    let systemContent = null;
    if (conversation.systemPromptId) {
      const systemPrompt = await SystemPrompt.findById(conversation.systemPromptId);
      if (systemPrompt) systemContent = systemPrompt.content;
    }

    const memoryKey = `memory:${req.user._id}`;
    const memories = cache.get(memoryKey) || await Memory.find({ userId: req.user._id, isActive: true }).limit(5);
    if (memories.length > 0 && !cache.get(memoryKey)) cache.set(memoryKey, memories, 120);

    let systemWithMemory = systemContent;
    if (memories.length > 0 && conversationMessages.length <= 5) {
      const memoryContext = memories.map(m => m.content).join('\n');
      systemWithMemory = systemContent
        ? `${systemContent}\n\nUser memory:\n${memoryContext}`
        : `User memory:\n${memoryContext}`;
    }

    const useTools = conversation.toolsEnabled !== false;
    // Validate model - ensure no highspeed
    const validModel = MODELS.find(m => m.id === conversation.model)?.id || 'MiniMax-M2.7';

    for (let iteration = 0; iteration < 5; iteration++) {
      const streamParams = {
        model: validModel,
        max_tokens: 1024,
        messages: conversationMessages,
      };
      if (systemWithMemory) streamParams.system = systemWithMemory;
      if (useTools) streamParams.tools = TOOLS;

      let assistantContent = '';
      let toolUseBlock = null;
      let toolUseIndex = -1;
      let inToolUseBlock = false;

      try {
        const stream = await anthropicClient.messages.stream(streamParams);
        let parsedContent = false;

        for await (const chunk of stream) {
          if (chunk.type === "message_delta" && chunk.usage) {
            // message finished
          }
          if (chunk.type === "content_block_start") {
            if (chunk.content_block.type === 'tool_use') {
              toolUseBlock = {
                name: chunk.content_block.name,
                input: chunk.content_block.input || {}
              };
              toolUseIndex = assistantContent.length;
              inToolUseBlock = true;
            }
            if (chunk.content_block.type === 'text') {
              parsedContent = true;
            }
          }
          if (chunk.type === "content_block_delta") {
            if (chunk.delta.type === "text_delta") {
              if (!inToolUseBlock) {
                assistantContent += chunk.delta.text;
                res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
              }
            }
            if (chunk.delta.type === "input_json_delta") {
              if (toolUseBlock && chunk.delta.partial_json) {
                toolUseBlock.input._partial = (toolUseBlock.input._partial || '') + chunk.delta.partial_json;
              }
            }
          }
          if (chunk.type === "message_stop") {
            parsedContent = true;
          }
        }

        if (inToolUseBlock && toolUseBlock) {
          try {
            const partial = toolUseBlock.input._partial || '';
            const nameMatch = assistantContent.match(/"name":\s*"([^"]+)"/);
            if (nameMatch) toolUseBlock.name = nameMatch[1];
            if (partial) {
              try {
                const cleaned = partial.replace(/^[\[\{]/, '').replace(/[\]\}]$/, '');
                if (cleaned) toolUseBlock.input = JSON.parse(partial);
              } catch { /* keep as-is */ }
            }
          } catch (err) {
            logger.debug('Tool parse error', { error: err.message });
          }
        }

        if (!toolUseBlock && assistantContent.trim()) {
          conversation.messages.push({ role: 'assistant', content: assistantContent });
          await conversation.save();
          cache.del(`convList:${req.user._id}`);

          // Generate title for first message only
          if (conversation.messages.length === 2) {
            const userMsg = conversation.messages[0]?.content || '';
            const generatedTitle = await generateTitleForConversation(
              conversation.conversationId,
              userMsg,
              req.user._id
            );
            if (generatedTitle) {
              res.write(`data: ${JSON.stringify({ done: true, title: generatedTitle })}\n\n`);
            } else {
              res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            }
          } else {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          }
          res.end();
          removeSSEConnection(res);
          return;
        }

        if (toolUseBlock) {
          const toolName = toolUseBlock.name;
          const toolInput = toolUseBlock.input || {};

          res.write(`data: ${JSON.stringify({ type: 'tool_call', tool: toolName, input: toolInput })}\n\n`);

          const result = await executeTool(toolName, toolInput);

          await ToolLog.create({
            conversationId: req.params.id,
            toolName,
            toolInput,
            toolOutput: result,
            durationMs: result.durationMs || 0
          });

          res.write(`data: ${JSON.stringify({ type: 'tool_result', tool: toolName, result })}\n\n`);

          conversationMessages.push({
            role: 'assistant',
            content: assistantContent
          });

          conversationMessages.push({
            role: 'user',
            content: `<tool_result>\n${JSON.stringify({ tool: toolName, result })}\n</tool_result>`
          });
        } else {
          break;
        }

      } catch (err) {
        logger.error('Stream error in tool loop', { requestId: req.requestId, error: err.message, iteration });
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
        removeSSEConnection(res);
        return;
      }
    }

    const finalResponse = "I've used the available tools to help answer your question. Is there anything else you'd like me to elaborate on?";
    conversation.messages.push({ role: 'assistant', content: finalResponse });
    await conversation.save();
    res.write(`data: ${JSON.stringify({ text: finalResponse, done: true })}\n\n`);
    res.end();
    removeSSEConnection(res);
  })
);

// PATCH /api/conversations/:id/tools-toggle
router.patch('/:id/tools-toggle', authenticateUser, asyncHandler(async (req, res) => {
  const { toolsEnabled } = req.body;
  const conversation = await Conversation.findOneAndUpdate(
    { conversationId: req.params.id, userId: req.user._id },
    { toolsEnabled },
    { new: true }
  );
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  res.json(conversation);
}));

// PATCH /api/conversations/:id/model
router.patch('/:id/model', authenticateUser, asyncHandler(async (req, res) => {
  const { model } = req.body;
  if (!model) return res.status(400).json({ error: 'Model is required' });

  const validModel = MODELS.find(m => m.id === model);
  if (!validModel) return res.status(400).json({ error: 'Invalid model' });

  const conversation = await Conversation.findOneAndUpdate(
    { conversationId: req.params.id, userId: req.user._id },
    { model },
    { new: true }
  );
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  cache.del(`convList:${req.user._id}`);
  logger.info('Model updated', { conversationId: req.params.id, model, userId: req.user._id, requestId: req.requestId });
  res.json(conversation);
}));

// PATCH /api/conversations/:id/system-prompt
router.patch('/:id/system-prompt', authenticateUser, asyncHandler(async (req, res) => {
  const { systemPromptId } = req.body;
  if (systemPromptId !== null) {
    const validPrompt = await SystemPrompt.findById(systemPromptId);
    if (!validPrompt) return res.status(400).json({ error: 'Invalid system prompt' });
  }

  const conversation = await Conversation.findOneAndUpdate(
    { conversationId: req.params.id, userId: req.user._id },
    { systemPromptId },
    { new: true }
  );
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  cache.del(`convList:${req.user._id}`);
  logger.info('System prompt updated', { conversationId: req.params.id, systemPromptId, userId: req.user._id, requestId: req.requestId });
  res.json(conversation);
}));

// PATCH /api/conversations/:id/folder
router.patch('/:id/folder', authenticateUser, asyncHandler(async (req, res) => {
  const { folderId } = req.body;
  if (folderId !== null) {
    const folder = await Folder.findOne({ _id: folderId, userId: req.user._id });
    if (!folder) return res.status(400).json({ error: 'Invalid folder' });
  }

  const conversation = await Conversation.findOneAndUpdate(
    { conversationId: req.params.id, userId: req.user._id },
    { folderId },
    { new: true }
  );
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  cache.del(`convList:${req.user._id}`);
  logger.info('Folder updated', { conversationId: req.params.id, folderId, userId: req.user._id, requestId: req.requestId });
  res.json(conversation);
}));

// POST /api/conversations/:id/title
router.post('/:id/title', authenticateUser, asyncHandler(async (req, res) => {
  const { firstMessage } = req.body;
  if (!firstMessage) return res.status(400).json({ error: 'First message is required' });

  const conversation = await Conversation.findOne({ conversationId: req.params.id, userId: req.user._id });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const response = await anthropicClient.messages.create({
    model: ANTHROPIC_SMALL_FAST_MODEL,
    max_tokens: 30,
    messages: [{
      role: 'user',
      content: `Based on this first message, generate a short 4-word title for this conversation. Respond with ONLY the title, nothing else. Message: "${firstMessage}"`
    }]
  });

  const title = response.content[0].text.trim().slice(0, 50) || 'New Conversation';
  conversation.title = title;
  await conversation.save();

  cache.del(`convList:${req.user._id}`);
  logger.info('Title generated', { conversationId: req.params.id, title, userId: req.user._id, requestId: req.requestId });
  res.json({ title });
}));

// PATCH /api/conversations/:id/title
router.patch('/:id/title', authenticateUser, asyncHandler(async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const conversation = await Conversation.findOneAndUpdate(
    { conversationId: req.params.id, userId: req.user._id },
    { title },
    { new: true }
  );
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  cache.del(`convList:${req.user._id}`);
  logger.info('Title updated', { conversationId: req.params.id, title, userId: req.user._id, requestId: req.requestId });
  res.json(conversation);
}));

// PATCH /api/conversations/:id/pin
router.patch('/:id/pin', authenticateUser, asyncHandler(async (req, res) => {
  const { isPinned } = req.body;
  const conversation = await Conversation.findOneAndUpdate(
    { conversationId: req.params.id, userId: req.user._id },
    { isPinned },
    { new: true }
  );
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  cache.del(`convList:${req.user._id}`);
  logger.info('Conversation pin updated', { conversationId: req.params.id, isPinned, userId: req.user._id, requestId: req.requestId });
  res.json(conversation);
}));

// PATCH /api/conversations/:id/messages/:messageIndex/rating
router.patch('/:id/messages/:messageIndex/rating', authenticateUser, asyncHandler(async (req, res) => {
  const { rating } = req.body;
  const messageIndex = parseInt(req.params.messageIndex);

  const conversation = await Conversation.findOne({ conversationId: req.params.id, userId: req.user._id });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  if (messageIndex < 0 || messageIndex >= conversation.messages.length) {
    return res.status(400).json({ error: 'Invalid message index' });
  }

  conversation.messages[messageIndex].rating = rating;
  await conversation.save();

  logger.info('Message rating updated', { conversationId: req.params.id, messageIndex, rating, userId: req.user._id, requestId: req.requestId });
  res.json({ success: true, rating });
}));

// PATCH /api/conversations/:id/messages/:messageIndex
router.patch('/:id/messages/:messageIndex', authenticateUser, asyncHandler(async (req, res) => {
  const { content } = req.body;
  const messageIndex = parseInt(req.params.messageIndex);

  if (!content) return res.status(400).json({ error: 'Content is required' });

  const conversation = await Conversation.findOne({ conversationId: req.params.id, userId: req.user._id });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  if (messageIndex < 0 || messageIndex >= conversation.messages.length) {
    return res.status(400).json({ error: 'Invalid message index' });
  }

  const message = conversation.messages[messageIndex];
  if (message.role !== 'user') {
    return res.status(400).json({ error: 'Can only edit user messages' });
  }

  // Save edit history
  if (!message.editHistory) message.editHistory = [];
  message.editHistory.push({ content: message.content, editedAt: new Date() });

  message.content = content;
  message.editedAt = new Date();

  // Remove all messages after this one (they need to be regenerated)
  conversation.messages = conversation.messages.slice(0, messageIndex + 1);

  await conversation.save();

  logger.info('Message edited', { conversationId: req.params.id, messageIndex, userId: req.user._id, requestId: req.requestId });
  res.json({ success: true, message });
}));

// DELETE /api/conversations/:id
router.delete('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const conversation = await Conversation.findOneAndDelete({ conversationId: req.params.id, userId: req.user._id });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  cache.del(`convList:${req.user._id}`);
  logger.info('Conversation deleted', { conversationId: req.params.id, userId: req.user._id, requestId: req.requestId });
  res.json({ success: true });
}));

export default router;