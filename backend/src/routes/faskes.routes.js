const express = require('express');
const router = express.Router();
const faskesController = require('../controllers/faskes.controller');

// Faskes Dashboard Endpoints
router.get('/dashboard', faskesController.getDashboard);
router.get('/dashboard/summary', faskesController.getDashboardSummary);
router.get('/dashboard/action-required-claims', faskesController.getActionRequiredClaims);
router.get('/dashboard/screening-distribution', faskesController.getScreeningDistribution);
router.get('/dashboard/recent-activities', faskesController.getRecentActivities);

// Faskes Claims Endpoints
router.get('/claims', faskesController.getClaims);
router.get('/claims/action-required', faskesController.getActionRequiredClaims);
router.get('/claims/:id', faskesController.getClaimById);
router.get('/claims/:id/documents', faskesController.getClaimDocuments);
router.post('/claims/pre-screening', faskesController.submitPreScreening);
router.post('/claims/:id/correction', faskesController.submitClaimCorrection);
router.post('/claims/:id/rescreen', faskesController.rescreenClaim);
router.post('/claims/:id/rollover', faskesController.rolloverClaim);

// Faskes Submissions & Periods
router.get('/submissions/periods', faskesController.getSubmissionPeriods);
router.get('/submissions/:period', faskesController.getSubmissionOverview);

module.exports = router;
