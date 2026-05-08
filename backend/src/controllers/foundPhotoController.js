import { query } from '../config/db.js';
import { uploadBufferToCloudinary } from '../utils/cloudinaryUpload.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/cases/:id/found-photo
 * Police/admin upload a found-person photo. Simultaneously marks the case as "found"
 * and creates a notification for the guardian.
 */
export async function uploadFoundPhoto(req, res, next) {
  try {
    const { id } = req.params;

    // Req 1.3 — file required
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided. Please attach a photo.' });
    }

    // Req 1.6 — MIME type validation (multer fileFilter already blocks most, but enforce here too)
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: 'Invalid file type. Only JPEG, PNG, and WebP images are accepted',
      });
    }

    // Req 1.7 — size validation
    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ message: 'File too large. Maximum size is 5 MB' });
    }

    // Req 1.4 — case must exist
    const caseResult = await query('SELECT * FROM missing_persons WHERE id=$1', [id]);
    if (!caseResult.rows[0]) {
      return res.status(404).json({ message: 'Case not found' });
    }
    const missingCase = caseResult.rows[0];

    // Upload to Cloudinary under the found-persons folder
    const uploaded = await uploadBufferToCloudinary(req.file.buffer, 'missing-diary/found-persons');

    // Insert into found_person_photos
    const photoResult = await query(
      'INSERT INTO found_person_photos (missing_person_id, uploaded_by, image_url, public_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [id, req.user.id, uploaded.secure_url, uploaded.public_id]
    );
    const photo = photoResult.rows[0];

    // Req 1.2 — update case status to "found" if not already
    if (missingCase.status !== 'found') {
      await query(
        'UPDATE missing_persons SET status=$1, updated_at=NOW() WHERE id=$2',
        ['found', id]
      );
    }

    // Req 1.8 — audit log
    await query(
      'INSERT INTO audit_logs (user_id, action, target_type, target_id) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'Uploaded found-person photo', 'missing_person', id]
    );

    // Req 2.1 — notify guardian (skip silently if no guardian_id)
    if (missingCase.guardian_id) {
      await query(
        `INSERT INTO notifications (user_id, case_id, type, message)
         VALUES ($1, $2, 'found_person_photo', $3)`,
        [
          missingCase.guardian_id,
          id,
          `A found-person photo has been uploaded for case: ${missingCase.name}`,
        ]
      );
    }

    res.status(201).json(photo);
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/cases/:id/found-photos
 * Retrieve all found-person photos for a case.
 * Public access only when case status is "found"; otherwise requires auth.
 */
export async function getFoundPhotos(req, res, next) {
  try {
    const { id } = req.params;

    // Req 5.2 — case must exist
    const caseResult = await query('SELECT id, status FROM missing_persons WHERE id=$1', [id]);
    if (!caseResult.rows[0]) {
      return res.status(404).json({ message: 'Case not found' });
    }

    // Req 5.4 — unauthenticated access only allowed when status is "found"
    if (caseResult.rows[0].status !== 'found' && !req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Req 5.1 — return photos ordered by created_at ASC
    const result = await query(
      'SELECT id, image_url, public_id, created_at FROM found_person_photos WHERE missing_person_id=$1 ORDER BY created_at ASC',
      [id]
    );

    res.json(result.rows);
  } catch (e) {
    next(e);
  }
}
