const GraphService = require('../services/graph.service');

function getGraphService(req) {
  return new GraphService(req.app.get('dataDir'));
}

function getGraph(req, res, next) {
  try {
    const service = getGraphService(req);
    const data = service.getGraph();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

function getClaimRelationships(req, res, next) {
  try {
    const service = getGraphService(req);
    const data = service.getClaimRelationships(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getGraph,
  getClaimRelationships
};
