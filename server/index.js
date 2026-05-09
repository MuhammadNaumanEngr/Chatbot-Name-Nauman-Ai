import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env'), override: true });

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';

import logger from './utils/logger.js';
import { CLIENT_URL, PORT } from './utils/config.js';
import { globalErrorHandler } from './middleware/errorHandler.js';
import { generalLimiter, authLimiter } from './middleware/rateLimit.js';
import { authenticateUser, getActiveSSEConnections, addSSEConnection, removeSSEConnection } from './middleware/auth.js';
import { Conversation, Message } from './models/Conversation.js';
import { Memory } from './models/Memory.js';
import { ToolLog } from './models/ToolLog.js';
import { Agent } from './models/Agent.js';
import { SystemPrompt } from './models/SystemPrompt.js';
import { PromptTemplate } from './models/PromptTemplate.js';

// Import routes
import authRoutes from './routes/auth.js';
import conversationRoutes from './routes/conversations.js';
import templateRoutes from './routes/templates.js';
import systemPromptRoutes from './routes/systemPrompts.js';
import agentRoutes from './routes/agents.js';
import agentRunRoutes from './routes/agentRuns.js';
import folderRoutes from './routes/folders.js';
import memoryRoutes from './routes/memory.js';
import modelRoutes from './routes/models.js';
import voiceRoutes from './routes/voice.js';
import exportRoutes from './routes/export.js';

const app = express();

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://api.minimax.io", "https://anthropic.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Request size limit for body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request ID Middleware
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

// Request Logging Middleware
app.use((req, res, next) => {
  if (req.path === '/api/health') return next();
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, { requestId: req.requestId });
  });
  next();
});

// Compression
app.use(compression());

// CORS
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Rate Limiters
app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp')
  .then(() => {
    logger.info('MongoDB connected');
    createIndexes();
  })
  .catch(err => logger.error('MongoDB error', { error: err.message }));

async function createIndexes() {
  try {
    await Conversation.schema.index({ userId: 1, updatedAt: -1 });
    await Conversation.schema.index({ userId: 1, folderId: 1 });
    await Message.schema.index({ conversationId: 1, createdAt: 1 });
    await Memory.schema.index({ userId: 1, isActive: 1 });
    await Conversation.schema.index({ title: 'text', 'messages.content': 'text' });
    await ToolLog.schema.index({ conversationId: 1, createdAt: -1 });
    logger.info('Database indexes created');
  } catch (err) {
    logger.error('Failed to create indexes', { error: err.message });
  }
}

// ─── Seed Data ────────────────────────────────────────────────────────────────
const DEFAULT_AGENTS = [
  {
    name: 'Research Assistant',
    description: 'Finds and synthesizes information from the web',
    systemPrompt: 'You are a research assistant. Your goal is to find accurate, up-to-date information on any topic. Use web search to find relevant sources, then summarize your findings clearly.',
    tools: ['web_search', 'summarize_url']
  },
  {
    name: 'Math Tutor',
    description: 'Solves math problems step by step',
    systemPrompt: 'You are a patient math tutor. Break down problems into clear steps, explain each step thoroughly, and verify your calculations. Show all work.',
    tools: ['calculate', 'get_current_datetime']
  },
  {
    name: 'News Summarizer',
    description: 'Finds and summarizes recent news on any topic',
    systemPrompt: 'You are a news summarizer. Search for recent news on the given topic, find the most relevant and recent articles, and provide a concise summary of key developments.',
    tools: ['web_search', 'summarize_url']
  }
];

async function seedAgents() {
  for (const agentData of DEFAULT_AGENTS) {
    const existing = await Agent.findOne({ name: agentData.name, userId: null });
    if (!existing) {
      await Agent.create({ ...agentData, userId: undefined });
      logger.info(`Seeded agent: ${agentData.name}`);
    }
  }
}

const DEFAULT_PROMPTS = [
  { name: 'Default', content: 'You are Nauman AI, a helpful and intelligent personal AI assistant. You are knowledgeable, friendly, and always try to give accurate and helpful responses. You have access to real-time tools including web search and crypto prices.', icon: '🤖', isDefault: true },
  { name: 'Coder', content: 'You are Nauman AI, an expert programming assistant. Write clean, well-documented code and explain your reasoning.', icon: '💻', isDefault: false },
  { name: 'Creative Writer', content: 'You are Nauman AI, a creative writing assistant. Help with storytelling, brainstorming, and creative content generation.', icon: '✍️', isDefault: false },
  { name: 'Technical Analyst', content: 'You are Nauman AI, a technical analyst. Provide thorough, detailed analysis of technical topics, architectures, and systems.', icon: '🔍', isDefault: false }
];

async function seedSystemPrompts() {
  for (const prompt of DEFAULT_PROMPTS) {
    const existing = await SystemPrompt.findOne({ name: prompt.name });
    if (!existing) {
      await SystemPrompt.create(prompt);
      logger.info(`Seeded system prompt: ${prompt.name}`);
    }
  }
}

const DEFAULT_TEMPLATES = [
  {
    name: 'Professional Email',
    description: 'Write a professional email to a colleague or client',
    template: 'Write a {{tone}} email to {{recipient}} about {{topic}}. Include a clear call to action: {{callToAction}}',
    variables: [
      { name: 'tone', description: 'Tone of the email', defaultValue: 'professional', type: 'select', options: ['professional', 'friendly', 'urgent', 'formal'] },
      { name: 'recipient', description: 'Who is this email for?', defaultValue: '', type: 'text' },
      { name: 'topic', description: 'Main topic of the email', defaultValue: '', type: 'text' },
      { name: 'callToAction', description: 'What action do you want the recipient to take?', defaultValue: '', type: 'text' }
    ],
    category: 'Writing',
    isPublic: true,
    userId: null
  },
  {
    name: 'Bug Report',
    description: 'Document a software bug for the development team',
    template: 'Bug Report\n\nDescription: {{bugDescription}}\n\nSteps to Reproduce:\n{{stepsToReproduce}}\n\nExpected Behavior:\n{{expectedBehavior}}\n\nEnvironment:\n{{environment}}',
    variables: [
      { name: 'bugDescription', description: 'Describe the bug', defaultValue: '', type: 'text' },
      { name: 'stepsToReproduce', description: 'Steps to reproduce the bug', defaultValue: '', type: 'text' },
      { name: 'expectedBehavior', description: 'What should happen instead?', defaultValue: '', type: 'text' },
      { name: 'environment', description: 'OS, browser, software version, etc.', defaultValue: '', type: 'text' }
    ],
    category: 'Coding',
    isPublic: true,
    userId: null
  },
  {
    name: 'Meeting Summary',
    description: 'Summarize a meeting with key decisions and action items',
    template: 'Meeting Summary: {{meetingTitle}}\n\nAttendees: {{attendees}}\n\nKey Decisions:\n{{keyDecisions}}\n\nAction Items:\n{{actionItems}}',
    variables: [
      { name: 'meetingTitle', description: 'Name/title of the meeting', defaultValue: '', type: 'text' },
      { name: 'attendees', description: 'Who attended the meeting?', defaultValue: '', type: 'text' },
      { name: 'keyDecisions', description: 'What decisions were made?', defaultValue: '', type: 'text' },
      { name: 'actionItems', description: 'What action items were assigned?', defaultValue: '', type: 'text' }
    ],
    category: 'Writing',
    isPublic: true,
    userId: null
  },
  {
    name: 'Code Review Request',
    description: 'Request a code review from your team',
    template: 'Code Review Request\n\nLanguage/Framework: {{language}}\n\nCode:\n```\n{{codeSnippet}}\n```\n\nSpecific Concerns:\n{{specificConcerns}}',
    variables: [
      { name: 'language', description: 'Programming language', defaultValue: '', type: 'text' },
      { name: 'codeSnippet', description: 'The code to review', defaultValue: '', type: 'text' },
      { name: 'specificConcerns', description: 'Any specific areas to focus on?', defaultValue: '', type: 'text' }
    ],
    category: 'Coding',
    isPublic: true,
    userId: null
  },
  {
    name: 'Data Analysis Request',
    description: 'Request a data analysis task',
    template: 'Data Analysis Request\n\nDataset: {{dataset}}\n\nGoal: {{analysisGoal}}\n\nOutput Format: {{outputFormat}}',
    variables: [
      { name: 'dataset', description: 'Describe the dataset', defaultValue: '', type: 'text' },
      { name: 'analysisGoal', description: 'What insight are you looking for?', defaultValue: '', type: 'text' },
      { name: 'outputFormat', description: 'How should results be presented?', defaultValue: '', type: 'select', options: ['table', 'chart', 'text summary', 'csv export'] }
    ],
    category: 'Research',
    isPublic: true,
    userId: null
  },
  {
    name: 'SMART Goal Setting',
    description: 'Create a SMART (Specific, Measurable, Achievable, Relevant, Time-bound) goal',
    template: 'SMART Goal:\n\nGoal: {{goal}}\n\nTimeframe: {{timeframe}}\n\nSuccess Metrics: {{successMetrics}}',
    variables: [
      { name: 'goal', description: 'What do you want to achieve?', defaultValue: '', type: 'text' },
      { name: 'timeframe', description: 'By when should this be achieved?', defaultValue: '', type: 'text' },
      { name: 'successMetrics', description: 'How will you measure success?', defaultValue: '', type: 'text' }
    ],
    category: 'Writing',
    isPublic: true,
    userId: null
  }
];

async function seedPromptTemplates() {
  for (const tpl of DEFAULT_TEMPLATES) {
    const existing = await PromptTemplate.findOne({ name: tpl.name, userId: null });
    if (!existing) {
      await PromptTemplate.create(tpl);
      logger.info(`Seeded prompt template: ${tpl.name}`);
    }
  }
}

// ─── Mount Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/system-prompts', systemPromptRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/agent-runs', agentRunRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/export', exportRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memoryUsage: process.memoryUsage().heapUsed,
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(globalErrorHandler);

// ─── SSE Heartbeat (managed in auth middleware) ───────────────────────────────
// Already handled in middleware/auth.js via setInterval

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
let isShuttingDown = false;

async function gracefulShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info('Shutting down gracefully...');

  const sseWait = new Promise(resolve => setTimeout(resolve, 10000));
  const sseDone = new Promise(resolve => {
    const checkInterval = setInterval(() => {
      if (getActiveSSEConnections().size === 0) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });

  await Promise.race([sseWait, sseDone.then(() => logger.info('All SSE connections closed'))]);

  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (err) {
    logger.error('Error closing MongoDB', { error: err.message });
  }

  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ─── Start Server ─────────────────────────────────────────────────────────────
seedSystemPrompts().then(() => {
  return seedAgents();
}).then(() => {
  return seedPromptTemplates();
}).then(() => {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
});