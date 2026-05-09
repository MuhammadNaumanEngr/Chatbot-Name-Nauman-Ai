import mongoose from 'mongoose';

const promptTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  template: { type: String, required: true },
  variables: [{
    name: { type: String, required: true },
    description: { type: String, default: '' },
    defaultValue: { type: String, default: '' },
    type: { type: String, enum: ['text', 'select'], default: 'text' },
    options: { type: [String], default: [] }
  }],
  category: { type: String, default: 'General' },
  isPublic: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  usageCount: { type: Number, default: 0 }
}, { timestamps: true });

export const PromptTemplate = mongoose.model('PromptTemplate', promptTemplateSchema);