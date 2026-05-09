import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { Agent, AgentRun } from '../models/Agent.js';
import { authenticateUser, addSSEConnection, removeSSEConnection } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { TOOLS, executeTool } from '../utils/tools.js';
import { ANTHROPIC_BASE_URL } from '../utils/config.js';
import logger from '../utils/logger.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: ANTHROPIC_BASE_URL,
});

const router = express.Router();

// POST /api/agents
router.post('/', authenticateUser, asyncHandler(async (req, res) => {
  const { name, description, systemPrompt, tools, maxIterations } = req.body;
  if (!name || !systemPrompt) return res.status(400).json({ error: 'Name and systemPrompt are required' });

  const agent = await Agent.create({
    name,
    description: description || '',
    systemPrompt,
    tools: tools || [],
    userId: req.user._id,
    maxIterations: maxIterations || 10
  });

  logger.info('Agent created', { agentId: agent._id, userId: req.user._id, requestId: req.requestId });
  res.status(201).json(agent);
}));

// GET /api/agents
router.get('/', authenticateUser, asyncHandler(async (req, res) => {
  const agents = await Agent.find({ $or: [{ userId: req.user._id }, { userId: null }] })
    .select('name description systemPrompt tools maxIterations userId createdAt')
    .sort({ createdAt: -1 });
  res.json(agents);
}));

// GET /api/agents/:id
router.get('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const agent = await Agent.findOne({ _id: req.params.id, $or: [{ userId: req.user._id }, { userId: null }] });
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
}));

// PATCH /api/agents/:id
router.patch('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const { name, description, systemPrompt, tools, maxIterations } = req.body;
  const agent = await Agent.findOne({ _id: req.params.id, userId: req.user._id });
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  if (name !== undefined) agent.name = name;
  if (description !== undefined) agent.description = description;
  if (systemPrompt !== undefined) agent.systemPrompt = systemPrompt;
  if (tools !== undefined) agent.tools = tools;
  if (maxIterations !== undefined) agent.maxIterations = maxIterations;
  await agent.save();

  logger.info('Agent updated', { agentId: agent._id, userId: req.user._id, requestId: req.requestId });
  res.json(agent);
}));

// DELETE /api/agents/:id
router.delete('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const agent = await Agent.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  await AgentRun.deleteMany({ agentId: req.params.id });
  logger.info('Agent deleted', { agentId: req.params.id, userId: req.user._id, requestId: req.requestId });
  res.json({ success: true });
}));

// POST /api/agents/:id/run
router.post('/:id/run', authenticateUser, asyncHandler(async (req, res) => {
  const { task, conversationId } = req.body;
  if (!task) return res.status(400).json({ error: 'Task is required' });

  const agent = await Agent.findOne({ _id: req.params.id, $or: [{ userId: req.user._id }, { userId: null }] });
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const run = await AgentRun.create({
    agentId: agent._id,
    conversationId: conversationId || null,
    userId: req.user._id,
    status: 'running'
  });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  addSSEConnection(res);

  const agentModel = agent.model || 'MiniMax-M2.7';
  const toolList = agent.tools.join(', ');
  const systemPromptFull = `${agent.systemPrompt}\n\nYou have access to these tools: ${toolList}\n\nUse this format for EVERY response:\nThought: [your reasoning about what to do next]\nAction: [tool name or "Final Answer"]\nAction Input: [tool parameters as JSON, or final answer text]`;

  const context = [
    { role: 'user', content: task }
  ];

  let finalAnswer = '';
  let stepCount = 0;

  for (let iteration = 0; iteration < (agent.maxIterations || 10); iteration++) {
    stepCount++;

    try {
      const stream = await client.messages.stream({
        model: agentModel,
        max_tokens: 512,
        system: systemPromptFull,
        messages: context
      });

      let responseText = '';
      let stopReason = 'unknown';

      for await (const chunk of stream) {
        if (chunk.type === "message_delta" && chunk.usage) {
          // update token count
        }
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          responseText += chunk.delta.text;
          res.write(`data: ${JSON.stringify({ type: 'step', iteration: stepCount, partial: chunk.delta.text })}\n\n`);
        }
        if (chunk.type === "message_stop") {
          stopReason = chunk.usage;
        }
      }

      if (!responseText.trim()) break;

      const thoughtMatch = responseText.match(/Thought:\s*([\s\S]*?)(?=\nAction:)/i);
      const actionMatch = responseText.match(/Action:\s*([\s\S]*?)(?=\nAction Input:)/i);
      const actionInputMatch = responseText.match(/Action Input:\s*([\s\S]*?)$/is);

      const thought = thoughtMatch ? thoughtMatch[1].trim() : responseText;
      let action = actionMatch ? actionMatch[1].trim() : '';
      const actionInputRaw = actionInputMatch ? actionInputMatch[1].trim() : '';

      let actionInput = {};
      if (actionInputRaw) {
        try {
          actionInput = JSON.parse(actionInputRaw);
        } catch {
          actionInput = { text: actionInputRaw };
        }
      }

      const step = {
        iteration: stepCount,
        thought,
        action,
        actionInput,
        observation: '',
        createdAt: new Date()
      };

      const actionLower = action.toLowerCase().replace(/["']/g, '').trim();
      if (actionLower === 'final answer' || actionLower === 'finalanswer' || actionLower === '"final answer"') {
        finalAnswer = actionInputRaw || thought;
        step.observation = 'Completed';
        run.steps.push(step);
        run.status = 'completed';
        run.completedAt = new Date();

        res.write(`data: ${JSON.stringify({ type: 'final_answer', answer: finalAnswer, iteration: stepCount })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'done', status: 'completed' })}\n\n`);
        res.end();
        removeSSEConnection(res);
        return;
      }

      const toolName = action.toLowerCase().replace(/\s+/g, '_');
      if (TOOLS.find(t => t.name === toolName)) {
        res.write(`data: ${JSON.stringify({ type: 'tool_call', iteration: stepCount, tool: toolName, input: actionInput })}\n\n`);

        const result = await executeTool(toolName, actionInput);
        step.observation = JSON.stringify(result);

        res.write(`data: ${JSON.stringify({ type: 'tool_result', iteration: stepCount, tool: toolName, result })}\n\n`);

        context.push({ role: 'assistant', content: responseText });
        context.push({
          role: 'user',
          content: `Observation: ${JSON.stringify(result)}`
        });
      } else {
        step.observation = `Unknown action: ${action}`;
        context.push({ role: 'assistant', content: responseText });
        context.push({
          role: 'user',
          content: `Observation: Unknown tool "${action}". Available tools: ${toolList}. Please use one of the available tools or provide a final answer.`
        });
      }

      run.steps.push(step);

    } catch (err) {
      logger.error('Agent run error', { requestId: req.requestId, error: err.message, iteration: stepCount });
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      run.status = 'failed';
      run.completedAt = new Date();
      res.write(`data: ${JSON.stringify({ type: 'done', status: 'failed' })}\n\n`);
      res.end();
      removeSSEConnection(res);
      return;
    }
  }

  run.status = 'completed';
  run.completedAt = new Date();
  finalAnswer = `I reached the maximum number of iterations (${agent.maxIterations}) without a final answer. Here's what I found: ${context.length > 0 ? 'I gathered information through multiple tool calls.' : 'I was unable to complete the task.'}`;

  res.write(`data: ${JSON.stringify({ type: 'final_answer', answer: finalAnswer, iteration: stepCount })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'done', status: 'completed' })}\n\n`);
  res.end();
  removeSSEConnection(res);
}));

export default router;