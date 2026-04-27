import express from 'express';
import { createCase, getCase, listCases, myCases, updateCaseStatus, deleteCase } from '../controllers/caseController.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { upload } from '../utils/upload.js';

const router = express.Router();

// GET /cases — admin/police see all; others see only their own
router.get('/', optionalAuth, listCases);

// GET /cases/mine — only own cases
router.get('/mine', requireAuth, myCases);

// GET /cases/:id — owner, admin, police only
router.get('/:id', optionalAuth, getCase);

// POST /cases — must be logged in
router.post('/', requireAuth, requireRole('guardian', 'local', 'admin', 'police'), upload.array('images', 5), createCase);

// PATCH /cases/:id/status — admin/police only
router.patch('/:id/status', requireAuth, requireRole('admin', 'police'), updateCaseStatus);

// DELETE /cases/:id — admin only
router.delete('/:id', requireAuth, requireRole('admin'), deleteCase);

export default router;
