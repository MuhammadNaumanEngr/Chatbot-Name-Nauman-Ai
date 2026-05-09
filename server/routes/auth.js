import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { JWT_SECRET, JWT_EXPIRES_IN, cookieOpts } from '../utils/config.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map(e => ({ field: e.path, message: e.msg }));
    return res.status(400).json({ errors: formatted });
  }
  next();
};

// POST /api/auth/register
router.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/[A-Z]/),
  body('displayName').isLength({ min: 2, max: 50 }).trim(),
  validate,
  asyncHandler(async (req, res) => {
    const { email, password, displayName } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, displayName });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.cookie('token', token, cookieOpts);

    logger.info('User registered', { userId: user._id, requestId: req.requestId });
    res.status(201).json({ user: { _id: user._id, email: user.email, displayName: user.displayName, avatarColor: user.avatarColor, isGuest: user.isGuest } });
  })
);

// POST /api/auth/login
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    user.lastSeenAt = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.cookie('token', token, cookieOpts);

    logger.info('User logged in', { userId: user._id, requestId: req.requestId });
    res.json({ user: { _id: user._id, email: user.email, displayName: user.displayName, avatarColor: user.avatarColor, isGuest: user.isGuest } });
  })
);

// POST /api/auth/guest
router.post('/guest', asyncHandler(async (req, res) => {
  const guestNumber = Math.floor(Math.random() * 9000) + 1000;
  const user = await User.create({
    email: `guest_${Date.now()}@guest.local`,
    displayName: `Guest #${guestNumber}`,
    isGuest: true
  });

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.cookie('token', token, cookieOpts);

  logger.info('Guest user created', { userId: user._id, requestId: req.requestId });
  res.status(201).json({ user: { _id: user._id, email: user.email, displayName: user.displayName, avatarColor: user.avatarColor, isGuest: true } });
}));

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', cookieOpts);
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', asyncHandler(async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}));

export default router;