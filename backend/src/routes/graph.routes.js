const express = require('express');
const router = express.Router();
const graphController = require('../controllers/graph.controller');

router.get('/', graphController.getGraph);
router.get('/claims/:id', graphController.getClaimRelationships);

module.exports = router;
