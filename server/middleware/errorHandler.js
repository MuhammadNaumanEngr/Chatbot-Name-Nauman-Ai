import logger from '../utils/logger.js';

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Custom error class for API errors
export class APIError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class AuthError extends APIError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTH_ERROR');
  }
}

export class RateLimitError extends APIError {
  constructor(retryAfter = 60) {
    super('Rate limit exceeded. Please slow down.', 429, 'RATE_LIMIT');
    this.retryAfter = retryAfter;
  }
}

export class ValidationError extends APIError {
  constructor(message = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends APIError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class AIError extends APIError {
  constructor(message = 'AI service unavailable') {
    super(message, 503, 'AI_ERROR');
  }
}

// Global Error Handler
export function globalErrorHandler(err, req, res, next) {
  // Log the error
  logger.error('Unhandled error', {
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?._id
  });

  // Handle known API errors
  if (err instanceof APIError) {
    const response = { error: err.message, code: err.code };
    if (err instanceof RateLimitError) {
      response.retryAfter = err.retryAfter;
      res.setHeader('Retry-After', err.retryAfter);
    }
    return res.status(err.statusCode).json(response);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: Object.values(err.errors).map(e => e.message)
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format',
      code: 'INVALID_ID'
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      error: `${field} already exists`,
      code: 'DUPLICATE_KEY'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Default server error (don't leak internal details)
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(isDev && { stack: err.stack }),
    requestId: req.requestId
  });
}

// Retry utility with exponential backoff
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors
      if (!isRetryableError(error)) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = Math.min(
          baseDelay * Math.pow(backoffMultiplier, attempt),
          maxDelay
        );
        // Add jitter to prevent thundering herd
        const jitter = delay * 0.1 * Math.random();
        await sleep(delay + jitter);
      }
    }
  }

  throw lastError;
}

function isRetryableError(error) {
  // Retry on network errors and temporary AI failures
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }
  // Retry on 503 Service Unavailable
  if (error.statusCode === 503 || error.status === 503) {
    return true;
  }
  // Retry on rate limit errors
  if (error.statusCode === 429 || error.status === 429) {
    return true;
  }
  return false;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default globalErrorHandler;