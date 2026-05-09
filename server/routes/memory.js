import express from 'express';
import { body } from 'express-validator';
import NodeCache from 'node-cache';
import { Memory } from '../models/Memory.js';
import { authenticateUser } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const router = express.Router();

// GET /api/memory
router.get('/', authenticateUser, asyncHandler(async (req, res) => {
  const cacheKey = `memory:${req.user._id}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  const memories = await Memory.find({ userId: req.user._id, isActive: true }).sort({ createdAt: -1 });
  res.json(memories);
  cache.set(cacheKey, memories, 120);
}));

// POST /api/memory
router.post('/',
  body('content').isLength({ min: 1, max: 2000 }).trim(),
  authenticateUser,
  asyncHandler(async (req, res) => {
    const memory = await Memory.create({
      userId: req.user._id,
      content: req.body.content,
      source: req.body.source || 'manual'
    });
    cache.del(`memory:${req.user._id}`);
    logger.info('Memory created', { memoryId: memory._id, userId: req.user._id, requestId: req.requestId });
    res.status(201).json(memory);
  })
);

// PATCH /api/memory/:id
router.patch('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const memory = await Memory.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isActive: req.body.isActive },
    { new: true }
  );
  if (!memory) return res.status(404).json({ error: 'Memory not found' });
  cache.del(`memory:${req.user._id}`);
  logger.info('Memory updated', { memoryId: req.params.id, userId: req.user._id, requestId: req.requestId });
  res.json(memory);
}));

// DELETE /api/memory/:id
router.delete('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const memory = await Memory.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!memory) return res.status(404).json({ error: 'Memory not found' });
  cache.del(`memory:${req.user._id}`);
  logger.info('Memory deleted', { memoryId: req.params.id, userId: req.user._id, requestId: req.requestId });
  res.json({ success: true });
}));

export default router;