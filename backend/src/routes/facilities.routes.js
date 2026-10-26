const express = require('express');
const router = express.Router();
const facilityController = require('../controllers/facility.controller');

router.get('/', facilityController.getFacilities);
router.get('/:id', facilityController.getFacilityById);
router.get('/:id/claims', facilityController.getFacilityClaims);
router.get('/:id/summary', facilityController.getFacilitySummary);

module.exports = router;
