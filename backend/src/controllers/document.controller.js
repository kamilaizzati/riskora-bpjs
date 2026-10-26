const fs = require('fs');
const DocumentService = require('../services/document.service');
const HttpError = require('../utils/http-error');
const { validateCreateDocument, validateUpdateDocument } = require('../validators/document.validator');

function getDocumentService(req) {
  return new DocumentService(req.app.get('dataDir'));
}

function getDocuments(req, res, next) {
  try {
    const service = getDocumentService(req);
    const docs = service.getDocuments(req.query.claimId);
    return res.status(200).json({ success: true, data: docs });
  } catch (err) {
    next(err);
  }
}

function getDocumentById(req, res, next) {
  try {
    const service = getDocumentService(req);
    const doc = service.getDocumentById(req.params.id);
    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
}

function previewDocument(req, res, next) {
  try {
    // RBAC: If an authenticated session exists, restrict to authorized roles
    if (req.session && req.session.user && req.session.user.role) {
      const allowedRoles = ['VERIFICATOR', 'CASEMIX_ADMIN'];
      if (!allowedRoles.includes(req.session.user.role)) {
        throw HttpError.forbidden(`Akses ditolak: role '${req.session.user.role}' tidak memiliki izin mengakses dokumen.`);
      }
    }

    const service = getDocumentService(req);
    const { filePath, fileName, mimeType } = service.getDocumentPreviewStream(req.params.id);

    res.setHeader('Content-Type', mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => next(err));
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

async function createClaimDocument(req, res, next) {
  try {
    const validated = validateCreateDocument(req.body);
    const service = getDocumentService(req);
    const saved = await service.createClaimDocument(req.params.id, validated);
    return res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
}

async function updateDocument(req, res, next) {
  try {
    const validated = validateUpdateDocument(req.body);
    const service = getDocumentService(req);
    const updated = await service.updateDocument(req.params.id, validated);
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDocuments,
  getDocumentById,
  previewDocument,
  createClaimDocument,
  updateDocument
};
