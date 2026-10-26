const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

router.get('/', healthController.getHealth);
router.post('/clean-state', healthController.postCleanState);

module.exports = router;
