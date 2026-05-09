import express from 'express';
import { body } from 'express-validator';
import NodeCache from 'node-cache';
import { SystemPrompt } from '../models/SystemPrompt.js';
import { Conversation } from '../models/Conversation.js';
import { authenticateUser } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const router = express.Router();

// GET /api/system-prompts
router.get('/', asyncHandler(async (req, res) => {
  const cacheKey = 'systemPrompts';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const prompts = await SystemPrompt.find().select('name content icon isDefault createdAt').sort({ createdAt: 1 });
  res.json(prompts);
  cache.set(cacheKey, prompts, 300);
}));

// POST /api/system-prompts
router.post('/',
  body('name').isLength({ min: 1, max: 100 }),
  body('content').isLength({ min: 1, max: 8000 }),
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { name, content, icon } = req.body;
    const prompt = await SystemPrompt.create({ name, content, icon: icon || '💬' });
    cache.del('systemPrompts');
    logger.info('System prompt created', { promptId: prompt._id, userId: req.user._id, requestId: req.requestId });
    res.status(201).json(prompt);
  })
);

// PATCH /api/system-prompts/:id
router.patch('/:id',
  body('name').optional().isLength({ min: 1, max: 100 }),
  body('content').optional().isLength({ min: 1, max: 8000 }),
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { name, content, icon } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (content !== undefined) update.content = content;
    if (icon !== undefined) update.icon = icon;

    const prompt = await SystemPrompt.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!prompt) return res.status(404).json({ error: 'System prompt not found' });

    cache.del('systemPrompts');
    logger.info('System prompt updated', { promptId: req.params.id, userId: req.user._id, requestId: req.requestId });
    res.json(prompt);
  })
);

// DELETE /api/system-prompts/:id
router.delete('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const prompt = await SystemPrompt.findByIdAndDelete(req.params.id);
  if (!prompt) return res.status(404).json({ error: 'System prompt not found' });

  await Conversation.updateMany({ systemPromptId: req.params.id }, { systemPromptId: null });
  cache.del('systemPrompts');
  logger.info('System prompt deleted', { promptId: req.params.id, userId: req.user._id, requestId: req.requestId });
  res.json({ success: true });
}));

export default router;