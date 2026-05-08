import { query } from '../config/db.js';

/**
 * GET /api/notifications
 * Returns all notifications for the authenticated user, ordered by created_at DESC.
 */
export async function getNotifications(req, res, next) {
  try {
    const result = await query(
      `SELECT n.*, mp.name AS case_name
       FROM notifications n
       LEFT JOIN missing_persons mp ON mp.id = n.case_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
export async function markNotificationRead(req, res, next) {
  try {
    const result = await query(
      'UPDATE notifications SET read=TRUE WHERE id=$1 AND user_id=$2 RETURNING *',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Notification not found' });
    res.json(result.rows[0]);
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications for the authenticated user as read.
 */
export async function markAllNotificationsRead(req, res, next) {
  try {
    await query(
      'UPDATE notifications SET read=TRUE WHERE user_id=$1 AND read=FALSE',
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (e) {
    next(e);
  }
}
