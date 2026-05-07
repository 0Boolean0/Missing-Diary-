import express from 'express';
<<<<<<< HEAD
import { createPolice, scanFaces, stats, users } from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../utils/upload.js';
const router = express.Router();
router.use(requireAuth, requireRole('admin'));
router.get('/stats', stats);
router.get('/users', users);
router.post('/police', createPolice);
router.post('/scan-face', upload.single('image'), scanFaces);
=======
import { createPolice, stats, users, notifyCase, getNotifications } from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Admin-only routes
router.use(requireAuth);
router.get('/stats', requireRole('admin'), stats);
router.get('/users', requireRole('admin'), users);
router.post('/police', requireRole('admin'), createPolice);

// 4.5.1 — POST /api/admin/notify/:caseId
router.post('/notify/:caseId', requireRole('admin', 'police'), notifyCase);

// 4.6.2 / Note in spec — GET /api/notifications for logged-in user
router.get('/notifications', getNotifications);

>>>>>>> d090232e24ad7bf8a46350024742f09d0479363e
export default router;
