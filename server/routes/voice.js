import express from 'express';
import multer from 'multer';
import { authenticateUser } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import fetch from 'node-fetch';

const memoryStorage = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const upload = memoryStorage;

const VOICE_PROFILES = [
  { id: 'male-qnq', name: 'QnQ Male', language: 'auto', description: 'Male voice, clear and professional' },
  { id: 'female-qnq', name: 'QnQ Female', language: 'auto', description: 'Female voice, warm and engaging' },
  { id: 'male-qnq2', name: 'QnQ Male 2', language: 'auto', description: 'Alternative male voice' },
  { id: 'female-qnq2', name: 'QnQ Female 2', language: 'auto', description: 'Alternative female voice' }
];

const router = express.Router();

// GET /api/voice/voices
router.get('/voices', authenticateUser, asyncHandler(async (req, res) => {
  res.json(VOICE_PROFILES);
}));

// POST /api/voice/transcribe
router.post('/transcribe', authenticateUser, upload.single('audio'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

  const file = req.file;
  const validTypes = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/mpeg'];
  if (!validTypes.includes(file.mimetype) && !file.mimetype.startsWith('audio/')) {
    return res.status(400).json({ error: 'Invalid audio format. Supported: webm, mp4, wav, ogg' });
  }

  try {
    const base64Audio = file.buffer.toString('base64');
    const audioDataUrl = `data:${file.mimetype};base64,${base64Audio}`;

    const minimaxApiKey = process.env.ANTHROPIC_API_KEY || process.env.MINIMAX_API_KEY;
    if (minimaxApiKey) {
      try {
        const formData = new FormData();
        const blob = new Blob([file.buffer], { type: file.mimetype });
        formData.append('file', blob, `audio.${file.mimetype.split('/')[1]}`);
        formData.append('model', 'speech-2');

        const response = await fetch('https://api.minimax.io/v1/audio/transcription', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${minimaxApiKey}` },
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          return res.json({
            transcript: data.text || data.transcript || '',
            durationSeconds: data.duration || 0,
            language: data.language || 'unknown'
          });
        }
      } catch (err) {
        logger.debug('MiniMax transcription not available', { error: err.message });
      }
    }

    const whisperUrl = process.env.WHISPER_URL || 'http://localhost:5001/v1/audio/transcriptions';
    try {
      const formData = new FormData();
      const blob = new Blob([file.buffer], { type: file.mimetype });
      formData.append('file', blob, `audio.${file.mimetype.split('/')[1]}`);
      formData.append('model', 'whisper-1');

      const response = await fetch(whisperUrl, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        return res.json({
          transcript: data.text || '',
          durationSeconds: data.duration || 0,
          language: data.language || 'unknown'
        });
      }
    } catch (err) {
      logger.debug('Whisper endpoint not available', { error: err.message });
    }

    res.json({ transcript: '', error: 'Transcription not supported', fallback: true });
  } catch (err) {
    logger.error('Transcription error', { requestId: req.requestId, error: err.message });
    res.status(500).json({ error: 'Transcription failed', transcript: '' });
  }
}));

// POST /api/voice/synthesize
router.post('/synthesize', authenticateUser, asyncHandler(async (req, res) => {
  const { text, voice, speed } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  const minimaxApiKey = process.env.ANTHROPIC_API_KEY || process.env.MINIMAX_API_KEY;
  const minimaxTtsKey = process.env.MINIMAX_TTS_API_KEY || minimaxApiKey;

  if (!minimaxTtsKey) {
    return res.json({ error: 'TTS not supported', fallback: true });
  }

  try {
    const response = await fetch('https://api.minimax.io/v1/t2a_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${minimaxTtsKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'speech-02',
        text: text.slice(0, 500),
        voice_setting: {
          voice_id: voice || 'male-qnq',
          speed: speed || 1.0,
          vol: 1.0,
          pitch: 0,
          emotion: 'neutral'
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: 'mp3'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`MiniMax TTS API error: ${response.status}`);
    }

    const buffer = await response.buffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'inline');
    res.send(buffer);
  } catch (err) {
    logger.error('TTS error', { requestId: req.requestId, error: err.message });
    res.json({ error: 'TTS not supported', fallback: true });
  }
}));

export default router;