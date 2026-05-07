import express from 'express';
import { createCase, getCase, listCases, updateCaseStatus, deleteCase, getCaseAudit, approveCase, rejectCase, requestInfo } from '../controllers/caseController.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { policeStatusGuard } from '../middleware/policeStatusGuard.js';
import { upload } from '../utils/upload.js';
import { getTimeline, addTimelineEntry } from '../controllers/timelineController.js';
import { recordLocation, getTrail } from '../controllers/locationController.js';

const router = express.Router();

// GET /cases — admin/police see all; anonymous/witnesses see only public-status cases
router.get('/', optionalAuth, listCases);

// GET /cases/:id/audit — admin only
router.get('/:id/audit', requireAuth, requireRole('admin'), getCaseAudit);

// Timeline routes — must be before /:id catch-all
router.get('/:id/timeline', optionalAuth, getTimeline);
router.post('/:id/timeline', requireAuth, requireRole('admin', 'police'), addTimelineEntry);

// Location trail routes — must be before /:id catch-all
router.post('/:id/location', requireAuth, requireRole('admin', 'police'), recordLocation);
router.get('/:id/trail', requireAuth, requireRole('admin', 'police'), getTrail);

// GET /cases/:id — publicly accessible (witnesses need to see case details)
router.get('/:id', optionalAuth, getCase);

// POST /cases — anonymous allowed (anyone can report a missing person)
router.post('/', optionalAuth, upload.array('images', 5), createCase);

// PATCH /cases/:id/status — admin/police only; police restricted to 'found' or 'active'
router.patch('/:id/status', requireAuth, requireRole('admin', 'police'), policeStatusGuard, updateCaseStatus);

// DELETE /cases/:id — admin only
router.delete('/:id', requireAuth, requireRole('admin'), deleteCase);

// Verification action endpoints — admin only
router.post('/:id/approve', requireAuth, requireRole('admin'), approveCase);
router.post('/:id/reject', requireAuth, requireRole('admin'), rejectCase);
router.post('/:id/request-info', requireAuth, requireRole('admin'), requestInfo);

export default router;
