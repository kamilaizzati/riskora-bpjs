const HttpError = require('../utils/http-error');

/**
 * Centralized Express Error Handling Middleware
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // If headers were already sent, delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle known HttpError instances
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {})
      }
    });
  }

  // Handle JSON body parse errors from express.json()
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_JSON_BODY',
        message: 'Request payload contains malformed JSON'
      }
    });
  }

  // Generic internal server error (never leak internal stack traces or filesystem paths)
  console.error('[InternalError]', err.message);

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected server error occurred'
    }
  });
}

module.exports = errorHandler;
