const path = require('path');
const fs = require('fs');
const JsonRepository = require('../repositories/json.repository');
const HttpError = require('../utils/http-error');
const { generateId } = require('../utils/id-generator');

class DocumentService {
  constructor(customDataDir = null) {
    this.customDataDir = customDataDir || path.join(__dirname, '../data');
    this.docsRepo = new JsonRepository('claim-documents.json', this.customDataDir);
    this.claimsRepo = new JsonRepository('claims.json', this.customDataDir);
    this.auditRepo = new JsonRepository('audit-logs.json', this.customDataDir);
  }

  getDocuments(claimId = null) {
    if (claimId) {
      const cleanId = String(claimId).trim();
      const demoAlt = cleanId.replace('CLM-FKS-', 'CLM-DEMO-');
      const fksAlt = cleanId.replace('CLM-DEMO-', 'CLM-FKS-');
      const suffixMatch = cleanId.match(/(\d{4})$/);
      const suffix = suffixMatch ? suffixMatch[1] : null;

      const docs = this.docsRepo.findAll((d) => {
        if (d.claimId === cleanId || d.claimId === demoAlt || d.claimId === fksAlt) {
          return true;
        }
        if (suffix && d.claimId && d.claimId.endsWith(suffix)) {
          return true;
        }
        return false;
      });

      return docs.map((doc) => ({
        ...doc,
        status: doc.fileStatus || doc.status || doc.documentStatus || 'available',
        previewUrl: `/api/documents/${doc.id}/preview`
      }));
    }

    return this.docsRepo.findAll().map((doc) => ({
      ...doc,
      status: doc.fileStatus || doc.status || doc.documentStatus || 'available',
      previewUrl: `/api/documents/${doc.id}/preview`
    }));
  }

  getDocumentById(id) {
    let doc = this.docsRepo.findById(id);
    if (!doc) {
      doc = this.docsRepo.findOne((d) => d.fileName === id || d.id === id);
    }
    if (!doc) {
      throw HttpError.notFound(`Document with ID '${id}' not found`);
    }
    return {
      ...doc,
      status: doc.fileStatus || doc.status || doc.documentStatus || 'available',
      previewUrl: `/api/documents/${doc.id}/preview`
    };
  }

  getDocumentPreviewStream(id) {
    // 1. Locate metadata record
    let doc = null;
    try {
      doc = this.getDocumentById(id);
    } catch {
      // fallback: id might be the direct fileName
    }

    const targetFileName = doc ? doc.fileName : id;

    // 2. Strict path traversal prevention:
    // Disallow null bytes, path separators, parent directory markers
    if (
      !targetFileName ||
      typeof targetFileName !== 'string' ||
      targetFileName.includes('\0') ||
      targetFileName.includes('..') ||
      targetFileName.includes('/') ||
      targetFileName.includes('\\')
    ) {
      throw HttpError.badRequest('Invalid document identifier or filename');
    }

    const sanitizedFileName = path.basename(targetFileName);
    if (!sanitizedFileName.toLowerCase().endsWith('.pdf')) {
      throw HttpError.badRequest('Only PDF document previews are supported');
    }

    const documentsDir = path.resolve(this.customDataDir, 'documents');
    const resolvedPath = path.resolve(documentsDir, sanitizedFileName);

    // Verify resolved path strictly resides inside documentsDir
    if (!resolvedPath.startsWith(documentsDir) || !fs.existsSync(resolvedPath)) {
      throw HttpError.notFound(`PDF document '${sanitizedFileName}' not found on server`);
    }

    return {
      filePath: resolvedPath,
      fileName: sanitizedFileName,
      doc,
      mimeType: 'application/pdf'
    };
  }

  async createClaimDocument(claimId, payload) {
    const claim = this.claimsRepo.findById(claimId);
    if (!claim || claim.isDeleted) {
      throw HttpError.notFound(`Claim with ID '${claimId}' not found`);
    }

    const docId = generateId('DOC');
    const now = new Date().toISOString();

    const newDoc = {
      id: docId,
      claimId,
      documentType: payload.documentType,
      fileName: payload.fileName || `${payload.documentType}_${claim.noSep || claimId}.pdf`,
      mimeType: payload.mimeType || 'application/pdf',
      filePath: payload.filePath || `/documents/${claimId}/${payload.documentType}.pdf`,
      documentStatus: payload.documentStatus || 'UPLOADED',
      status: payload.status || 'available',
      isRequired: payload.isRequired !== undefined ? payload.isRequired : true,
      uploadedAt: now,
      reviewedAt: null,
      reviewNotes: payload.reviewNotes || null,
      previewUrl: `/api/documents/${docId}/preview`
    };

    const saved = await this.docsRepo.create(newDoc);

    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'document',
      entityId: docId,
      action: 'DOCUMENT_METADATA_CREATED',
      details: { claimId, documentType: payload.documentType, status: saved.documentStatus },
      createdAt: now
    });

    return saved;
  }

  async updateDocument(id, updates) {
    this.getDocumentById(id);
    const updated = await this.docsRepo.update(id, updates);

    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'document',
      entityId: id,
      action: 'DOCUMENT_METADATA_UPDATED',
      details: { updatedFields: Object.keys(updates) },
      createdAt: new Date().toISOString()
    });

    return updated;
  }
}

module.exports = DocumentService;
