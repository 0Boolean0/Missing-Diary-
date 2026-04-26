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
