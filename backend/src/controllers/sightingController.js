import { z } from 'zod';
import { query } from '../config/db.js';
import { uploadBufferToCloudinary } from '../utils/cloudinaryUpload.js';

const sightingSchema = z.object({
  missing_person_id: z.string().uuid(),
  location_text: z.string().optional(),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  description: z.string().min(3),
  confidence_level: z.enum(['sure','maybe','not_sure']).default('maybe'),
  reporter_name: z.string().optional(),
  reporter_phone: z.string().optional(),
});

export async function createSighting(req, res, next) {
  try {
    const data = sightingSchema.parse(req.body);
    let imageUrl = null;
    if (req.file) {
      const uploaded = await uploadBufferToCloudinary(req.file.buffer, 'missing-diary/sightings');
      imageUrl = uploaded.secure_url;
    }
    // req.user may be null for anonymous submissions
    const result = await query(`INSERT INTO sightings
      (missing_person_id,reported_by,location_text,lat,lng,description,image_url,confidence_level,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING *`,
      [data.missing_person_id, req.user?.id || null, data.location_text || null, data.lat, data.lng, data.description, imageUrl, data.confidence_level]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { next(e); }
}

// Fix #6: use LEFT JOIN so sightings for deleted cases are not silently dropped
export async function listSightings(req, res, next) {
  try {
    const result = await query(`SELECT s.*, mp.name AS person_name FROM sightings s
      LEFT JOIN missing_persons mp ON mp.id = s.missing_person_id
      ORDER BY s.created_at DESC`);
    res.json(result.rows);
  } catch (e) { next(e); }
}

export async function updateSightingStatus(req, res, next) {
  try {
    const schema = z.object({ status: z.enum(['pending','verified','rejected']) });
    const { status } = schema.parse(req.body);
    const result = await query('UPDATE sightings SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Sighting not found' });
    await query('INSERT INTO audit_logs (user_id,action,target_type,target_id) VALUES ($1,$2,$3,$4)', [req.user.id, `Updated sighting status to ${status}`, 'sighting', req.params.id]);
    res.json(result.rows[0]);
  } catch (e) { next(e); }
}

// AI Matching — keyword-based similarity between sighting descriptions and case details
export async function matchSightings(req, res, next) {
  try {
    const { caseId } = req.params;
    const caseResult = await query(
      'SELECT name, description, clothing, gender, age, last_seen_location FROM missing_persons WHERE id=$1',
      [caseId]
    );
    if (!caseResult.rows[0]) return res.status(404).json({ message: 'Case not found' });
    const c = caseResult.rows[0];

    const caseKeywords = [c.name, c.description, c.clothing, c.gender, c.last_seen_location]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3);

    const sightingsResult = await query(
      `SELECT s.*, u.name AS reporter_name FROM sightings s
       LEFT JOIN users u ON u.id = s.reported_by
       WHERE s.missing_person_id = $1 ORDER BY s.created_at DESC`,
      [caseId]
    );

    const scored = sightingsResult.rows.map(s => {
      const sightingWords = (s.description || '').toLowerCase().split(/\s+/);
      const matches = sightingWords.filter(w => caseKeywords.includes(w));
      const score = caseKeywords.length > 0
        ? Math.round((matches.length / caseKeywords.length) * 100)
        : 0;
      return { ...s, ai_match_score: score, ai_matched_keywords: matches };
    });

    scored.sort((a, b) => b.ai_match_score - a.ai_match_score);

    res.json({ case: c, matches: scored });
  } catch (e) { next(e); }
}

export async function approveSighting(req, res, next) {
  try {
    const result = await query(
      'UPDATE sightings SET status=$1 WHERE id=$2 RETURNING *',
      ['verified', req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Sighting not found' });
    const notes = req.body?.notes || null;
    await query(
      'INSERT INTO audit_logs (user_id,action,target_type,target_id,notes) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'Approved sighting', 'sighting', req.params.id, notes]
    );
    res.json(result.rows[0]);
  } catch (e) { next(e); }
}

export async function rejectSighting(req, res, next) {
  try {
    const result = await query(
      'UPDATE sightings SET status=$1 WHERE id=$2 RETURNING *',
      ['rejected', req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Sighting not found' });
    const notes = req.body?.notes || null;
    await query(
      'INSERT INTO audit_logs (user_id,action,target_type,target_id,notes) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'Rejected sighting', 'sighting', req.params.id, notes]
    );
    res.json(result.rows[0]);
  } catch (e) { next(e); }
}

export async function getSightingAudit(req, res, next) {
  try {
    const result = await query(
      'SELECT al.*, u.name AS actor_name ' +
      'FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id ' +
      'WHERE al.target_id=$1 AND al.target_type=\'sighting\' ' +
      'ORDER BY al.created_at DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (e) { next(e); }
}
