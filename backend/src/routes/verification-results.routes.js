const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verification-result.controller');

router.get('/', verificationController.getVerificationResults);
router.get('/claim/:id', verificationController.getClaimVerificationResults);

module.exports = router;
