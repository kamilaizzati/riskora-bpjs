const { findDemoUser } = require('../config/demo-users');
const HttpError = require('../utils/http-error');

/**
 * Handles user login against local demo accounts.
 * POST /api/auth/login
 */
function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return next(HttpError.unauthorized('Email dan password wajib diisi.'));
    }

    const user = findDemoUser(email, password);
    if (!user) {
      return next(HttpError.unauthorized('Email atau password tidak valid.'));
    }

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        return next(HttpError.internal('Gagal membuat sesi login baru.'));
      }

      // Store authenticated user in session
      req.session.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      };

      // Save session explicitly before returning response
      req.session.save((saveErr) => {
        if (saveErr) {
          return next(HttpError.internal('Gagal menyimpan data sesi login.'));
        }

        return res.status(200).json({
          success: true,
          data: {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name
          },
          message: 'Login berhasil'
        });
      });
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Returns current authenticated user information from session.
 * GET /api/auth/me
 */
function getMe(req, res, next) {
  try {
    if (!req.session || !req.session.user) {
      return next(HttpError.unauthorized('Session tidak valid atau belum login.'));
    }

    return res.status(200).json({
      success: true,
      data: {
        id: req.session.user.id,
        email: req.session.user.email,
        role: req.session.user.role,
        name: req.session.user.name
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Destroys current session and clears the session cookie.
 * POST /api/auth/logout
 */
function logout(req, res, next) {
  try {
    if (!req.session) {
      return res.status(200).json({
        success: true,
        message: 'Logout berhasil'
      });
    }

    req.session.destroy((err) => {
      if (err) {
        return next(HttpError.internal('Gagal mengakhiri sesi.'));
      }

      res.clearCookie('riskora.sid');
      return res.status(200).json({
        success: true,
        message: 'Logout berhasil'
      });
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  getMe,
  logout
};
