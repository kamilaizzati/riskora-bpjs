/**
 * 404 Route Not Found Middleware
 */
function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
}

module.exports = notFoundHandler;
