import mongoose from 'mongoose';

const agentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  systemPrompt: { type: String, required: true },
  tools: { type: [String], default: [] },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  maxIterations: { type: Number, default: 10, min: 1, max: 50 }
}, { timestamps: true });

const agentRunStepSchema = new mongoose.Schema({
  iteration: { type: Number, required: true },
  thought: { type: String },
  action: { type: String },
  actionInput: { type: mongoose.Schema.Types.Mixed },
  observation: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const agentRunSchema = new mongoose.Schema({
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  conversationId: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['running', 'completed', 'failed', 'cancelled'], default: 'running' },
  steps: [agentRunStepSchema],
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  totalTokensUsed: { type: Number, default: 0 }
});

export const Agent = mongoose.model('Agent', agentSchema);
export const AgentRun = mongoose.model('AgentRun', agentRunSchema);