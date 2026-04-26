import { z } from 'zod';
import { query } from '../config/db.js';
import { uploadBufferToCloudinary } from '../utils/cloudinaryUpload.js';

const caseSchema = z.object({
  name: z.string().min(2),
  age: z.coerce.number().int().optional(),
  gender: z.string().optional(),
  height: z.string().optional(),
  clothing: z.string().optional(),
  medical_info: z.string().optional(),
  description: z.string().optional(),
  last_seen_location: z.string().min(2),
  last_seen_lat: z.coerce.number(),
  last_seen_lng: z.coerce.number(),
  last_seen_time: z.string().optional()
});

export async function listCases(req, res, next) {
  try {
    const status = req.query.status;
    let sql = `SELECT mp.*, COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') AS images
      FROM missing_persons mp LEFT JOIN person_images pi ON pi.missing_person_id = mp.id`;
    const params = [];
    if (status) { params.push(status); sql += ` WHERE mp.status=$${params.length}`; }
    sql += ' GROUP BY mp.id ORDER BY mp.created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (e) { next(e); }
}

export async function myCases(req, res, next) {
  try {
    const result = await query(`SELECT mp.*, COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') AS images
      FROM missing_persons mp LEFT JOIN person_images pi ON pi.missing_person_id=mp.id
      WHERE mp.guardian_id=$1 GROUP BY mp.id ORDER BY mp.created_at DESC`, [req.user.id]);
    res.json(result.rows);
  } catch (e) { next(e); }
}

export async function getCase(req, res, next) {
  try {
    const result = await query(`SELECT mp.*, u.name AS guardian_name,
      COALESCE(json_agg(DISTINCT pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') AS images
      FROM missing_persons mp
      LEFT JOIN users u ON u.id=mp.guardian_id
      LEFT JOIN person_images pi ON pi.missing_person_id=mp.id
      WHERE mp.id=$1 GROUP BY mp.id,u.name`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Case not found' });
    const sightings = await query('SELECT * FROM sightings WHERE missing_person_id=$1 ORDER BY created_at DESC', [req.params.id]);
    res.json({ ...result.rows[0], sightings: sightings.rows });
  } catch (e) { next(e); }
}

export async function createCase(req, res, next) {
  try {
    const data = caseSchema.parse(req.body);
    const status = req.user.role === 'admin' || req.user.role === 'police' ? 'verified' : 'pending';
    const result = await query(`INSERT INTO missing_persons
      (guardian_id,name,age,gender,height,clothing,medical_info,description,last_seen_location,last_seen_lat,last_seen_lng,last_seen_time,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [req.user.id, data.name, data.age || null, data.gender || null, data.height || null, data.clothing || null, data.medical_info || null, data.description || null, data.last_seen_location, data.last_seen_lat, data.last_seen_lng, data.last_seen_time || null, status]
    );
    const created = result.rows[0];
    const files = req.files || [];
    for (const f of files) {
      const uploaded = await uploadBufferToCloudinary(f.buffer, 'safe-return/missing-persons');
      await query('INSERT INTO person_images (missing_person_id,image_url,public_id) VALUES ($1,$2,$3)', [created.id, uploaded.secure_url, uploaded.public_id]);
    }
    res.status(201).json(created);
  } catch (e) { next(e); }
}

export async function updateCaseStatus(req, res, next) {
  try {
    const schema = z.object({ status: z.enum(['pending','verified','active','found','closed','rejected']) });
    const { status } = schema.parse(req.body);
    const result = await query('UPDATE missing_persons SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *', [status, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Case not found' });
    await query('INSERT INTO audit_logs (user_id,action,target_type,target_id) VALUES ($1,$2,$3,$4)', [req.user.id, `Updated case status to ${status}`, 'missing_person', req.params.id]);
    res.json(result.rows[0]);
  } catch (e) { next(e); }
}
