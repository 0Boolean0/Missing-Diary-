import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notificationController.js';

const router = express.Router();

// All notification routes require authentication
router.use(requireAuth);

// GET /api/notifications — list all notifications for the current user
router.get('/', getNotifications);

// PATCH /api/notifications/read-all — must be before /:id to avoid route conflict
router.patch('/read-all', markAllNotificationsRead);

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', markNotificationRead);

export default router;
