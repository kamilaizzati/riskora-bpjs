const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

router.get('/summary', dashboardController.getSummary);
router.get('/risk-distribution', dashboardController.getRiskDistribution);
router.get('/finding-distribution', dashboardController.getFindingDistribution);
router.get('/recent-activity', dashboardController.getRecentActivity);

module.exports = router;
