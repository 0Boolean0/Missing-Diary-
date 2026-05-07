import express from 'express';
import { createSighting, listSightings, updateSightingStatus, matchSightings, approveSighting, rejectSighting, getSightingAudit } from '../controllers/sightingController.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { upload } from '../utils/upload.js';

const router = express.Router();

router.post('/', optionalAuth, upload.single('image'), createSighting);   // anonymous allowed

// Fix #4: matchSightings was fully public — now requires admin or police
router.get('/match/:caseId', requireAuth, requireRole('admin', 'police'), matchSightings);

router.get('/', requireAuth, requireRole('admin'), listSightings);
router.patch('/:id/status', requireAuth, requireRole('admin'), updateSightingStatus);

// Verification action endpoints — admin only
router.post('/:id/approve', requireAuth, requireRole('admin'), approveSighting);
router.post('/:id/reject', requireAuth, requireRole('admin'), rejectSighting);

// Audit history for a sighting — admin only
router.get('/:id/audit', requireAuth, requireRole('admin'), getSightingAudit);

export default router;
