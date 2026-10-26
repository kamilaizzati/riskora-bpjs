const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

/**
 * Example protected endpoint for RS Casemix Admin
 * GET /api/casemix/dashboard
 */
router.get('/dashboard', requireAuth, requireRole('CASEMIX_ADMIN'), (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      portal: 'Portal Casemix RSUP Dr. Sardjito',
      role: req.user.role,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
      },
      message: 'Selamat datang di dashboard khusus Admin Casemix RS.'
    }
  });
});

module.exports = router;
