import express from 'express';
import { AgentRun } from '../models/Agent.js';
import { authenticateUser } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// GET /api/agent-runs/:runId
router.get('/:runId', authenticateUser, asyncHandler(async (req, res) => {
  const run = await AgentRun.findOne({ _id: req.params.runId, userId: req.user._id });
  if (!run) return res.status(404).json({ error: 'Agent run not found' });
  res.json(run);
}));

// DELETE /api/agent-runs/:runId
router.delete('/:runId', authenticateUser, asyncHandler(async (req, res) => {
  const run = await AgentRun.findOne({ _id: req.params.runId, userId: req.user._id });
  if (!run) return res.status(404).json({ error: 'Agent run not found' });

  if (run.status === 'running') {
    run.status = 'cancelled';
    run.completedAt = new Date();
    await run.save();
  }
  res.json({ success: true, run });
}));

export default router;