const HttpError = require('../utils/http-error');

const VALID_SERVICE_TYPES = ['INPATIENT', 'OUTPATIENT'];
const VALID_WORKFLOW_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'INVESTIGATION', 'COMPLETED', 'RETURNED'];

/**
 * Validate claim creation payload
 * @param {object} payload
 * @returns {object} Validated payload
 */
function validateCreateClaim(payload) {
  if (!payload || typeof payload !== 'object') {
    throw HttpError.badRequest('Claim payload must be a non-empty object');
  }

  const errors = [];

  if (!payload.noSep || typeof payload.noSep !== 'string' || !payload.noSep.trim()) {
    errors.push("'noSep' is required and must be a non-empty string");
  }

  if (!payload.noRm || typeof payload.noRm !== 'string' || !payload.noRm.trim()) {
    errors.push("'noRm' is required and must be a non-empty string");
  }

  if (!payload.facilityId || typeof payload.facilityId !== 'string' || !payload.facilityId.trim()) {
    errors.push("'facilityId' is required and must be a non-empty string");
  }

  const serviceType = (payload.serviceType || '').toUpperCase();
  if (!VALID_SERVICE_TYPES.includes(serviceType)) {
    errors.push(`'serviceType' must be one of: ${VALID_SERVICE_TYPES.join(', ')}`);
  }

  if (!payload.serviceDate || isNaN(Date.parse(payload.serviceDate))) {
    errors.push("'serviceDate' is required and must be a valid date string (YYYY-MM-DD)");
  }

  if (payload.claimAmount === undefined || typeof payload.claimAmount !== 'number' || payload.claimAmount < 0) {
    errors.push("'claimAmount' is required and must be a positive number");
  }

  if (!payload.primaryDiagnosis || typeof payload.primaryDiagnosis !== 'object' || !payload.primaryDiagnosis.code) {
    errors.push("'primaryDiagnosis' must be an object containing at least a 'code' field");
  }

  if (payload.lengthOfStayDays !== undefined && (typeof payload.lengthOfStayDays !== 'number' || payload.lengthOfStayDays < 0)) {
    errors.push("'lengthOfStayDays' must be a non-negative number");
  }

  if (errors.length > 0) {
    throw HttpError.badRequest('Validation failed for claim creation', 'VALIDATION_ERROR', { errors });
  }

  return {
    ...payload,
    noSep: payload.noSep.trim(),
    noRm: payload.noRm.trim(),
    facilityId: payload.facilityId.trim(),
    serviceType,
    workflowStatus: payload.workflowStatus ? payload.workflowStatus.toUpperCase() : 'SUBMITTED',
    secondaryDiagnoses: Array.isArray(payload.secondaryDiagnoses) ? payload.secondaryDiagnoses : [],
    procedures: Array.isArray(payload.procedures) ? payload.procedures : [],
    lengthOfStayDays: payload.lengthOfStayDays !== undefined ? payload.lengthOfStayDays : (serviceType === 'INPATIENT' ? 1 : 0),
    isDeleted: false
  };
}

/**
 * Validate claim patch updates
 * @param {object} updates
 * @returns {object} Validated updates
 */
function validateUpdateClaim(updates) {
  if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
    throw HttpError.badRequest('Update payload must be a non-empty object');
  }

  const sanitized = {};

  if (updates.noSep !== undefined) {
    if (typeof updates.noSep !== 'string' || !updates.noSep.trim()) {
      throw HttpError.badRequest("'noSep' must be a non-empty string");
    }
    sanitized.noSep = updates.noSep.trim();
  }

  if (updates.noRm !== undefined) {
    if (typeof updates.noRm !== 'string' || !updates.noRm.trim()) {
      throw HttpError.badRequest("'noRm' must be a non-empty string");
    }
    sanitized.noRm = updates.noRm.trim();
  }

  if (updates.serviceType !== undefined) {
    const st = updates.serviceType.toUpperCase();
    if (!VALID_SERVICE_TYPES.includes(st)) {
      throw HttpError.badRequest(`'serviceType' must be one of: ${VALID_SERVICE_TYPES.join(', ')}`);
    }
    sanitized.serviceType = st;
  }

  if (updates.workflowStatus !== undefined) {
    const ws = updates.workflowStatus.toUpperCase();
    if (!VALID_WORKFLOW_STATUSES.includes(ws)) {
      throw HttpError.badRequest(`'workflowStatus' must be one of: ${VALID_WORKFLOW_STATUSES.join(', ')}`);
    }
    sanitized.workflowStatus = ws;
  }

  if (updates.claimAmount !== undefined) {
    if (typeof updates.claimAmount !== 'number' || updates.claimAmount < 0) {
      throw HttpError.badRequest("'claimAmount' must be a non-negative number");
    }
    sanitized.claimAmount = updates.claimAmount;
  }

  if (updates.lengthOfStayDays !== undefined) {
    if (typeof updates.lengthOfStayDays !== 'number' || updates.lengthOfStayDays < 0) {
      throw HttpError.badRequest("'lengthOfStayDays' must be a non-negative number");
    }
    sanitized.lengthOfStayDays = updates.lengthOfStayDays;
  }

  if (updates.primaryDiagnosis !== undefined) {
    if (typeof updates.primaryDiagnosis !== 'object' || !updates.primaryDiagnosis.code) {
      throw HttpError.badRequest("'primaryDiagnosis' must be an object with a 'code'");
    }
    sanitized.primaryDiagnosis = updates.primaryDiagnosis;
  }

  // Copy other valid scalar fields
  const allowedScalars = ['facilityName', 'facilityId', 'serviceClass', 'serviceDate', 'admissionDate', 'dischargeDate', 'inacbgCode'];
  for (const field of allowedScalars) {
    if (updates[field] !== undefined) {
      sanitized[field] = updates[field];
    }
  }

  if (Array.isArray(updates.secondaryDiagnoses)) {
    sanitized.secondaryDiagnoses = updates.secondaryDiagnoses;
  }
  if (Array.isArray(updates.procedures)) {
    sanitized.procedures = updates.procedures;
  }

  return sanitized;
}

module.exports = {
  validateCreateClaim,
  validateUpdateClaim,
  VALID_SERVICE_TYPES,
  VALID_WORKFLOW_STATUSES
};
