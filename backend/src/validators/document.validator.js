const HttpError = require('../utils/http-error');

const VALID_DOCUMENT_STATUSES = [
  'UPLOADED',
  'MISSING',
  'PENDING_REVIEW',
  'VERIFIED',
  'REJECTED'
];

/**
 * Validate document metadata creation
 * @param {object} payload
 * @returns {object} Validated document payload
 */
function validateCreateDocument(payload) {
  if (!payload || typeof payload !== 'object') {
    throw HttpError.badRequest('Document metadata must be a non-empty object');
  }

  if (!payload.documentType || typeof payload.documentType !== 'string' || !payload.documentType.trim()) {
    throw HttpError.badRequest("'documentType' is required and must be a string");
  }

  const documentStatus = (payload.documentStatus || 'UPLOADED').toUpperCase();
  if (!VALID_DOCUMENT_STATUSES.includes(documentStatus)) {
    throw HttpError.badRequest(`'documentStatus' must be one of: ${VALID_DOCUMENT_STATUSES.join(', ')}`);
  }

  return {
    documentType: payload.documentType.trim().toLowerCase(),
    fileName: payload.fileName ? String(payload.fileName).trim() : null,
    mimeType: payload.mimeType || 'application/pdf',
    filePath: payload.filePath || null,
    documentStatus,
    isRequired: payload.isRequired !== undefined ? Boolean(payload.isRequired) : true,
    reviewNotes: payload.reviewNotes ? String(payload.reviewNotes).trim() : null
  };
}

/**
 * Validate document metadata update
 * @param {object} updates
 * @returns {object} Validated updates
 */
function validateUpdateDocument(updates) {
  if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
    throw HttpError.badRequest('Update payload must be a non-empty object');
  }

  const sanitized = {};

  if (updates.documentStatus !== undefined) {
    const ds = updates.documentStatus.toUpperCase();
    if (!VALID_DOCUMENT_STATUSES.includes(ds)) {
      throw HttpError.badRequest(`'documentStatus' must be one of: ${VALID_DOCUMENT_STATUSES.join(', ')}`);
    }
    sanitized.documentStatus = ds;
    if (['VERIFIED', 'REJECTED', 'PENDING_REVIEW'].includes(ds)) {
      sanitized.reviewedAt = new Date().toISOString();
    }
  }

  if (updates.reviewNotes !== undefined) {
    sanitized.reviewNotes = String(updates.reviewNotes).trim();
  }

  if (updates.fileName !== undefined) {
    sanitized.fileName = String(updates.fileName).trim();
  }

  return sanitized;
}

module.exports = {
  validateCreateDocument,
  validateUpdateDocument,
  VALID_DOCUMENT_STATUSES
};
