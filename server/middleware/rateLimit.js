import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Rate limit constants
const GUEST_LIMITS = {
  windowMs: 60 * 60 * 1000,  // 1 hour (increased from 1 min)
  max: 200,                  // 200 requests per hour for guests (increased)
  message: {
    error: 'Rate limit exceeded. Please sign up for higher limits.',
    code: 'RATE_LIMIT_GUEST',
    retryAfter: 3600
  }
};

const USER_LIMITS = {
  windowMs: 60 * 60 * 1000,  // 1 hour (increased from 1 min)
  max: 100,                  // 100 requests per hour for registered users (increased)
  message: {
    error: 'Too many requests. Please slow down.',
    code: 'RATE_LIMIT_USER',
    retryAfter: 3600
  }
};

const AUTH_LIMITS = {
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 50,                   // 50 attempts per 15 minutes for auth endpoints (increased from 20)
  message: {
    error: 'Too many authentication attempts. Please try again later.',
    code: 'AUTH_RATE_LIMIT',
    retryAfter: 900
  }
};

// Development mode check
const isDevelopment = process.env.NODE_ENV !== 'production';

const skipForLocalhost = (req) => {
  if (!isDevelopment) return false;
  return (
    req.ip === '127.0.0.1' ||
    req.ip === '::1' ||
    req.ip === '::ffff:127.0.0.1' ||
    req.ip === '::ffff::1'
  );
};

// General limiter for authenticated users
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,  // 500 requests per 15 minutes
  message: { error: 'Too many requests. Please slow down.', code: 'RATE_LIMIT', retryAfter: 900 },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipForLocalhost,
  keyGenerator: (req) => {
    return req.user?._id?.toString() || ipKeyGenerator(req);
  }
});

// Auth endpoints limiter (login, register, etc.)
export const authLimiter = rateLimit({
  windowMs: AUTH_LIMITS.windowMs,
  max: AUTH_LIMITS.max,
  message: AUTH_LIMITS.message,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skip: skipForLocalhost,
  keyGenerator: (req) => {
    const email = req.body?.email || 'unknown';
    return `${email}:${ipKeyGenerator(req)}`;
  }
});

// Message sending limiter
export const messageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 100,  // 100 messages per hour (authenticated)
  message: { error: 'You are sending messages too fast. Please wait a moment.', code: 'MESSAGE_RATE_LIMIT', retryAfter: 3600 },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipForLocalhost,
  keyGenerator: (req) => {
    return req.user?._id?.toString() || ipKeyGenerator(req);
  }
});

// Guest-specific message limiter (less strict)
export const guestMessageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 50,  // 50 messages per hour for guests
  message: { error: 'Guest limit reached. Sign up to continue chatting.', code: 'GUEST_RATE_LIMIT', retryAfter: 3600 },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipForLocalhost,
  keyGenerator: (req) => {
    return req.user?._id?.toString() || ipKeyGenerator(req);
  }
});

// Search limiter
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,  // 30 searches per minute (increased from 20)
  message: { error: 'Too many searches. Please slow down.', code: 'SEARCH_RATE_LIMIT', retryAfter: 60 },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipForLocalhost,
  keyGenerator: (req) => {
    return req.user?._id?.toString() || ipKeyGenerator(req);
  }
});

// Create a dynamic limiter based on user type
export const createDynamicLimiter = () => {
  return rateLimit({
    windowMs: 60 * 1000,
    max: (req) => {
      if (!req.user || req.user.isGuest) {
        return 10;  // 10 per minute for guests (increased from 5)
      }
      return 100;  // 100 per minute for users (increased from 60)
    },
    message: (req) => {
      if (!req.user || req.user.isGuest) {
        return {
          error: 'Guest limit reached. Sign up to continue with higher limits.',
          code: 'GUEST_RATE_LIMIT',
          retryAfter: 60
        };
      }
      return {
        error: 'Too many requests. Please slow down.',
        code: 'RATE_LIMIT',
        retryAfter: 60
      };
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipForLocalhost,
    keyGenerator: (req) => {
      return req.user?._id?.toString() || ipKeyGenerator(req);
    }
  });
};

// Helper to get rate limit info for response headers
export function getRateLimitInfo(limit, remaining, reset) {
  return {
    'X-RateLimit-Limit': limit,
    'X-RateLimit-Remaining': remaining,
    'X-RateLimit-Reset': reset
  };
}

export default {
  generalLimiter,
  authLimiter,
  messageLimiter,
  guestMessageLimiter,
  searchLimiter,
  createDynamicLimiter
};