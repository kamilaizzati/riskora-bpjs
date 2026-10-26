const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');

// Reviews on findings
router.post('/finding/:id', reviewController.reviewFinding);
router.post('/claim/:id', reviewController.createClaimReview);
router.get('/claim/:id', reviewController.getClaimReviews);

module.exports = router;
