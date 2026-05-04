import express from 'express';
import { createCase, getCase, listCases, myCases, updateCaseStatus, deleteCase, getCaseAudit, approveCase, rejectCase, requestInfo } from '../controllers/caseController.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { upload } from '../utils/upload.js';
import { getTimeline, addTimelineEntry } from '../controllers/timelineController.js';
import { recordLocation, getTrail } from '../controllers/locationController.js';

const router = express.Router();

// GET /cases — admin/police see all; others see only their own
router.get('/', optionalAuth, listCases);

// Fix #5: /mine MUST be defined before /:id — otherwise Express matches "mine" as a UUID param
router.get('/mine', requireAuth, myCases);

// GET /cases/:id/audit — admin/police only
router.get('/:id/audit', requireAuth, requireRole('admin', 'police'), getCaseAudit);

// Timeline routes — must be before /:id catch-all
router.get('/:id/timeline', requireAuth, getTimeline);
router.post('/:id/timeline', requireAuth, addTimelineEntry);

// Location trail routes — must be before /:id catch-all
router.post('/:id/location', requireAuth, recordLocation);
router.get('/:id/trail', requireAuth, requireRole('admin', 'police'), getTrail);

// GET /cases/:id — owner, admin, police only
router.get('/:id', optionalAuth, getCase);

// POST /cases — must be logged in
router.post('/', requireAuth, requireRole('guardian', 'local', 'admin', 'police'), upload.array('images', 5), createCase);

// PATCH /cases/:id/status — admin/police only
router.patch('/:id/status', requireAuth, requireRole('admin', 'police'), updateCaseStatus);

// DELETE /cases/:id — admin only
router.delete('/:id', requireAuth, requireRole('admin'), deleteCase);

// Verification action endpoints — admin/police only
router.post('/:id/approve', requireAuth, requireRole('admin', 'police'), approveCase);
router.post('/:id/reject', requireAuth, requireRole('admin', 'police'), rejectCase);
router.post('/:id/request-info', requireAuth, requireRole('admin', 'police'), requestInfo);

export default router;
