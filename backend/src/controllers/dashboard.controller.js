const DashboardService = require('../services/dashboard.service');

function getDashboardService(req) {
  return new DashboardService(req.app.get('dataDir'));
}

function getSummary(req, res, next) {
  try {
    const service = getDashboardService(req);
    const data = service.getSummary();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

function getRiskDistribution(req, res, next) {
  try {
    const service = getDashboardService(req);
    const data = service.getRiskDistribution();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

function getFindingDistribution(req, res, next) {
  try {
    const service = getDashboardService(req);
    const data = service.getFindingDistribution();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

function getRecentActivity(req, res, next) {
  try {
    const service = getDashboardService(req);
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const data = service.getRecentActivity(isNaN(limit) ? 10 : limit);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSummary,
  getRiskDistribution,
  getFindingDistribution,
  getRecentActivity
};
