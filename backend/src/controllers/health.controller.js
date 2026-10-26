/**
 * Health Controller
 */
function getHealth(req, res) {
  return res.status(200).json({
    success: true,
    data: {
      status: 'UP',
      service: 'riskora-backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  });
}

module.exports = {
  getHealth
};
