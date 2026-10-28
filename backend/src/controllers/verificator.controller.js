const ClaimService = require('../services/claim.service');
const DashboardService = require('../services/dashboard.service');
const DocumentService = require('../services/document.service');
const GraphService = require('../services/graph.service');
const JsonRepository = require('../repositories/json.repository');
const VerificatorDataService = require('../services/verificator-data.service');
const HttpError = require('../utils/http-error');
const path = require('path');
const fs = require('fs');

function getServices(req) {
  const dataDir = (req && req.app && typeof req.app.get === 'function') ? req.app.get('dataDir') : null;
  return {
    claimService: new ClaimService(dataDir),
    dashboardService: new DashboardService(dataDir),
    docService: new DocumentService(dataDir),
    graphService: new GraphService(dataDir),
    claimsRepo: new JsonRepository('claims.json', dataDir),
    findingsRepo: new JsonRepository('fraud-findings.json', dataDir),
    analysisRepo: new JsonRepository('analysis-runs.json', dataDir),
    reviewsRepo: new JsonRepository('claim-reviews.json', dataDir),
    verificatorDataService: new VerificatorDataService(dataDir),
    dataDir
  };
}

function getDashboardSummary(req, res, next) {
  try {
    const { verificatorDataService } = getServices(req);
    const summary = verificatorDataService.getSummaryMetrics();
    return res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
}

function getPriorityClaims(req, res, next) {
  try {
    const { verificatorDataService } = getServices(req);
    const claims = verificatorDataService.getPriorityClaims(req.query);
    return res.status(200).json(claims);
  } catch (err) {
    next(err);
  }
}

function getAnomalyDistribution(req, res, next) {
  try {
    const { verificatorDataService } = getServices(req);
    const result = verificatorDataService.getAnomalyDistribution();
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

function getScreeningResults(req, res, next) {
  try {
    const result = [
      { name: 'Lolos Screening', value: 1042, color: '#166534' },
      { name: 'Perlu Koreksi', value: 240, color: '#D97706' },
      { name: 'Perlu Review', value: 127, color: '#DC2626' }
    ];
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

function getClaims(req, res, next) {
  try {
    const { verificatorDataService } = getServices(req);
    const claims = verificatorDataService.getAggregatedClaims(req.query);
    return res.status(200).json(claims);
  } catch (err) {
    next(err);
  }
}

function getClaimById(req, res, next) {
  try {
    const { verificatorDataService } = getServices(req);
    const claim = verificatorDataService.getClaimById(req.params.id);
    return res.status(200).json(claim);
  } catch (err) {
    next(err);
  }
}

function getAnomalyNetwork(req, res, next) {
  try {
    const { graphService } = getServices(req);
    const network = graphService.buildDynamicAnomalyNetwork(req.query);
    return res.status(200).json(network);
  } catch (err) {
    next(err);
  }
}

function getAnomalyNetworkClaim(req, res, next) {
  try {
    const { graphService } = getServices(req);
    const network = graphService.buildDynamicAnomalyNetwork();
    const id = req.params.id;
    const cleanId = typeof id === 'string' && id.startsWith('claim:') ? id.slice(6) : id;
    let claim = (network.nodes || []).find((n) =>
      n.id === id || n.id === cleanId || n.claimId === id || n.claimId === cleanId ||
      n.noSep === id || n.sepNumber === id
    );

    if (!claim) {
      const staticGraph = graphService.getGraph();
      claim = (staticGraph.nodes || []).find((n) =>
        n.id === id || n.id === `claim:${cleanId}` || n.id === cleanId ||
        n.claimId === id || n.claimId === cleanId ||
        n.label === id || n.noSep === id || n.sepNumber === id
      );
    }

    if (claim) return res.status(200).json(claim);
    return res.status(404).json({ error: { message: 'Klaim tidak ditemukan dalam graf' } });
  } catch (err) {
    next(err);
  }
}

function getAnomalyNetworkClaimRelationships(req, res, next) {
  try {
    const { graphService } = getServices(req);
    const network = graphService.buildDynamicAnomalyNetwork();
    const id = req.params.id;
    const cleanId = typeof id === 'string' && id.startsWith('claim:') ? id.slice(6) : id;
    let edges = (network.edges || []).filter((e) =>
      e.source === id || e.source === cleanId || e.target === id || e.target === cleanId
    );

    if (!edges || edges.length === 0) {
      const staticGraph = graphService.getGraph();
      edges = (staticGraph.edges || []).filter((e) =>
        e.source === id || e.source === `claim:${cleanId}` || e.source === cleanId ||
        e.target === id || e.target === `claim:${cleanId}` || e.target === cleanId
      );
    }

    return res.status(200).json(edges);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardSummary,
  getPriorityClaims,
  getAnomalyDistribution,
  getScreeningResults,
  getClaims,
  getClaimById,
  getAnomalyNetwork,
  getAnomalyNetworkClaim,
  getAnomalyNetworkClaimRelationships
};
