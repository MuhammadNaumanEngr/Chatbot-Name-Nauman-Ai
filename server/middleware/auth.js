import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../utils/config.js';
import { User } from '../models/User.js';
import logger from '../utils/logger.js';

// SSE Connection Tracking
const activeSSEConnections = new Set();

export function addSSEConnection(res) {
  activeSSEConnections.add(res);
}

export function removeSSEConnection(res) {
  activeSSEConnections.delete(res);
}

export function getActiveSSEConnections() {
  return activeSSEConnections;
}

// SSE heartbeat interval
setInterval(() => {
  for (const res of activeSSEConnections) {
    try {
      res.write(`: heartbeat\n\n`);
    } catch (e) {
      activeSSEConnections.delete(res);
    }
  }
}, 30000);

export async function authenticateUser(req, res, next) {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    user.lastSeenAt = new Date();
    await user.save();
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}