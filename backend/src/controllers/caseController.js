import { z } from 'zod';
import { query } from '../config/db.js';
import { uploadBufferToCloudinary } from '../utils/cloudinaryUpload.js';

const caseSchema = z.object({
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  guardian_email: z.string().optional(),
  guardian_relation: z.string().optional(),
  guardian_nid: z.string().optional(),
  name: z.string().min(2),
  name_bn: z.string().optional(),
  age: z.coerce.number().int().optional(),
  gender: z.string().optional(),
  skin_color: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  clothing: z.string().optional(),
  identifying_marks: z.string().optional(),
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
    const user = req.user;

    // Non-admin/police: only see their own submitted cases
    if (user && user.role !== 'admin' && user.role !== 'police') {
      const result = await query(
        'SELECT mp.*, COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), \'[]\') AS images ' +
        'FROM missing_persons mp LEFT JOIN person_images pi ON pi.missing_person_id = mp.id ' +
        'WHERE mp.guardian_id=$1 ' +
        'GROUP BY mp.id ORDER BY mp.created_at DESC',
        [user.id]
      );
      return res.json(result.rows);
    }

    // admin/police: see all cases, optionally filtered by status
    let sql =
      'SELECT mp.*, COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), \'[]\') AS images ' +
      'FROM missing_persons mp LEFT JOIN person_images pi ON pi.missing_person_id = mp.id';
    const params = [];
    if (status) {
      params.push(status);
      sql += ' WHERE mp.status=$1';
    }
    sql += ' GROUP BY mp.id ORDER BY mp.created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (e) { next(e); }
}

export async function myCases(req, res, next) {
  try {
    const result = await query(
      'SELECT mp.*, COALESCE(json_agg(pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), \'[]\') AS images ' +
      'FROM missing_persons mp LEFT JOIN person_images pi ON pi.missing_person_id=mp.id ' +
      'WHERE mp.guardian_id=$1 GROUP BY mp.id ORDER BY mp.created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (e) { next(e); }
}

export async function getCase(req, res, next) {
  try {
    const result = await query(
      'SELECT mp.*, u.name AS guardian_name, ' +
      'COALESCE(json_agg(DISTINCT pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), \'[]\') AS images ' +
      'FROM missing_persons mp ' +
      'LEFT JOIN users u ON u.id=mp.guardian_id ' +
      'LEFT JOIN person_images pi ON pi.missing_person_id=mp.id ' +
      'WHERE mp.id=$1 GROUP BY mp.id,u.name',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Case not found' });

    // Only allow owner, admin, or police to view case details
    const user = req.user;
    const c = result.rows[0];
    if (user && user.role !== 'admin' && user.role !== 'police' && c.guardian_id !== user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const sightings = await query('SELECT * FROM sightings WHERE missing_person_id=$1 ORDER BY created_at DESC', [req.params.id]);
    res.json({ ...c, sightings: sightings.rows });
  } catch (e) { next(e); }
}

export async function createCase(req, res, next) {
  try {
    console.log('Creating case with files:', req.files);
    const data = caseSchema.parse(req.body);
    const status = req.user.role === 'admin' || req.user.role === 'police' ? 'verified' : 'pending';
    const result = await query(
      'INSERT INTO missing_persons ' +
      '(guardian_id,guardian_name,guardian_phone,guardian_email,guardian_relation,guardian_nid,' +
      'name,name_bn,age,gender,skin_color,height,weight,clothing,identifying_marks,medical_info,description,' +
      'last_seen_location,last_seen_lat,last_seen_lng,last_seen_time,status) ' +
      'VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING *',
      [req.user.id, data.guardian_name || null, data.guardian_phone || null, data.guardian_email || null,
       data.guardian_relation || null, data.guardian_nid || null,
       data.name, data.name_bn || null, data.age || null, data.gender || null, data.skin_color || null,
       data.height || null, data.weight || null, data.clothing || null, data.identifying_marks || null,
       data.medical_info || null, data.description || null,
       data.last_seen_location, data.last_seen_lat, data.last_seen_lng,
       data.last_seen_time || null, status]
    );
    const created = result.rows[0];
    console.log('Case created:', created.id);
    
    // Handle multiple images
    const imageFiles = req.files?.images || [];
    console.log('Processing images:', imageFiles.length);
    for (const f of imageFiles) {
      console.log('Uploading image:', f.originalname, f.size, 'bytes');
      const uploaded = await uploadBufferToCloudinary(f.buffer, 'missing-diary/missing-persons', 'image');
      console.log('Image uploaded:', uploaded.secure_url);
      await query('INSERT INTO person_images (missing_person_id,image_url,public_id) VALUES ($1,$2,$3)',
        [created.id, uploaded.secure_url, uploaded.public_id]);
    }
    
    // Handle video if present
    const videoFile = req.files?.video?.[0];
    if (videoFile) {
      console.log('Uploading video:', videoFile.originalname, videoFile.size, 'bytes');
      const uploaded = await uploadBufferToCloudinary(videoFile.buffer, 'missing-diary/videos', 'video');
      console.log('Video uploaded:', uploaded.secure_url);
      await query('INSERT INTO person_images (missing_person_id,image_url,public_id) VALUES ($1,$2,$3)',
        [created.id, uploaded.secure_url, uploaded.public_id]);
    }
    
    console.log('Case creation completed successfully');
    res.status(201).json(created);
  } catch (e) { 
    console.error('Error creating case:', e);
    next(e); 
  }
}

export async function deleteCase(req, res, next) {
  try {
    const result = await query('DELETE FROM missing_persons WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Case not found' });
    await query('INSERT INTO audit_logs (user_id,action,target_type,target_id) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'Deleted case', 'missing_person', req.params.id]);
    res.json({ message: 'Case deleted' });
  } catch (e) { next(e); }
}

export async function updateCaseStatus(req, res, next) {
  try {
    const schema = z.object({ status: z.enum(['pending','verified','active','found','closed','rejected']) });
    const { status } = schema.parse(req.body);
    const result = await query('UPDATE missing_persons SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *', [status, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Case not found' });
    await query('INSERT INTO audit_logs (user_id,action,target_type,target_id) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'Updated case status to ' + status, 'missing_person', req.params.id]);
    res.json(result.rows[0]);
  } catch (e) { next(e); }
}
