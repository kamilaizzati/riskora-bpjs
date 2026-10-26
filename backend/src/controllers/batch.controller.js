const BatchService = require('../services/batch.service');

function getBatchService(req) {
  return new BatchService(req.app.get('dataDir'));
}

function getBatches(req, res, next) {
  try {
    const service = getBatchService(req);
    const batches = service.getBatches(req.query);
    return res.status(200).json({ success: true, data: batches });
  } catch (err) {
    next(err);
  }
}

function getBatchById(req, res, next) {
  try {
    const service = getBatchService(req);
    const batch = service.getBatchById(req.params.id);
    return res.status(200).json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
}

function getBatchPreview(req, res, next) {
  try {
    const service = getBatchService(req);
    const preview = service.getBatchPreview(req.params.id);
    return res.status(200).json({ success: true, data: preview });
  } catch (err) {
    next(err);
  }
}

async function uploadBatch(req, res, next) {
  try {
    const service = getBatchService(req);
    const { content, period, batchName, fileName, useDemoFile } = req.body || {};
    const batch = await service.uploadBatch({
      content,
      period,
      batchName,
      fileName,
      useDemoFile
    });
    return res.status(201).json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
}

async function createDemoBatch(req, res, next) {
  try {
    const service = getBatchService(req);
    const { period, name, batchName } = req.body || {};
    const batch = await service.uploadBatch({
      period: period || '2026-10',
      batchName: name || batchName,
      useDemoFile: true
    });
    return res.status(201).json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
}

async function runBatchScreening(req, res, next) {
  try {
    const service = getBatchService(req);
    const batch = await service.runBatchScreening(req.params.id);
    return res.status(200).json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
}

async function finalizeBatch(req, res, next) {
  try {
    const service = getBatchService(req);
    const batch = await service.finalizeBatch(req.params.id);
    return res.status(200).json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
}

async function markBatchForwarded(req, res, next) {
  try {
    const service = getBatchService(req);
    const batch = await service.markBatchForwarded(req.params.id);
    return res.status(200).json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
}

async function updateClaimCorrection(req, res, next) {
  try {
    const service = getBatchService(req);
    const batchId = req.params.batchId || req.params.id;
    const claimId = req.params.claimId;
    const updated = await service.updateClaimCorrection(batchId, claimId, req.body);
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function rescreenClaim(req, res, next) {
  try {
    const service = getBatchService(req);
    const batchId = req.params.batchId || req.params.id;
    const claimId = req.params.claimId;
    const result = await service.rescreenClaim(batchId, claimId);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBatches,
  getBatchById,
  getBatchPreview,
  uploadBatch,
  createDemoBatch,
  runBatchScreening,
  finalizeBatch,
  markBatchForwarded,
  updateClaimCorrection,
  rescreenClaim
};
