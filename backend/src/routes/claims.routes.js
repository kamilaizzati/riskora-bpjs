const express = require('express');
const router = express.Router();
const claimController = require('../controllers/claim.controller');
const documentController = require('../controllers/document.controller');
const reviewController = require('../controllers/review.controller');
const verificationController = require('../controllers/verification-result.controller');
const graphController = require('../controllers/graph.controller');

// Collection routes
router.get('/', claimController.getClaims);
router.post('/', claimController.createClaim);

// Item routes
router.get('/:id', claimController.getClaimById);
router.patch('/:id', claimController.updateClaim);
router.delete('/:id', claimController.deleteClaim);

// Sub-resource routes
router.get('/:id/documents', claimController.getClaimDocuments);
router.post('/:id/documents', documentController.createClaimDocument);

router.get('/:id/analysis', claimController.getClaimAnalysis);
router.get('/:id/findings', claimController.getClaimFindings);
router.post('/:id/analyze', claimController.analyzeClaim);

router.get('/:id/reviews', reviewController.getClaimReviews);
router.post('/:id/reviews', reviewController.createClaimReview);

router.get('/:id/verification-results', verificationController.getClaimVerificationResults);
router.get('/:id/relationships', graphController.getClaimRelationships);

module.exports = router;
