const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const verificatorController = require('../controllers/verificator.controller');

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

// Verificator Dashboard UI Endpoints
router.get('/dashboard/summary', verificatorController.getDashboardSummary);
router.get('/dashboard/priority-claims', verificatorController.getPriorityClaims);
router.get('/dashboard/anomaly-distribution', verificatorController.getAnomalyDistribution);
router.get('/dashboard/screening-results', verificatorController.getScreeningResults);

// Verificator Claims Queue & Detail
router.get('/claims', verificatorController.getClaims);
router.get('/claims/:id', verificatorController.getClaimById);

// Anomaly Network Endpoints
router.get('/anomaly-network', verificatorController.getAnomalyNetwork);
router.get('/anomaly-network/claims/:id', verificatorController.getAnomalyNetworkClaim);
router.get('/anomaly-network/claims/:id/relationships', verificatorController.getAnomalyNetworkClaimRelationships);

module.exports = router;
