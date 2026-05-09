import express from 'express';
import { body } from 'express-validator';
import { Folder } from '../models/Folder.js';
import { Conversation } from '../models/Conversation.js';
import { authenticateUser } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /api/folders
router.get('/', authenticateUser, asyncHandler(async (req, res) => {
  const folders = await Folder.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(folders);
}));

// POST /api/folders
router.post('/',
  body('name').isLength({ min: 1, max: 100 }).trim(),
  authenticateUser,
  asyncHandler(async (req, res) => {
    const folder = await Folder.create({ name: req.body.name, userId: req.user._id });
    logger.info('Folder created', { folderId: folder._id, userId: req.user._id, requestId: req.requestId });
    res.status(201).json(folder);
  })
);

// DELETE /api/folders/:id
router.delete('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const folder = await Folder.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!folder) return res.status(404).json({ error: 'Folder not found' });

  await Conversation.updateMany({ folderId: req.params.id, userId: req.user._id }, { folderId: null });
  logger.info('Folder deleted', { folderId: req.params.id, userId: req.user._id, requestId: req.requestId });
  res.json({ success: true });
}));

export default router;