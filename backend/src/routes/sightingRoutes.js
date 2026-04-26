import express from 'express';
import { createSighting, listSightings, updateSightingStatus } from '../controllers/sightingController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../utils/upload.js';
const router = express.Router();
router.post('/', requireAuth, upload.single('image'), createSighting);
router.get('/', requireAuth, requireRole('admin','police'), listSightings);
router.patch('/:id/status', requireAuth, requireRole('admin','police'), updateSightingStatus);
export default router;
