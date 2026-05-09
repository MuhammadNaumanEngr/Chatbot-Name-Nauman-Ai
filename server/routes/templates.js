import express from 'express';
import { body } from 'express-validator';
import { PromptTemplate } from '../models/PromptTemplate.js';
import { authenticateUser } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /api/templates
router.get('/', authenticateUser, asyncHandler(async (req, res) => {
  const templates = await PromptTemplate.find({
    $or: [{ userId: req.user._id }, { isPublic: true }]
  }).select('name description template variables category isPublic usageCount userId createdAt')
    .sort({ usageCount: -1 });
  res.json(templates);
}));

// GET /api/templates/:id
router.get('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const template = await PromptTemplate.findOne({
    _id: req.params.id,
    $or: [{ userId: req.user._id }, { isPublic: true }]
  });
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
}));

// POST /api/templates
router.post('/',
  body('name').isLength({ min: 1, max: 100 }),
  body('template').isLength({ min: 1 }),
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { name, description, template, variables, category, isPublic } = req.body;
    if (!name || !template) return res.status(400).json({ error: 'Name and template are required' });

    let vars = variables || [];
    if (vars.length === 0) {
      const matches = template.match(/\{\{(\w+)\}\}/g) || [];
      const seen = new Set();
      for (const m of matches) {
        const varName = m.replace(/\{\{|\}\}/g, '');
        if (!seen.has(varName)) {
          seen.add(varName);
          vars.push({ name: varName, description: '', defaultValue: '', type: 'text', options: [] });
        }
      }
    }

    const tpl = await PromptTemplate.create({
      name,
      description: description || '',
      template,
      variables: vars,
      category: category || 'General',
      isPublic: isPublic || false,
      userId: req.user._id,
      usageCount: 0
    });

    logger.info('Prompt template created', { templateId: tpl._id, userId: req.user._id, requestId: req.requestId });
    res.status(201).json(tpl);
  })
);

// PATCH /api/templates/:id
router.patch('/:id',
  body('name').optional().isLength({ min: 1, max: 100 }),
  body('content').optional().isLength({ min: 1 }),
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { name, description, template, variables, category, isPublic } = req.body;
    const tpl = await PromptTemplate.findOne({ _id: req.params.id, userId: req.user._id });
    if (!tpl) return res.status(404).json({ error: 'Template not found' });

    if (name !== undefined) tpl.name = name;
    if (description !== undefined) tpl.description = description;
    if (template !== undefined) tpl.template = template;
    if (variables !== undefined) tpl.variables = variables;
    if (category !== undefined) tpl.category = category;
    if (isPublic !== undefined) tpl.isPublic = isPublic;
    await tpl.save();

    logger.info('Prompt template updated', { templateId: tpl._id, userId: req.user._id, requestId: req.requestId });
    res.json(tpl);
  })
);

// DELETE /api/templates/:id
router.delete('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const tpl = await PromptTemplate.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!tpl) return res.status(404).json({ error: 'Template not found' });
  logger.info('Prompt template deleted', { templateId: req.params.id, userId: req.user._id, requestId: req.requestId });
  res.json({ success: true });
}));

// POST /api/templates/:id/use
router.post('/:id/use', authenticateUser, asyncHandler(async (req, res) => {
  const { variables } = req.body;
  const tpl = await PromptTemplate.findOne({
    _id: req.params.id,
    $or: [{ userId: req.user._id }, { isPublic: true }]
  });
  if (!tpl) return res.status(404).json({ error: 'Template not found' });

  tpl.usageCount = (tpl.usageCount || 0) + 1;
  await tpl.save();

  let filledTemplate = tpl.template;
  const varMap = variables || {};
  for (const v of tpl.variables) {
    const value = varMap[v.name] || v.defaultValue || '';
    filledTemplate = filledTemplate.replace(new RegExp(`\\{\\{${v.name}\\}\\}`, 'g'), value);
  }

  res.json({ filledTemplate });
}));

export default router;