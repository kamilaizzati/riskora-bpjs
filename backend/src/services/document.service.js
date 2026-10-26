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
    const documentsDir = path.resolve(this.customDataDir, 'documents');

    const documentTypeLabels = {
      discharge_summary: 'Resume Medis',
      sep: 'Surat Eligibilitas Peserta (SEP)',
      hospital_bill: 'Rincian Biaya / Tagihan',
      supporting_test_result: 'Hasil Laboratorium',
      patient_identity: 'Identitas Pasien',
      patient_identity_summary: 'Identitas Pasien',
      inacbg_output: 'Output INA-CBG',
      operation_report: 'Laporan Operasi',
      control_letter: 'Surat Kontrol',
      consultation_response: 'Jawaban Konsultasi'
    };

    const formatDoc = (doc) => {
      const fileExists = Boolean(doc.fileName && fs.existsSync(path.resolve(documentsDir, doc.fileName)));
      const status = fileExists ? 'available' : (doc.fileStatus === 'available' && !fileExists ? 'missing' : (doc.fileStatus || 'missing'));
      const label = documentTypeLabels[doc.documentType] || doc.displayName || doc.fileName || doc.documentType;

      return {
        ...doc,
        label,
        displayName: label,
        status,
        fileStatus: status,
        requirement: doc.required === false || doc.condition ? 'conditional' : 'required',
        previewUrl: `/api/documents/${doc.id}/preview`,
        fileUrl: `/api/documents/${doc.id}/file`,
        downloadUrl: `/api/documents/${doc.id}/file`
      };
    };

    if (claimId) {
      const cleanId = String(claimId).trim();
      const demoAlt = cleanId.replace('CLM-FKS-', 'CLM-DEMO-');
      const fksAlt = cleanId.replace('CLM-DEMO-', 'CLM-FKS-');
      const suffixMatch = cleanId.match(/(\d+)$/);
      const suffix = suffixMatch ? String(suffixMatch[1]).padStart(4, '0') : null;

      // 1. First priority: Exact match on claimId
      let rawDocs = this.docsRepo.findAll((d) => d.claimId === cleanId);

      // 2. Second priority: If no exact match, try fksAlt or demoAlt
      if (rawDocs.length === 0) {
        rawDocs = this.docsRepo.findAll((d) => d.claimId === fksAlt);
      }
      if (rawDocs.length === 0) {
        rawDocs = this.docsRepo.findAll((d) => d.claimId === demoAlt);
      }

      // 3. Third priority: match by suffix with prefix preference (CLM-FKS- over CLM-DEMO-)
      if (rawDocs.length === 0 && suffix) {
        rawDocs = this.docsRepo.findAll((d) => d.claimId && d.claimId.startsWith('CLM-FKS-') && d.claimId.endsWith(suffix));
      }
      if (rawDocs.length === 0 && suffix) {
        rawDocs = this.docsRepo.findAll((d) => d.claimId && d.claimId.endsWith(suffix));
      }

      // Deduplicate by documentType to avoid redundant duplicate records
      const seenTypes = new Set();
      const uniqueDocs = [];
      for (const d of rawDocs) {
        const typeKey = d.documentType === 'patient_identity_summary' ? 'patient_identity' : d.documentType;
        if (!seenTypes.has(typeKey)) {
          seenTypes.add(typeKey);
          uniqueDocs.push(d);
        }
      }

      return uniqueDocs.map(formatDoc);
    }

    return this.docsRepo.findAll().map(formatDoc);
  }

  getDocumentById(id) {
    const documentsDir = path.resolve(this.customDataDir, 'documents');
    let doc = this.docsRepo.findById(id);
    if (!doc) {
      doc = this.docsRepo.findAll((d) => d.fileName === id || d.id === id)[0] || null;
    }
    if (!doc) {
      throw HttpError.notFound(`Document with ID '${id}' not found`);
    }

    const fileExists = Boolean(doc.fileName && fs.existsSync(path.resolve(documentsDir, doc.fileName)));
    const status = fileExists ? 'available' : (doc.fileStatus || 'missing');

    return {
      ...doc,
      status,
      fileStatus: status,
      previewUrl: `/api/documents/${doc.id}/preview`,
      fileUrl: `/api/documents/${doc.id}/file`,
      downloadUrl: `/api/documents/${doc.id}/file`
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

    if (!doc && !id) {
      throw HttpError.notFound(`Document with ID '${id}' not found`);
    }

    if (doc && (doc.status === 'missing' || !doc.fileName)) {
      throw HttpError.notFound(`Berkas fisik untuk dokumen '${doc.label || id}' belum tersedia atau belum diunggah.`);
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
