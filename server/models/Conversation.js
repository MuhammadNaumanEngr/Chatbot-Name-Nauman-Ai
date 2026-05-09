import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  rating: { type: String, enum: ['up', 'down', null], default: null },
  editedAt: { type: Date, default: null },
  editHistory: [{ content: String, editedAt: { type: Date, default: Date.now } }]
}, { timestamps: true });

const conversationSchema = new mongoose.Schema({
  conversationId: { type: String, unique: true, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  title: { type: String, default: 'New Conversation' },
  model: { type: String, default: 'MiniMax-M2.7' },
  systemPromptId: { type: String, default: null },
  toolsEnabled: { type: Boolean, default: true },
  isPinned: { type: Boolean, default: false },
  messages: [messageSchema]
}, { timestamps: true });

// Text index for full-text search is already handled at database level via MongoDB
// No duplicate index needed here - removed to avoid warning

export const Message = mongoose.model('Message', messageSchema);
export const Conversation = mongoose.model('Conversation', conversationSchema);