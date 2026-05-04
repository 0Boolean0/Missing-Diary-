import { z } from 'zod';
import { query } from '../config/db.js';

const timelineSchema = z.object({
  entry_time:    z.string().min(1),
  location_text: z.string().min(1),
  lat:           z.coerce.number().optional(),
  lng:           z.coerce.number().optional(),
  notes:         z.string().optional(),
});

export async function getTimeline(req, res, next) {
  try {
    const result = await query(
      'SELECT * FROM case_timeline WHERE case_id=$1 ORDER BY entry_time ASC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (e) { next(e); }
}

export async function addTimelineEntry(req, res, next) {
  try {
    const data = timelineSchema.parse(req.body);

    // Check that requester is case owner OR admin/police
    const caseResult = await query(
      'SELECT guardian_id FROM missing_persons WHERE id=$1',
      [req.params.id]
    );
    if (!caseResult.rows[0]) {
      return res.status(404).json({ message: 'Case not found' });
    }
    const { guardian_id } = caseResult.rows[0];
    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'police' &&
      guardian_id !== req.user.id
    ) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const insertResult = await query(
      'INSERT INTO case_timeline (case_id, entry_time, location_text, lat, lng, notes, created_by) ' +
      'VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [
        req.params.id,
        data.entry_time,
        data.location_text,
        data.lat ?? null,
        data.lng ?? null,
        data.notes ?? null,
        req.user.id,
      ]
    );
    const entry = insertResult.rows[0];

    await query(
      'INSERT INTO audit_logs (user_id, action, target_type, target_id, notes) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'Added timeline entry', 'case_timeline', entry.id, null]
    );

    res.status(201).json(entry);
  } catch (e) { next(e); }
}
