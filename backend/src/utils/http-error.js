/**
 * Standard Application HTTP Error
 */
class HttpError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g. 400, 404, 500)
   * @param {string} code - Application error code string (e.g. 'RESOURCE_NOT_FOUND')
   * @param {string} message - Human-readable error message
   * @param {any} [details=null] - Optional detailed validation or context object
   */
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = 'Invalid request payload or parameters', code = 'BAD_REQUEST', details = null) {
    return new HttpError(400, code, message, details);
  }

  static notFound(message = 'Requested resource not found', code = 'RESOURCE_NOT_FOUND', details = null) {
    return new HttpError(404, code, message, details);
  }

  static conflict(message = 'Resource conflict', code = 'CONFLICT', details = null) {
    return new HttpError(409, code, message, details);
  }

  static internal(message = 'Internal server error', code = 'INTERNAL_ERROR', details = null) {
    return new HttpError(500, code, message, details);
  }
}

module.exports = HttpError;
