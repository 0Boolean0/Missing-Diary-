/**
 * Middleware: policeStatusGuard
 *
 * Enforces that police officers may only set case status to 'active' via PATCH /status.
 * Police cannot directly set 'found' — that must go through the found-photo upload endpoint.
 * Admin role passes through unchanged.
 */
export function policeStatusGuard(req, res, next) {
  // Admin passes through without restriction
  if (req.user.role !== 'police') {
    return next();
  }

  // Police may only set 'active' via this endpoint
  // 'found' must be set through POST /cases/:id/found-photo (photo upload)
  const { status } = req.body;
  if (status === 'active') {
    return next();
  }

  return res.status(403).json({ message: 'Police may only set status to active via this endpoint. To mark as found, upload a found-person photo.' });
}
