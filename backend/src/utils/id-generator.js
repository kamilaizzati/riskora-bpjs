const crypto = require('crypto');

/**
 * Generate a unique ID with an optional prefix
 * Format: PREFIX-YYYYMMDD-<short-random> or standard UUID
 * @param {string} prefix - e.g. 'CLM', 'ANL', 'FND', 'REV', 'DOC', 'AUD'
 * @returns {string} Unique identifier
 */
function generateId(prefix = 'ID') {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(4).toString('hex');
  return `${prefix}-${dateStr}-${randomHex}`;
}

/**
 * Generate a standard UUID v4
 * @returns {string} UUID v4
 */
function generateUuid() {
  return crypto.randomUUID();
}

module.exports = {
  generateId,
  generateUuid
};
