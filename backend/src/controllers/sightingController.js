import { z } from 'zod';
import { query } from '../config/db.js';
import { uploadBufferToCloudinary } from '../utils/cloudinaryUpload.js';

const sightingSchema = z.object({
  missing_person_id: z.string().uuid(),
  location_text: z.string().optional(),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  description: z.string().min(3),
  confidence_level: z.enum(['sure','maybe','not_sure']).default('maybe')
});

export async function createSighting(req, res, next) {
  try {
    const data = sightingSchema.parse(req.body);
    let imageUrl = null;
    if (req.file) {
      const uploaded = await uploadBufferToCloudinary(req.file.buffer, 'safe-return/sightings');
      imageUrl = uploaded.secure_url;
    }
    const result = await query(`INSERT INTO sightings
      (missing_person_id,reported_by,location_text,lat,lng,description,image_url,confidence_level,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING *`,
      [data.missing_person_id, req.user?.id || null, data.location_text || null, data.lat, data.lng, data.description, imageUrl, data.confidence_level]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { next(e); }
}

export async function listSightings(req, res, next) {
  try {
    const result = await query(`SELECT s.*, mp.name AS person_name FROM sightings s
      JOIN missing_persons mp ON mp.id=s.missing_person_id ORDER BY s.created_at DESC`, []);
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
