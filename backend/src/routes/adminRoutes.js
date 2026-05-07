import express from 'express';
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

export default router;
