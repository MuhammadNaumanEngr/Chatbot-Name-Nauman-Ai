import express from 'express';
import { Conversation } from '../models/Conversation.js';
import { authenticateUser } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /api/conversations/:id/export?format=markdown|plain
router.get('/:id/export', authenticateUser, asyncHandler(async (req, res) => {
  const { format = 'markdown' } = req.query;
  const conversationId = req.params.id;

  const conversation = await Conversation.findOne({ conversationId, userId: req.user._id });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  let content;
  let filename;
  let contentType;

  const safeTitle = conversation.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);

  if (format === 'plain') {
    content = formatAsPlainText(conversation);
    filename = `${safeTitle}.txt`;
    contentType = 'text/plain';
  } else if (format === 'pdf') {
    // For PDF, we generate HTML that can be printed to PDF
    content = formatAsHTML(conversation);
    filename = `${safeTitle}.html`;
    contentType = 'text/html';
  } else {
    // Default: markdown
    content = formatAsMarkdown(conversation);
    filename = `${safeTitle}.md`;
    contentType = 'text/markdown';
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(content);
}));

function formatAsMarkdown(conversation) {
  let md = `# ${conversation.title}\n\n`;
  md += `**Date:** ${new Date(conversation.createdAt).toLocaleDateString()}\n`;
  md += `**Model:** ${conversation.model}\n\n`;
  md += `---\n\n`;

  for (const msg of conversation.messages) {
    const role = msg.role === 'user' ? '**You**' : '**Assistant**';
    const time = new Date(msg.createdAt).toLocaleTimeString();
    md += `### ${role} · ${time}\n\n`;
    md += `${msg.content}\n\n`;
  }

  md += `---\n\n*Exported from AI Chat on ${new Date().toLocaleString()}*`;
  return md;
}

function formatAsPlainText(conversation) {
  let txt = `${conversation.title}\n`;
  txt += `${'='.repeat(conversation.title.length)}\n\n`;
  txt += `Date: ${new Date(conversation.createdAt).toLocaleDateString()}\n`;
  txt += `Model: ${conversation.model}\n\n`;
  txt += `${'-'.repeat(50)}\n\n`;

  for (const msg of conversation.messages) {
    const role = msg.role === 'user' ? 'YOU' : 'ASSISTANT';
    const time = new Date(msg.createdAt).toLocaleTimeString();
    txt += `[${role}] ${time}\n`;
    txt += `${msg.content}\n\n`;
  }

  txt += `${'-'.repeat(50)}\n`;
  txt += `Exported from AI Chat on ${new Date().toLocaleString()}`;
  return txt;
}

function formatAsHTML(conversation) {
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(conversation.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #333; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
    .meta { color: #666; font-size: 14px; margin-bottom: 30px; }
    .message { margin-bottom: 25px; padding: 15px; border-radius: 10px; }
    .user { background: #f0f9ff; border-left: 4px solid #3b82f6; }
    .assistant { background: #f9fafb; border-left: 4px solid #6366f1; }
    .role { font-weight: bold; margin-bottom: 5px; color: #666; font-size: 12px; text-transform: uppercase; }
    .content { white-space: pre-wrap; line-height: 1.6; }
    .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
    pre { background: #1f2937; color: #e5e7eb; padding: 15px; border-radius: 8px; overflow-x: auto; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: 'Fira Code', monospace; }
    pre code { background: transparent; padding: 0; }
  </style>
</head>
<body>
  <h1>${escapeHtml(conversation.title)}</h1>
  <div class="meta">
    <p>Date: ${new Date(conversation.createdAt).toLocaleString()}</p>
    <p>Model: ${escapeHtml(conversation.model)}</p>
  </div>
`;

  for (const msg of conversation.messages) {
    const roleClass = msg.role === 'user' ? 'user' : 'assistant';
    const roleLabel = msg.role === 'user' ? 'You' : 'Assistant';
    const time = new Date(msg.createdAt).toLocaleTimeString();
    html += `  <div class="message ${roleClass}">
    <div class="role">${roleLabel} · ${time}</div>
    <div class="content">${escapeHtml(msg.content)}</div>
  </div>\n`;
  }

  html += `  <div class="footer">
    <p>Exported from AI Chat on ${new Date().toLocaleString()}</p>
    <p><em>Print this page as PDF to save</em></p>
  </div>
</body>
</html>`;

  return html;
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

export default router;