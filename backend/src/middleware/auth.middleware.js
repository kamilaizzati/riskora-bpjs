const HttpError = require('../utils/http-error');

/**
 * Reusable middleware ensuring user has an active, authenticated backend session.
 * Rejects unauthenticated requests with HTTP 401.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user || !req.session.user.role) {
    return next(HttpError.unauthorized('Sesi tidak valid atau belum login. Silakan login terlebih dahulu.'));
  }

  // Populate req.user strictly from the trusted backend session (never from user input)
  req.user = {
    id: req.session.user.id,
    name: req.session.user.name,
    email: req.session.user.email,
    role: req.session.user.role
  };

  next();
}

/**
 * Reusable middleware factory for Role-Based Access Control (RBAC).
 * Enforces that the authenticated user possesses one of the allowed roles.
 *
 * Rules:
 * - If no session is present, returns HTTP 401.
 * - If user's role in session does not match permitted roles, returns HTTP 403.
 * - Role is exclusively read from req.session.user. Never trusts req.body, req.query, or req.headers.
 *
 * @param {...string} allowedRoles - List of permitted roles (e.g. 'VERIFICATOR', 'CASEMIX_ADMIN')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // 1. Verify authenticated session exists
    if (!req.session || !req.session.user || !req.session.user.role) {
      return next(HttpError.unauthorized('Sesi tidak valid atau belum login. Silakan login terlebih dahulu.'));
    }

    // 2. Read role exclusively from backend session
    const sessionRole = req.session.user.role;

    // 3. Verify user's role against allowed roles
    if (!allowedRoles.includes(sessionRole)) {
      return next(
        HttpError.forbidden(`Akses ditolak: role '${sessionRole}' tidak memiliki izin untuk mengakses resource ini.`)
      );
    }

    // Attach verified user info to request
    req.user = {
      id: req.session.user.id,
      name: req.session.user.name,
      email: req.session.user.email,
      role: sessionRole
    };

    next();
  };
}

module.exports = {
  requireAuth,
  requireRole
};
