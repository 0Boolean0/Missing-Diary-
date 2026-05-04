import express from 'express';
import { createSighting, listSightings, updateSightingStatus, matchSightings } from '../controllers/sightingController.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { upload } from '../utils/upload.js';

const router = express.Router();

router.post('/', optionalAuth, upload.single('image'), createSighting);   // anonymous allowed

// Fix #4: matchSightings was fully public — now requires admin or police
router.get('/match/:caseId', requireAuth, requireRole('admin', 'police'), matchSightings);

router.get('/', requireAuth, requireRole('admin', 'police'), listSightings);
router.patch('/:id/status', requireAuth, requireRole('admin', 'police'), updateSightingStatus);

export default router;
