import sanitizeHtml from 'sanitize-html';
import logger from '../utils/logger.js';

// Sanitization options
const sanitizeOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'strong', 'em', 'b', 'i', 'u', 's', 'code', 'pre',
    'blockquote', 'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span'
  ],
  allowedAttributes: {
    'a': ['href', 'title', 'target'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'code': ['class'],
    'pre': ['class'],
    'div': ['class'],
    'span': ['class'],
    'th': ['align'],
    'td': ['align']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    'a': (tagName, attribs) => {
      // Open links in new tab and add noopener
      return {
        tagName,
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      };
    }
  }
};

// Sanitize HTML content
export function sanitizeInput(html) {
  return sanitizeHtml(html, sanitizeOptions);
}

// Sanitize object (recursive)
export function sanitizeObject(obj, fields = ['content', 'title', 'name', 'description']) {
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, fields));
  }

  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (fields.includes(key) && typeof value === 'string') {
        sanitized[key] = sanitizeInput(value);
      } else {
        sanitized[key] = sanitizeObject(value, fields);
      }
    }
    return sanitized;
  }

  return obj;
}

// Middleware to sanitize request body
export function sanitizeRequest(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    // Only sanitize string fields that are likely user content
    const fieldsToSanitize = ['content', 'title', 'name', 'description', 'template', 'systemPrompt'];
    for (const field of fieldsToSanitize) {
      if (req.body[field] && typeof req.body[field] === 'string') {
        req.body[field] = sanitizeInput(req.body[field]);
      }
    }
  }
  next();
}

// Middleware to validate and sanitize user input for AI messages
export function validateMessageInput(req, res, next) {
  const { content } = req.body;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Message content is required' });
  }

  // Trim and check length
  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  if (trimmed.length > 32000) {
    return res.status(400).json({
      error: 'Message too long',
      code: 'MESSAGE_TOO_LONG',
      maxLength: 32000,
      actualLength: trimmed.length
    });
  }

  // Check for potential injection patterns
  const dangerousPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      logger.warn('Potential injection detected', {
        requestId: req.requestId,
        pattern: pattern.source
      });
      // Sanitize but log the warning
      req.body.content = sanitizeInput(trimmed);
      return next();
    }
  }

  req.body.content = trimmed;
  next();
}

export default {
  sanitizeInput,
  sanitizeObject,
  sanitizeRequest,
  validateMessageInput
};