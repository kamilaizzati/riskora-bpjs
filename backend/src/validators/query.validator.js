const HttpError = require('../utils/http-error');

/**
 * Validate and parse standard pagination and filter query parameters
 * @param {object} query - req.query
 * @param {object} [options]
 * @param {string[]} [options.allowedSortFields]
 * @returns {object} Validated query object
 */
function validateQueryParams(query = {}, options = {}) {
  const allowedSortFields = options.allowedSortFields || ['createdAt', 'serviceDate', 'claimAmount', 'riskScore'];
  
  // Page validation
  let page = 1;
  if (query.page !== undefined) {
    page = parseInt(query.page, 10);
    if (isNaN(page) || page < 1) {
      throw HttpError.badRequest("Query parameter 'page' must be a positive integer >= 1");
    }
  }

  // Limit validation
  let limit = 10;
  if (query.limit !== undefined) {
    limit = parseInt(query.limit, 10);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw HttpError.badRequest("Query parameter 'limit' must be an integer between 1 and 100");
    }
  }

  // Date range validation
  if (query.dateFrom && isNaN(Date.parse(query.dateFrom))) {
    throw HttpError.badRequest("Query parameter 'dateFrom' must be a valid ISO date string (YYYY-MM-DD)");
  }
  if (query.dateTo && isNaN(Date.parse(query.dateTo))) {
    throw HttpError.badRequest("Query parameter 'dateTo' must be a valid ISO date string (YYYY-MM-DD)");
  }
  if (query.dateFrom && query.dateTo && new Date(query.dateFrom) > new Date(query.dateTo)) {
    throw HttpError.badRequest("'dateFrom' cannot be after 'dateTo'");
  }

  // Sort validation
  const sortBy = query.sortBy || 'createdAt';
  if (!allowedSortFields.includes(sortBy)) {
    throw HttpError.badRequest(
      `Invalid sortBy field '${sortBy}'. Allowed fields: ${allowedSortFields.join(', ')}`
    );
  }

  const sortOrder = (query.sortOrder || 'desc').toLowerCase();
  if (!['asc', 'desc'].includes(sortOrder)) {
    throw HttpError.badRequest("Query parameter 'sortOrder' must be 'asc' or 'desc'");
  }

  return {
    page,
    limit,
    sortBy,
    sortOrder,
    riskCategory: query.riskCategory ? query.riskCategory.toUpperCase() : undefined,
    workflowStatus: query.workflowStatus ? query.workflowStatus.toUpperCase() : undefined,
    serviceType: query.serviceType ? query.serviceType.toUpperCase() : undefined,
    facilityId: query.facilityId,
    search: query.search ? String(query.search).trim() : undefined,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo
  };
}

module.exports = {
  validateQueryParams
};
