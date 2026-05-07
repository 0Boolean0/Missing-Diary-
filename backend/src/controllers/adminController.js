import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../config/db.js';
import { compareFacesWithInsightFace, isInsightFaceConfigured } from '../utils/insightFace.js';

export async function stats(req, res, next) {
  try {
    const users = await query('SELECT COUNT(*)::int total FROM users');
    const cases = await query('SELECT status, COUNT(*)::int count FROM missing_persons GROUP BY status');
    const sightings = await query('SELECT status, COUNT(*)::int count FROM sightings GROUP BY status');
    res.json({ totalUsers: users.rows[0].total, cases: cases.rows, sightings: sightings.rows });
  } catch (e) { next(e); }
}

export async function users(req, res, next) {
  try {
    const result = await query('SELECT id,name,email,phone,role,verified,created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e) { next(e); }
}

export async function createPolice(req, res, next) {
  try {
    const schema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(6), phone: z.string().optional() });
    const data = schema.parse(req.body);
    const hash = await bcrypt.hash(data.password, 10);
    const result = await query('INSERT INTO users (name,email,phone,password_hash,role,verified) VALUES ($1,$2,$3,$4,\'police\',true) RETURNING id,name,email,role,verified', [data.name, data.email, data.phone || null, hash]);
    res.status(201).json(result.rows[0]);
  } catch (e) { next(e); }
}

<<<<<<< HEAD
export async function scanFaces(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'A photo is required for scanning' });
    }

    if (!isInsightFaceConfigured()) {
      return res.status(503).json({
        message: 'InsightFace scan is not configured. Set INSIGHTFACE_API_URL and INSIGHTFACE_TOKEN.',
      });
    }

    const result = await query(
      'SELECT mp.id, mp.name, mp.status, mp.age, mp.gender, mp.last_seen_location, ' +
      'COALESCE(json_agg(DISTINCT pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), \'[]\') AS images ' +
      'FROM missing_persons mp ' +
      'LEFT JOIN person_images pi ON pi.missing_person_id = mp.id ' +
      'GROUP BY mp.id ORDER BY mp.created_at DESC'
    );

    const queryImage = req.file.buffer;
    const queryMimeType = req.file.mimetype;
    const matches = [];

    for (const candidate of result.rows) {
      const images = Array.isArray(candidate.images) ? candidate.images.slice(0, 3) : [];
      let bestMatch = null;

      for (const imageUrl of images) {
        try {
          const response = await fetch(imageUrl);
          if (!response.ok) continue;

          const referenceBuffer = Buffer.from(await response.arrayBuffer());
          const referenceMimeType = response.headers.get('content-type') || 'image/jpeg';
          const faceMatch = await compareFacesWithInsightFace({
            queryBuffer: queryImage,
            queryMimeType,
            referenceBuffer,
            referenceMimeType,
          });

          if (faceMatch && (!bestMatch || faceMatch.score > bestMatch.score)) {
            bestMatch = {
              score: faceMatch.score,
              imageUrl,
            };
          }
        } catch {
          // Skip broken reference images and keep scanning other candidates.
        }
      }

      if (bestMatch) {
        matches.push({
          case_id: candidate.id,
          name: candidate.name,
          status: candidate.status,
          age: candidate.age,
          gender: candidate.gender,
          last_seen_location: candidate.last_seen_location,
          image_url: bestMatch.imageUrl,
          score: bestMatch.score,
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    res.json({ matches: matches.slice(0, 10) });
  } catch (e) {
    next(e);
  }
=======
// 4.5.2 — POST /api/admin/notify/:caseId — insert notification row
export async function notifyCase(req, res, next) {
  try {
    const { caseId } = req.params;
    const schema = z.object({ message: z.string().min(1).optional() });
    const { message } = schema.parse(req.body);

    // Get the case to find the guardian
    const caseResult = await query('SELECT id, guardian_id, name FROM missing_persons WHERE id=$1', [caseId]);
    if (!caseResult.rows[0]) return res.status(404).json({ message: 'Case not found' });
    const c = caseResult.rows[0];

    const notifMessage = message || `Admin has requested additional information for case: ${c.name}`;

    // Insert notification for the guardian
    const notif = await query(
      'INSERT INTO notifications (user_id, case_id, message, type) VALUES ($1,$2,$3,$4) RETURNING *',
      [c.guardian_id, caseId, notifMessage, 'request_info']
    );

    // 4.5.3 — log in audit_logs
    await query(
      'INSERT INTO audit_logs (user_id,action,target_type,target_id) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'Requested info for case', 'missing_person', caseId]
    );

    res.status(201).json(notif.rows[0]);
  } catch (e) { next(e); }
}

// 4.6.2 — GET /api/notifications — return notifications for logged-in user
export async function getNotifications(req, res, next) {
  try {
    const result = await query(
      'SELECT n.*, mp.name AS case_name FROM notifications n ' +
      'LEFT JOIN missing_persons mp ON mp.id = n.case_id ' +
      'WHERE n.user_id=$1 ORDER BY n.created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (e) { next(e); }
>>>>>>> d090232e24ad7bf8a46350024742f09d0479363e
}
