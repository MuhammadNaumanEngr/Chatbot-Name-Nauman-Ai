import mongoose from 'mongoose';

const toolLogSchema = new mongoose.Schema({
  conversationId: { type: String, required: true },
  toolName: { type: String, required: true },
  toolInput: { type: mongoose.Schema.Types.Mixed },
  toolOutput: { type: mongoose.Schema.Types.Mixed },
  durationMs: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

export const ToolLog = mongoose.model('ToolLog', toolLogSchema);