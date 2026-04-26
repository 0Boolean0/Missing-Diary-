import express from 'express';
import { createPolice, stats, users } from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
const router = express.Router();
router.use(requireAuth, requireRole('admin'));
router.get('/stats', stats);
router.get('/users', users);
router.post('/police', createPolice);
export default router;
