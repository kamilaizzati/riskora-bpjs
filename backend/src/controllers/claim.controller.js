const ClaimService = require('../services/claim.service');
const { validateQueryParams } = require('../validators/query.validator');
const { validateCreateClaim, validateUpdateClaim } = require('../validators/claim.validator');

function getClaimService(req) {
  return new ClaimService(req.app.get('dataDir'));
}

function getClaims(req, res, next) {
  try {
    const validatedParams = validateQueryParams(req.query, {
      allowedSortFields: ['createdAt', 'serviceDate', 'claimAmount', 'riskScore']
    });
    const service = getClaimService(req);
    const result = service.getClaims(validatedParams);
    return res.status(200).json({
      success: true,
      data: result.claims,
      meta: result.meta
    });
  } catch (err) {
    next(err);
  }
}

function getClaimById(req, res, next) {
  try {
    const service = getClaimService(req);
    const claim = service.getClaimById(req.params.id);
    return res.status(200).json({
      success: true,
      data: claim
    });
  } catch (err) {
    next(err);
  }
}

async function createClaim(req, res, next) {
  try {
    const validated = validateCreateClaim(req.body);
    const service = getClaimService(req);
    const saved = await service.createClaim(validated);
    return res.status(201).json({
      success: true,
      data: saved
    });
  } catch (err) {
    next(err);
  }
}

async function updateClaim(req, res, next) {
  try {
    const validated = validateUpdateClaim(req.body);
    const service = getClaimService(req);
    const updated = await service.updateClaim(req.params.id, validated);
    return res.status(200).json({
      success: true,
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

async function deleteClaim(req, res, next) {
  try {
    const service = getClaimService(req);
    const result = await service.deleteClaim(req.params.id);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

function getClaimDocuments(req, res, next) {
  try {
    const service = getClaimService(req);
    const docs = service.getClaimDocuments(req.params.id);
    return res.status(200).json({
      success: true,
      data: docs
    });
  } catch (err) {
    next(err);
  }
}

function getClaimAnalysis(req, res, next) {
  try {
    const service = getClaimService(req);
    const runs = service.getClaimAnalysis(req.params.id);
    return res.status(200).json({
      success: true,
      data: runs
    });
  } catch (err) {
    next(err);
  }
}

function getClaimFindings(req, res, next) {
  try {
    const service = getClaimService(req);
    const findings = service.getClaimFindings(req.params.id);
    return res.status(200).json({
      success: true,
      data: findings
    });
  } catch (err) {
    next(err);
  }
}

async function analyzeClaim(req, res, next) {
  try {
    const service = getClaimService(req);
    const result = await service.analyzeClaim(req.params.id);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getClaims,
  getClaimById,
  createClaim,
  updateClaim,
  deleteClaim,
  getClaimDocuments,
  getClaimAnalysis,
  getClaimFindings,
  analyzeClaim
};
