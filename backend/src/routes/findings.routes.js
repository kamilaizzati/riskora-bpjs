const express = require('express');
const router = express.Router();
const findingController = require('../controllers/finding.controller');
const reviewController = require('../controllers/review.controller');

router.get('/', findingController.getFindings);
router.get('/:id', findingController.getFindingById);
router.patch('/:id', findingController.updateFinding);
router.post('/:id/review', reviewController.reviewFinding);

module.exports = router;
