const FacilityService = require('../services/facility.service');

function getFacilityService(req) {
  return new FacilityService(req.app.get('dataDir'));
}

function getFacilities(req, res, next) {
  try {
    const service = getFacilityService(req);
    const facilities = service.getFacilities();
    return res.status(200).json({ success: true, data: facilities });
  } catch (err) {
    next(err);
  }
}

function getFacilityById(req, res, next) {
  try {
    const service = getFacilityService(req);
    const facility = service.getFacilityById(req.params.id);
    return res.status(200).json({ success: true, data: facility });
  } catch (err) {
    next(err);
  }
}

function getFacilityClaims(req, res, next) {
  try {
    const service = getFacilityService(req);
    const claims = service.getFacilityClaims(req.params.id);
    return res.status(200).json({ success: true, data: claims });
  } catch (err) {
    next(err);
  }
}

function getFacilitySummary(req, res, next) {
  try {
    const service = getFacilityService(req);
    const summary = service.getFacilitySummary(req.params.id);
    return res.status(200).json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getFacilities,
  getFacilityById,
  getFacilityClaims,
  getFacilitySummary
};
