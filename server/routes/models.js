import express from 'express';
import NodeCache from 'node-cache';
import { TOOLS } from '../utils/tools.js';
import { MODELS } from '../utils/config.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const router = express.Router();

// GET /api/models
router.get('/', (req, res) => {
  const cacheKey = 'models';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  res.json(MODELS);
  cache.set(cacheKey, MODELS, 3600);
});

// GET /api/tools
router.get('/tools', (req, res) => {
  res.json(TOOLS);
});

export default router;