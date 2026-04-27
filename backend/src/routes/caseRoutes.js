import express from 'express';
import { createCase, getCase, listCases, myCases, updateCaseStatus } from '../controllers/caseController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadCaseFiles } from '../utils/upload.js';

const router = express.Router();

router.get('/', listCases);
router.get('/mine', requireAuth, requireRole('guardian', 'admin', 'police'), myCases);
router.get('/:id', getCase);
router.post('/', requireAuth, requireRole('guardian', 'admin', 'police'), uploadCaseFiles, createCase);
router.patch('/:id/status', requireAuth, requireRole('admin', 'police'), updateCaseStatus);

export default router;
