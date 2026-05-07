/**
 * Middleware: policeStatusGuard
 *
 * Enforces that police officers may only set case status to 'found' or 'active'.
 * Admin role passes through unchanged.
 *
 * Validates: Requirements 2.3
 */
export function policeStatusGuard(req, res, next) {
  // Admin passes through without restriction
  if (req.user.role !== 'police') {
    return next();
  }

  // Police may only submit 'found' or 'active'
  const { status } = req.body;
  if (status === 'found' || status === 'active') {
    return next();
  }

  return res.status(403).json({ message: 'Police may only set status to found or active' });
}
