const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

/**
 * Example protected endpoint for BPJS Verificator
 * GET /api/verificator/dashboard
 */
router.get('/dashboard', requireAuth, requireRole('VERIFICATOR'), (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      portal: 'Portal Verifikator BPJS',
      role: req.user.role,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
      },
      message: 'Selamat datang di dashboard khusus Verifikator Klaim BPJS Riskora.'
    }
  });
});

module.exports = router;
