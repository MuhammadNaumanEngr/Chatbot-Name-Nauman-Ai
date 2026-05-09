import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env'), override: true });

// JWT Config
export const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
export const JWT_EXPIRES_IN = '30d';

// Cookie Config
export const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};

// Avatar Colors
export const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

// Client URL
export const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Available Models
export const MODELS = [
  { id: 'MiniMax-M2.7', name: 'M2.7', description: 'Standard model for all tasks' }
];

// Anthropic Config - use ANTHROPIC_MODEL env var (falls back to MiniMax-M2.7)
export const ANTHROPIC_SMALL_FAST_MODEL = process.env.ANTHROPIC_MODEL || "MiniMax-M2.7";
export const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || "https://api.minimax.io/anthropic";

// Port
export const PORT = process.env.PORT || 5000;