import { z } from 'zod';
import { query } from '../config/db.js';

const locationSchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
});

export async function recordLocation(req, res, next) {
  try {
    const data = locationSchema.parse(req.body);

    const insertResult = await query(
      'INSERT INTO location_trail (case_id, lat, lng) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, data.lat, data.lng]
    );

    // Prune records older than 24 hours for this case
    await query(
      "DELETE FROM location_trail WHERE case_id=$1 AND recorded_at < NOW() - INTERVAL '24 hours'",
      [req.params.id]
    );

    res.status(201).json(insertResult.rows[0]);
  } catch (e) { next(e); }
}

export async function getTrail(req, res, next) {
  try {
    const result = await query(
      "SELECT * FROM location_trail WHERE case_id=$1 AND recorded_at > NOW() - INTERVAL '24 hours' ORDER BY recorded_at ASC",
      [req.params.id]
    );
    res.json(result.rows);
  } catch (e) { next(e); }
}
