import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../config/db.js';

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
}
