const { resetClaimStores, isCleanState } = require('../services/clean-state.service');

/**
 * Health Controller
 */
function getHealth(req, res) {
  const dataDir = req.app.get('dataDir');
  return res.status(200).json({
    success: true,
    data: {
      status: 'UP',
      service: 'riskora-backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      cleanState: isCleanState(dataDir)
    }
  });
}

function postCleanState(req, res) {
  const dataDir = req.app.get('dataDir');
  resetClaimStores(dataDir);
  return res.status(200).json({
    success: true,
    message: 'Seluruh data klaim dan batch berhasil dibersihkan (clean state aktif: 0 klaim).'
  });
}

module.exports = {
  getHealth,
  postCleanState
};
