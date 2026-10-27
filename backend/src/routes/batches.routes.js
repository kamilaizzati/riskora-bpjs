const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batch.controller');

// Collection routes
router.get('/', batchController.getBatches);
router.post('/', batchController.uploadBatch);
router.post('/upload', batchController.uploadBatch);
router.post('/demo', batchController.createDemoBatch);
router.get('/resubmissions', batchController.getReadyResubmissions);
router.post('/resubmissions', batchController.includeResubmissions);

// Single batch routes
router.get('/:id', batchController.getBatchById);
router.get('/:id/preview', batchController.getBatchPreview);
router.post('/:id/screening', batchController.runBatchScreening);
router.post('/:id/finalize', batchController.finalizeBatch);
router.post('/:id/handoff', batchController.markBatchForwarded);

// Batch claims correction routes
router.patch('/:id/claims/:claimId', batchController.updateClaimCorrection);
router.post('/:id/claims/:claimId/rescreen', batchController.rescreenClaim);
router.post('/:id/claims/:claimId/rollover', batchController.rolloverClaim);
router.patch('/claims/:claimId', batchController.updateClaimCorrection);
router.post('/claims/:claimId/rescreen', batchController.rescreenClaim);
router.post('/claims/:claimId/rollover', batchController.rolloverClaim);

module.exports = router;
