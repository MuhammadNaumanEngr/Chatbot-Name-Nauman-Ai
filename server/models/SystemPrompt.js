import mongoose from 'mongoose';

const systemPromptSchema = new mongoose.Schema({
  name: { type: String, required: true },
  content: { type: String, required: true },
  icon: { type: String, default: '💬' },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const SystemPrompt = mongoose.model('SystemPrompt', systemPromptSchema);