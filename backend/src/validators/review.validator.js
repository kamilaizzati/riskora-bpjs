const HttpError = require('../utils/http-error');

const VALID_REVIEW_DECISIONS = [
  'NEEDS_INVESTIGATION',
  'NO_ISSUE_FOUND',
  'REQUEST_DOCUMENTS',
  'ESCALATE'
];

/**
 * Validate review creation payload
 * @param {object} payload
 * @returns {object} Validated review payload
 */
function validateCreateReview(payload) {
  if (!payload || typeof payload !== 'object') {
    throw HttpError.badRequest('Review payload must be a non-empty object');
  }

  const decision = (payload.decision || '').toUpperCase();
  if (!VALID_REVIEW_DECISIONS.includes(decision)) {
    throw HttpError.badRequest(
      `Invalid review decision '${payload.decision}'. Allowed decisions: ${VALID_REVIEW_DECISIONS.join(', ')}`
    );
  }

  if (!payload.notes || typeof payload.notes !== 'string' || !payload.notes.trim()) {
    throw HttpError.badRequest("'notes' is required and must contain verifier explanation");
  }

  return {
    decision,
    notes: payload.notes.trim(),
    reviewerId: payload.reviewerId ? String(payload.reviewerId).trim() : 'USR-VERIFIER-01',
    findingId: payload.findingId || null
  };
}

module.exports = {
  validateCreateReview,
  VALID_REVIEW_DECISIONS
};
