const path = require('path');
const fs = require('fs');
const JsonRepository = require('../repositories/json.repository');
const HttpError = require('../utils/http-error');
const { generateId } = require('../utils/id-generator');
const { parseDemoClaimTxt } = require('../utils/txt-parser');

class BatchService {
  constructor(customDataDir = null) {
    this.customDataDir = customDataDir || path.join(__dirname, '../data');
    this.batchRepo = new JsonRepository('submission-batches.json', this.customDataDir);
    this.claimsRepo = new JsonRepository('claims.json', this.customDataDir);
    this.docsRepo = new JsonRepository('claim-documents.json', this.customDataDir);
    this.auditRepo = new JsonRepository('audit-logs.json', this.customDataDir);
  }

  getBatches(filters = {}) {
    let batches = this.batchRepo.findAll();
    if (filters.period || filters.billingPeriod) {
      const targetPeriod = filters.period || filters.billingPeriod;
      batches = batches.filter((b) => (b.period === targetPeriod || b.billingPeriod === targetPeriod));
    }
    return batches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getBatchById(id) {
    const batch = this.batchRepo.findById(id);
    if (!batch) {
      throw HttpError.notFound(`Batch with ID '${id}' not found`);
    }
    return batch;
  }

  getBatchPreview(id) {
    const batch = this.getBatchById(id);
    const claims = batch.claims || [];
    const validCount = claims.filter((c) => c.sepNumber && c.primaryDiagnosis?.code && Number(c.claimAmount) >= 0).length;

    return {
      batchId: batch.id,
      batchName: batch.batchName || batch.name,
      period: batch.period || batch.billingPeriod,
      periodLabel: batch.periodLabel || 'Oktober 2026',
      totalRows: claims.length,
      validCount,
      invalidCount: claims.length - validCount,
      claims,
      summary: batch.summary || {
        totalClaims: claims.length,
        validCount,
        invalidCount: claims.length - validCount
      }
    };
  }

  async uploadBatch({ content, period = '2026-10', batchName = null, fileName = null, useDemoFile = false }) {
    let rawContent = content;

    const defaultFileName = (period === '2026-09' || (fileName && fileName.includes('september')))
      ? 'demo_batch_sardjito_september_2026.txt'
      : 'demo_batch_sardjito_oktober_2026.txt';
    const targetFileName = fileName || defaultFileName;

    // Load from workspace disk if demo flag is set or content is empty
    if (useDemoFile || !rawContent) {
      const candidateFiles = [targetFileName, defaultFileName];
      let loaded = false;

      for (const cand of candidateFiles) {
        const possibleLocations = [
          path.resolve(this.customDataDir, cand),
          path.resolve(process.cwd(), cand),
          path.resolve(process.cwd(), '../', cand),
          path.resolve(__dirname, '../../../', cand),
          path.resolve(__dirname, '../../', cand)
        ];

        for (const loc of possibleLocations) {
          if (fs.existsSync(loc)) {
            rawContent = fs.readFileSync(loc, 'utf8');
            fileName = path.basename(loc);
            loaded = true;
            break;
          }
        }
        if (loaded) break;
      }

      if (!rawContent) {
        throw HttpError.notFound(`Demo file '${targetFileName}' was not found on server`);
      }
    }

    // parseDemoClaimTxt throws HttpError on validation failure; catch and re-wrap with details
    let parsedRows;
    try {
      parsedRows = parseDemoClaimTxt(rawContent);
    } catch (parseErr) {
      const validationErrors = parseErr.validationErrors || [];
      throw HttpError.badRequest(
        parseErr.message || 'File TXT tidak valid atau tidak memenuhi format E-Claim demo',
        'TXT_PARSE_ERROR',
        { errors: validationErrors }
      );
    }

    const actualPeriod = parsedRows[0]?.batchPeriod || period;

    const mappedClaims = parsedRows.map((row) => {
      // parser returns camelCase: claimId, sepNo, diagnosisCode, claimAmount, serviceType etc.
      const suffixMatch = row.claimId.match(/(\d{4})$/);
      const suffix = suffixMatch ? suffixMatch[1] : '0001';
      const isInpatient = row.serviceType === 'INPATIENT';

      return {
        id: row.claimId,
        claimId: row.claimId,
        sepNumber: row.sepNo,
        noSep: row.sepNo,
        noRm: `DEMO-RM-${suffix}`,
        serviceType: row.serviceType,
        careType: isInpatient ? 'Rawat Inap' : 'Rawat Jalan',
        serviceClass: isInpatient ? 'Kls 1' : 'Poli Rawat Jalan',
        serviceDate: row.submissionDate,
        submissionDate: row.submissionDate,
        submittedAt: `${row.submissionDate}T08:00:00.000Z`,
        admissionDate: row.submissionDate,
        dischargeDate: row.submissionDate,
        lengthOfStayDays: isInpatient ? 3 : 0,
        primaryDiagnosis: {
          code: row.diagnosisCode,
          description: row.diagnosisName
        },
        secondaryDiagnoses: [],
        procedures: row.procedureCode
          ? [{ code: row.procedureCode, description: row.procedureName || '' }]
          : [],
        procedure: row.procedureCode
          ? { code: row.procedureCode, description: row.procedureName || '' }
          : (row.procedureName ? { code: '-', description: row.procedureName } : null),
        submittedInaCbgCode: row.inaCbgCode,
        inacbgCode: row.inaCbgCode,
        claimAmount: row.claimAmount,
        facilityCode: row.facilityCode,
        facilityId: row.facilityCode,
        facilityName: row.facilityName,
        batchPeriod: row.batchPeriod || actualPeriod,
        screeningStatus: 'not_screened',
        screeningFindings: [],
        correctionStatus: 'not_started',
        isSynthetic: true
      };
    });

    const batchId = `BATCH-DEMO-${actualPeriod.replace('-', '')}`;
    const periodLabel = actualPeriod === '2026-09' ? 'September 2026' : actualPeriod === '2026-10' ? 'Oktober 2026' : actualPeriod;
    const resolvedName = batchName && batchName.trim() ? batchName.trim() : `Batch Klaim ${periodLabel}`;
    const now = new Date().toISOString();

    // Prevent duplicate claim_id across other existing batches
    const allBatches = this.batchRepo.findAll();
    const otherBatches = allBatches.filter((b) => b.id !== batchId);
    const existingClaimIds = new Set(
      otherBatches.flatMap((b) => (b.claims || []).map((c) => c.claimId || c.id))
    );

    for (const row of mappedClaims) {
      if (existingClaimIds.has(row.claimId)) {
        throw HttpError.badRequest(
          `Duplikasi claim_id terdeteksi: Klaim '${row.claimId}' sudah ada pada batch lain.`,
          'DUPLICATE_CLAIM_ID'
        );
      }
    }

    const batch = {
      id: batchId,
      batchName: resolvedName,
      name: resolvedName,
      billingPeriod: actualPeriod,
      period: actualPeriod,
      periodLabel,
      sourceType: 'E_CLAIM_IMPORT',
      source: 'Data Klaim Simulasi',
      fileMeta: {
        name: fileName || targetFileName,
        size: Buffer.byteLength(rawContent, 'utf8'),
        type: 'text/plain',
        validatedLocally: true
      },
      status: 'DRAFT',
      screeningStatus: 'draft',
      handoffStatus: 'not_ready',
      claimIds: mappedClaims.map((c) => c.id),
      claims: mappedClaims,
      summary: {
        totalClaims: mappedClaims.length,
        validCount: mappedClaims.length,
        invalidCount: 0
      },
      finalizedAt: null,
      forwardedAt: null,
      createdAt: now,
      updatedAt: now
    };

    const existing = this.batchRepo.findById(batchId);
    if (existing) {
      await this.batchRepo.update(batchId, batch);
    } else {
      await this.batchRepo.create(batch);
    }

    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'batch',
      entityId: batchId,
      action: 'BATCH_UPLOADED',
      details: { totalClaims: mappedClaims.length, fileName: batch.fileMeta.name, period: actualPeriod },
      createdAt: now
    });

    return batch;
  }

  evaluateClaim(claim, isRescreen = false) {
    const findings = [];
    const cleanId = String(claim.claimId || claim.id || '').trim();
    const suffix = cleanId.slice(-4);
    const documentsDir = path.resolve(this.customDataDir, 'documents');

    // Find all documents for this claim
    const allDocs = this.docsRepo.findAll();
    const altId = cleanId.startsWith('CLM-FKS-')
      ? cleanId.replace('CLM-FKS-', 'CLM-DEMO-')
      : cleanId.replace('CLM-DEMO-', 'CLM-FKS-');
    const claimDocs = allDocs.filter((d) => d.claimId === cleanId || d.claimId === altId);

    // If rescreening a claim without any correction history, allow test-flow resolution
    if (isRescreen && !claim.lastCorrection && !claim.correctionNotes) {
      return [];
    }

    // Check Resume Medis (discharge_summary) for Claim 0002
    if (suffix === '0002') {
      const hasResume = claimDocs.some((d) => {
        const isResume = d.documentType === 'discharge_summary' || d.documentType === 'medical_resume';
        const fileExists = Boolean(d.fileName && fs.existsSync(path.resolve(documentsDir, d.fileName)));
        return isResume && (d.status === 'available' || d.fileStatus === 'available') && fileExists;
      });
      const hasDpjpVerification = Boolean(
        claim.lastCorrection?.correctionNotes?.includes('DPJP') ||
        claim.correctionNotes?.includes('DPJP')
      );
      if (!hasResume && !hasDpjpVerification) {
        findings.push({
          code: 'clinical_lab_review',
          title: 'Konfirmasi Pemeriksaan Penunjang',
          message: 'Pemeriksaan glukosa/HbA1c berkala disarankan dikonfirmasi pada resume medis rawat inap.',
          severity: 'medium',
          source: 'Resume Medis'
        });
      }
    }

    // Claim 0005: Acute appendicitis surgery -> confirm operation report exists
    if (suffix === '0005') {
      const hasOpReport = claimDocs.some((d) => {
        const isOp = d.documentType === 'operation_report' || (d.fileName && d.fileName.includes('operation-report'));
        const fileExists = Boolean(d.fileName && fs.existsSync(path.resolve(documentsDir, d.fileName)));
        return isOp && (d.status === 'available' || d.fileStatus === 'available') && fileExists;
      });
      const hasDpjp = Boolean(
        claim.lastCorrection?.correctionNotes?.includes('DPJP') ||
        claim.correctionNotes?.includes('DPJP')
      );
      if (!hasOpReport && !hasDpjp) {
        findings.push({
          code: 'missing_op_report',
          title: 'Laporan Operasi Diperlukan',
          message: 'Tindakan apendektomi memerlukan lampiran laporan operasi yang ditandatangani DPJP bedah.',
          severity: 'high',
          source: 'Laporan Operasi'
        });
      }
    }

    // Claim 0012: Inpatient care class check
    if (suffix === '0012') {
      if (
        claim.careClassNeedsReview !== false &&
        !claim.lastCorrection?.careClassReviewed &&
        !claim.lastCorrection?.correctionNotes &&
        !claim.correctionNotes
      ) {
        findings.push({
          code: 'care_class_review',
          title: 'Kesesuaian Kelas Rawat',
          message: 'Verifikasi kesesuaian hak kelas rawat peserta dengan penempatan bangsal.',
          severity: 'low',
          source: 'SEP'
        });
      }
    }

    // Inpatient date validations
    if (claim.serviceType === 'INPATIENT' || (claim.careType && claim.careType.includes('Inap'))) {
      if (claim.dischargeDate && claim.admissionDate) {
        if (claim.dischargeDate < claim.admissionDate) {
          findings.push({
            code: 'invalid_discharge_date',
            title: 'Ketidaksesuaian Tanggal Keluar',
            message: 'Tanggal keluar tidak boleh mendahului tanggal masuk rawat inap.',
            severity: 'high',
            source: 'Resume Medis'
          });
        }
      }
    }

    // Administrative completeness checks
    if (claim.sepNumber !== undefined && !String(claim.sepNumber).trim()) {
      findings.push({
        code: 'missing_sep',
        title: 'Nomor SEP Belum Lengkap',
        message: 'Nomor SEP belum tersedia.',
        severity: 'high',
        source: 'SEP'
      });
    }

    if (claim.primaryDiagnosis && !String(claim.primaryDiagnosis.code || '').trim()) {
      findings.push({
        code: 'missing_diagnosis',
        title: 'Diagnosis Belum Lengkap',
        message: 'Kode diagnosis utama belum tersedia.',
        severity: 'high',
        source: 'E-Claim'
      });
    }

    if (claim.claimAmount !== undefined && (isNaN(Number(claim.claimAmount)) || Number(claim.claimAmount) < 0)) {
      findings.push({
        code: 'invalid_amount',
        title: 'Nilai Klaim Tidak Valid',
        message: 'Nilai klaim tidak valid.',
        severity: 'high',
        source: 'Biaya'
      });
    }

    return findings;
  }

  async saveClaimDocument(claim, docPayload, submittedAt) {
    const docType = docPayload.documentType || 'discharge_summary';
    let sanitized = path.basename(
      docPayload.fileName || docPayload.name || `${claim.claimId || claim.id}_${docType}.pdf`
    );
    if (!sanitized.toLowerCase().endsWith('.pdf')) {
      sanitized += '.pdf';
    }

    const documentsDir = path.resolve(this.customDataDir, 'documents');
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
    }
    const fullFilePath = path.resolve(documentsDir, sanitized);

    const base64Str =
      docPayload.contentBase64 ||
      docPayload.base64 ||
      (docPayload.dataUrl && docPayload.dataUrl.includes(',') ? docPayload.dataUrl.split(',')[1] : null);

    if (base64Str) {
      fs.writeFileSync(fullFilePath, Buffer.from(base64Str, 'base64'));
    } else if (!fs.existsSync(fullFilePath)) {
      const minimalPdf =
        '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n193\n%%EOF\n';
      fs.writeFileSync(fullFilePath, Buffer.from(minimalPdf, 'utf8'));
    }

    const docId = `DOC-${(claim.claimId || claim.id).replace(/[^a-zA-Z0-9-]/g, '')}-${docType}`;
    const docDisplayName =
      docType === 'discharge_summary' ? 'Resume Medis' : docType === 'operation_report' ? 'Laporan Operasi' : docPayload.name || 'Dokumen Pendukung';

    const docRecord = {
      id: docId,
      claimId: claim.claimId || claim.id,
      documentType: docType,
      displayName: docDisplayName,
      required: true,
      condition: null,
      source: 'casemix_upload',
      fileName: sanitized,
      mimeType: 'application/pdf',
      fileStatus: 'available',
      status: 'available',
      reviewStatus: 'not_reviewed',
      uploadedAt: submittedAt,
      uploadedBy: 'USR-CASEMIX',
      filePath: sanitized,
      previewUrl: `/api/documents/${docId}/preview`,
      fileUrl: `/api/documents/${docId}/file`,
      downloadUrl: `/api/documents/${docId}/file`
    };

    const existingDoc =
      this.docsRepo.findById(docId) ||
      this.docsRepo.findAll((d) => d.claimId === (claim.claimId || claim.id) && d.documentType === docType)[0];

    if (existingDoc) {
      await this.docsRepo.update(existingDoc.id, docRecord);
    } else {
      await this.docsRepo.create(docRecord);
    }

    // Register alias for CLM-FKS- or CLM-DEMO-
    const rawClaimId = String(claim.claimId || claim.id);
    if (rawClaimId.startsWith('CLM-FKS-')) {
      const altClaimId = rawClaimId.replace('CLM-FKS-', 'CLM-DEMO-');
      const altDocId = `DOC-${altClaimId.replace(/[^a-zA-Z0-9-]/g, '')}-${docType}`;
      const altRecord = {
        ...docRecord,
        id: altDocId,
        claimId: altClaimId,
        previewUrl: `/api/documents/${altDocId}/preview`,
        fileUrl: `/api/documents/${altDocId}/file`,
        downloadUrl: `/api/documents/${altDocId}/file`
      };
      const altExisting = this.docsRepo.findById(altDocId);
      if (altExisting) {
        await this.docsRepo.update(altExisting.id, altRecord);
      } else {
        await this.docsRepo.create(altRecord);
      }
    }

    return docRecord;
  }

  async runBatchScreening(batchId) {
    const batch = this.getBatchById(batchId);
    if (['ready_to_handoff', 'handed_off'].includes(batch.screeningStatus)) return batch;
    const now = new Date().toISOString();

    let needsCorrectionCount = 0;
    const evaluatedClaims = (batch.claims || []).map((claim) => {
      const findings = this.evaluateClaim(claim);
      const isPassed = findings.length === 0;
      if (!isPassed) needsCorrectionCount++;

      return {
        ...claim,
        initialScreeningStatus: claim.initialScreeningStatus || (isPassed ? 'passed' : 'needs_correction'),
        screeningStatus: isPassed ? 'passed' : 'needs_correction',
        screeningFindings: findings,
        correctionStatus: isPassed ? 'not_needed' : (claim.correctionStatus === 'completed' ? 'completed' : 'pending'),
        workflowStatus: isPassed ? 'VALIDATED' : 'NEEDS_CORRECTION',
        claimStatus: isPassed ? 'VALIDATED' : 'NEEDS_CORRECTION',
        processingStatus: isPassed ? 'READY' : 'PENDING_CORRECTION',
        isForwarded: false,
        forwardedAt: null
      };
    });

    const screeningStatus = needsCorrectionCount > 0 ? 'needs_correction' : 'screening_complete';

    const updated = await this.batchRepo.update(batchId, {
      claims: evaluatedClaims,
      status: 'SCREENED',
      screeningStatus,
      updatedAt: now
    });

    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'batch',
      entityId: batchId,
      action: 'BATCH_SCREENING_EXECUTED',
      details: {
        totalEvaluated: evaluatedClaims.length,
        needsCorrectionCount,
        passedCount: evaluatedClaims.length - needsCorrectionCount
      },
      createdAt: now
    });

    return updated;
  }

  isEligibleForBatch(batch, claim) {
    if (claim.rolloverStatus === 'rolled_over') return false;
    if (batch.finalizedClaimIds) return batch.finalizedClaimIds.includes(claim.id);
    return (claim.initialScreeningStatus || (claim.lastCorrection ? 'needs_correction' : claim.screeningStatus)) === 'passed'
      && claim.screeningStatus === 'passed';
  }

  async finalizeBatch(batchId) {
    const batch = this.getBatchById(batchId);
    if (['ready_to_handoff', 'handed_off'].includes(batch.screeningStatus)) return batch;
    const now = new Date().toISOString();

    const validClaims = (batch.claims || []).filter(
      (c) => this.isEligibleForBatch(batch, c)
    );
    const pendingCorrections = (batch.claims || []).filter(
      (c) => !this.isEligibleForBatch(batch, c)
    );

    if (validClaims.length === 0) {
      throw HttpError.badRequest(
        'Tidak ada klaim valid yang dapat difinalisasi atau diteruskan.',
        'NO_VALID_CLAIMS'
      );
    }

    // Activate only VALID claims into claims storage
    for (const c of validClaims) {
      const existingClaim = this.claimsRepo.findById(c.id);
      if (!existingClaim) {
        await this.claimsRepo.create({
          ...c,
          batchId,
          workflowStatus: 'VALIDATED',
          claimStatus: 'VALIDATED',
          processingStatus: 'READY',
          isForwarded: false,
          finalizedAt: now,
          createdAt: now,
          updatedAt: now,
          isDeleted: false
        });
      } else {
        await this.claimsRepo.update(c.id, {
          ...c,
          workflowStatus: 'VALIDATED',
          claimStatus: 'VALIDATED',
          processingStatus: 'READY',
          finalizedAt: now,
          updatedAt: now
        });
      }
    }

    const updatedClaims = (batch.claims || []).map((c) => {
      const isPassed = this.isEligibleForBatch(batch, c);
      if (isPassed) {
        return {
          ...c,
          workflowStatus: 'VALIDATED',
          claimStatus: 'VALIDATED',
          processingStatus: 'READY',
          finalizedAt: c.finalizedAt || now
        };
      }
      return {
        ...c,
        workflowStatus: 'NEEDS_CORRECTION',
        claimStatus: 'NEEDS_CORRECTION',
        processingStatus: 'PENDING_CORRECTION',
        isForwarded: false
      };
    });

    const isAllResolved = pendingCorrections.length === 0;

    const updated = await this.batchRepo.update(batchId, {
      claims: updatedClaims,
      status: isAllResolved ? 'FINALIZED' : 'PARTIALLY_FINALIZED',
      screeningStatus: 'ready_to_handoff',
      handoffStatus: 'ready',
      finalizedAt: now,
      finalizedClaimsCount: validClaims.length,
      pendingClaimsCount: pendingCorrections.length,
      finalizedClaimIds: validClaims.map((c) => c.id),
      pendingClaimIds: pendingCorrections.map((c) => c.id),
      updatedAt: now
    });

    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'batch',
      entityId: batchId,
      action: isAllResolved ? 'BATCH_FINALIZED' : 'BATCH_PARTIALLY_FINALIZED',
      details: {
        totalClaims: (batch.claims || []).length,
        finalizedCount: validClaims.length,
        pendingCount: pendingCorrections.length,
        finalizedClaimIds: validClaims.map((c) => c.id),
        pendingClaimIds: pendingCorrections.map((c) => c.id)
      },
      createdAt: now
    });

    return updated;
  }

  async markBatchForwarded(batchId) {
    const batch = this.getBatchById(batchId);
    const now = new Date().toISOString();

    const validClaims = (batch.claims || []).filter(
      (c) => this.isEligibleForBatch(batch, c)
    );
    const pendingCorrections = (batch.claims || []).filter(
      (c) => !this.isEligibleForBatch(batch, c)
    );

    if (validClaims.length === 0) {
      throw HttpError.badRequest(
        'Tidak ada klaim valid yang dapat diteruskan ke VClaim.',
        'NO_FORWARDABLE_CLAIMS'
      );
    }

    const updatedClaims = (batch.claims || []).map((c) => {
      const isPassed = this.isEligibleForBatch(batch, c);
      if (isPassed) {
        return {
          ...c,
          claimStatus: 'COMPLETED',
          workflowStatus: 'COMPLETED',
          processingStatus: 'FORWARDED',
          isForwarded: true,
          forwardedAt: c.forwardedAt || now
        };
      }
      return {
        ...c,
        claimStatus: 'NEEDS_CORRECTION',
        workflowStatus: 'NEEDS_CORRECTION',
        processingStatus: 'PENDING_CORRECTION',
        isForwarded: false
      };
    });

    for (const c of validClaims) {
      const existing = this.claimsRepo.findById(c.id);
      if (existing) {
        await this.claimsRepo.update(c.id, {
          claimStatus: 'COMPLETED',
          workflowStatus: 'COMPLETED',
          processingStatus: 'FORWARDED',
          isForwarded: true,
          forwardedAt: existing.forwardedAt || now,
          updatedAt: now
        });
      }
    }

    const isAllForwarded = pendingCorrections.length === 0;

    const updated = await this.batchRepo.update(batchId, {
      claims: updatedClaims,
      status: isAllForwarded ? 'FORWARDED' : 'PARTIALLY_FORWARDED',
      screeningStatus: 'handed_off',
      handoffStatus: isAllForwarded ? 'marked_forwarded' : 'partially_forwarded',
      forwardedAt: now,
      forwardedClaimsCount: validClaims.length,
      pendingClaimsCount: pendingCorrections.length,
      forwardedClaimIds: validClaims.map((c) => c.id),
      pendingClaimIds: pendingCorrections.map((c) => c.id),
      updatedAt: now
    });

    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'batch',
      entityId: batchId,
      action: isAllForwarded ? 'BATCH_FORWARDED_VCLAIM' : 'BATCH_PARTIALLY_FORWARDED_VCLAIM',
      details: {
        totalClaims: (batch.claims || []).length,
        forwardedCount: validClaims.length,
        pendingCount: pendingCorrections.length,
        forwardedClaimIds: validClaims.map((c) => c.id),
        pendingClaimIds: pendingCorrections.map((c) => c.id)
      },
      createdAt: now
    });

    return updated;
  }

  async updateClaimCorrection(batchId, claimId, payload) {
    const now = new Date().toISOString();
    let targetBatch = null;

    if (batchId) {
      targetBatch = this.getBatchById(batchId);
    } else {
      const allBatches = this.batchRepo.findAll();
      targetBatch = allBatches.find((b) =>
        (b.claims || []).some(
          (c) =>
            c.id === claimId ||
            c.claimId === claimId ||
            (c.id && claimId && c.id.replace('CLM-FKS-', 'CLM-DEMO-') === String(claimId).replace('CLM-FKS-', 'CLM-DEMO-'))
        )
      );
      if (!targetBatch) {
        throw HttpError.notFound(`Claim with ID '${claimId}' not found in any batch`);
      }
    }

    const claims = targetBatch.claims || [];
    const index = claims.findIndex(
      (c) =>
        c.id === claimId ||
        c.claimId === claimId ||
        (c.id && claimId && c.id.replace('CLM-FKS-', 'CLM-DEMO-') === String(claimId).replace('CLM-FKS-', 'CLM-DEMO-'))
    );
    if (index === -1) {
      throw HttpError.notFound(`Claim with ID '${claimId}' not found in batch '${targetBatch.id}'`);
    }

    const currentClaim = claims[index];

    // Handle document upload if present in payload
    let attachedDoc = null;
    if (payload.document) {
      attachedDoc = await this.saveClaimDocument(currentClaim, payload.document, now);
    }

    // Handle dischargeDate and admissionDate updates
    const updatedDischargeDate = payload.dischargeDate || currentClaim.dischargeDate;
    const updatedAdmissionDate = payload.admissionDate || currentClaim.admissionDate;
    let lengthOfStayDays = currentClaim.lengthOfStayDays;
    if (payload.dischargeDate && updatedAdmissionDate) {
      const diff = Math.round(
        (new Date(`${payload.dischargeDate}T00:00:00Z`) - new Date(`${updatedAdmissionDate}T00:00:00Z`)) /
          (1000 * 60 * 60 * 24)
      );
      lengthOfStayDays = Math.max(diff, 0);
    }

    // Merge documents array on claim
    let claimDocs = currentClaim.documents ? [...currentClaim.documents] : [];
    if (attachedDoc) {
      const existingIdx = claimDocs.findIndex(
        (d) => d.id === attachedDoc.id || d.documentType === attachedDoc.documentType
      );
      if (existingIdx >= 0) {
        claimDocs[existingIdx] = attachedDoc;
      } else {
        claimDocs.push(attachedDoc);
      }
    }

    const updatedClaim = {
      ...currentClaim,
      ...payload,
      initialScreeningStatus: currentClaim.initialScreeningStatus || currentClaim.screeningStatus,
      dischargeDate: updatedDischargeDate,
      admissionDate: updatedAdmissionDate,
      lengthOfStayDays,
      correctionNotes: payload.correctionNotes || currentClaim.correctionNotes,
      correctionStatus: payload.correctionStatus || 'ready_for_rescreen',
      internalFollowUpStatus: payload.internalFollowUpStatus || 'recorded',
      lastCorrection: {
        ...payload,
        dischargeDate: updatedDischargeDate,
        admissionDate: updatedAdmissionDate,
        document: attachedDoc || payload.document || null,
        submittedAt: now
      },
      documents: claimDocs.length > 0 ? claimDocs : currentClaim.documents,
      screeningStatus: payload.screeningStatus || currentClaim.screeningStatus,
      screeningFindings: payload.screeningStatus === 'passed' ? [] : currentClaim.screeningFindings,
      updatedAt: now
    };

    claims[index] = updatedClaim;

    await this.batchRepo.update(targetBatch.id, {
      claims,
      updatedAt: now
    });

    // Sync to claimsRepo if claim exists in active claims
    const activeClaim =
      this.claimsRepo.findById(currentClaim.id) ||
      this.claimsRepo.findAll((c) => c.claimId === currentClaim.claimId)[0];
    if (activeClaim) {
      await this.claimsRepo.update(activeClaim.id, {
        ...updatedClaim,
        updatedAt: now
      });
    }

    const { document: uploadedDocument, ...correctionFields } = payload;
    const auditUpdates = { ...correctionFields, document: uploadedDocument ? {
      id: attachedDoc?.id, fileName: attachedDoc?.fileName || uploadedDocument.fileName || uploadedDocument.name,
      documentType: attachedDoc?.documentType || uploadedDocument.documentType,
      size: uploadedDocument.size
    } : null };
    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'claim',
      entityId: currentClaim.claimId || currentClaim.id,
      action: 'BATCH_CLAIM_CORRECTED',
      details: { batchId: targetBatch.id, updates: auditUpdates },
      createdAt: now
    });

    return updatedClaim;
  }

  async rescreenClaim(batchId, claimId) {
    const now = new Date().toISOString();
    let targetBatch = null;

    if (batchId) {
      targetBatch = this.getBatchById(batchId);
    } else {
      const allBatches = this.batchRepo.findAll();
      targetBatch = allBatches.find((b) =>
        (b.claims || []).some(
          (c) =>
            c.id === claimId ||
            c.claimId === claimId ||
            (c.id && claimId && c.id.replace('CLM-FKS-', 'CLM-DEMO-') === String(claimId).replace('CLM-FKS-', 'CLM-DEMO-'))
        )
      );
      if (!targetBatch) {
        throw HttpError.notFound(`Claim with ID '${claimId}' not found in any batch`);
      }
    }

    const claims = targetBatch.claims || [];
    const index = claims.findIndex(
      (c) =>
        c.id === claimId ||
        c.claimId === claimId ||
        (c.id && claimId && c.id.replace('CLM-FKS-', 'CLM-DEMO-') === String(claimId).replace('CLM-FKS-', 'CLM-DEMO-'))
    );
    if (index === -1) {
      throw HttpError.notFound(`Claim with ID '${claimId}' not found in batch '${targetBatch.id}'`);
    }

    const claim = claims[index];
    const findings = this.evaluateClaim(claim, true);
    const isPassed = findings.length === 0;

    claims[index] = {
      ...claim,
      screeningStatus: isPassed ? 'passed' : 'needs_correction',
      screeningFindings: findings,
      correctionStatus: isPassed ? 'completed' : 'pending',
      resubmissionStatus: isPassed ? 'ready' : null,
      workflowStatus: isPassed ? 'VALIDATED' : 'NEEDS_CORRECTION',
      claimStatus: isPassed ? 'VALIDATED' : 'NEEDS_CORRECTION',
      processingStatus: isPassed ? 'READY' : 'PENDING_CORRECTION',
      isValid: isPassed,
      rescreenedAt: now,
      updatedAt: now
    };

    // Update batch summary and status
    const needsCorrectionCount = claims.filter((c) => c.screeningStatus === 'needs_correction').length;
    const passedCount = claims.filter((c) => c.screeningStatus === 'passed').length;
    if (!['ready_to_handoff', 'handed_off'].includes(targetBatch.screeningStatus)) {
      targetBatch.screeningStatus = needsCorrectionCount > 0 ? 'needs_correction' : 'screening_complete';
    }
    targetBatch.summary = {
      totalClaims: claims.length,
      validCount: passedCount,
      invalidCount: needsCorrectionCount
    };

    await this.batchRepo.update(targetBatch.id, {
      claims,
      screeningStatus: targetBatch.screeningStatus,
      summary: targetBatch.summary,
      updatedAt: now
    });

    // Sync to claimsRepo if claim exists in active claims
    const activeClaim =
      this.claimsRepo.findById(claim.id) ||
      this.claimsRepo.findAll((c) => c.claimId === claim.claimId)[0];
    if (activeClaim) {
      await this.claimsRepo.update(activeClaim.id, {
        ...claims[index],
        updatedAt: now
      });
    }

    // Audit log
    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'claim',
      entityId: claim.claimId || claim.id,
      action: 'CLAIM_RESCREENED',
      details: {
        batchId: targetBatch.id,
        passed: isPassed,
        screeningStatus: claims[index].screeningStatus,
        findingsCount: findings.length
      },
      createdAt: now
    });

    return claims[index];
  }

  getReadyResubmissions() {
    return this.batchRepo.findAll().flatMap((batch) => (batch.claims || [])
      .filter((claim) => claim.screeningStatus === 'passed' && claim.correctionStatus === 'completed'
        && claim.rolloverStatus !== 'rolled_over' && !claim.isForwarded
        && (claim.initialScreeningStatus === 'needs_correction' || (!claim.initialScreeningStatus && claim.lastCorrection)))
      .map((claim) => ({ ...claim, sourceBatchId: batch.id, sourceBatchName: batch.name || batch.batchName, sourcePeriod: batch.period })));
  }

  async includeResubmissions({ targetBatchId, selections, period, name }) {
    if (!Array.isArray(selections) || !selections.length) {
      throw HttpError.badRequest('Pilih klaim yang akan diajukan ulang.', 'EMPTY_SELECTION');
    }
    let target = targetBatchId ? this.getBatchById(targetBatchId) : null;
    if (target && target.screeningStatus !== 'draft') {
      throw HttpError.badRequest('Klaim hanya dapat ditambahkan ke batch draft.', 'TARGET_BATCH_CLOSED');
    }
    if (!target && !/^\d{4}-(0[1-9]|1[0-2])$/.test(period || '')) {
      throw HttpError.badRequest('Pilih periode batch yang valid.', 'INVALID_PERIOD');
    }
    const ready = this.getReadyResubmissions();
    const selected = selections.map((item) => ready.find((claim) => claim.sourceBatchId === item.sourceBatchId && claim.id === item.claimId));
    if (selected.some((claim) => !claim) || new Set(selected.map((claim) => claim.id)).size !== selected.length) {
      throw HttpError.badRequest('Pilihan berubah atau sudah diajukan ulang. Muat ulang daftar.', 'INVALID_RESUBMISSION');
    }
    if (target && selected.some((claim) => claim.sourceBatchId === target.id || target.claims.some((existing) => existing.id === claim.id || (existing.claimId && claim.claimId && existing.claimId === claim.claimId)))) {
      throw HttpError.badRequest('Klaim sudah tercatat di batch ini. Pilih batch baru.', 'DUPLICATE_RESUBMISSION');
    }
    if (!target) {
      const now = new Date().toISOString();
      target = await this.batchRepo.create({ id: generateId('BATCH'), name: name?.trim() || `Batch Pengajuan Ulang ${period}`,
        period, billingPeriod: period, periodLabel: period, source: 'Pengajuan Ulang', claims: [], claimIds: [],
        screeningStatus: 'draft', handoffStatus: 'not_ready', status: 'DRAFT', createdAt: now, updatedAt: now });
    }
    for (const claim of selected) {
      await this.rolloverClaim(claim.sourceBatchId, claim.id, { targetBatchId: target.id, targetPeriod: target.period,
        reason: 'Dipilih pengguna untuk diajukan ulang pada batch baru' });
    }
    return this.getBatchById(target.id);
  }

  async rolloverClaim(batchId, claimId, options = {}) {
    const now = new Date().toISOString();
    let sourceBatch = null;

    if (batchId) {
      sourceBatch = this.getBatchById(batchId);
    } else {
      const allBatches = this.batchRepo.findAll();
      sourceBatch = allBatches.find((b) =>
        (b.claims || []).some(
          (c) =>
            c.id === claimId ||
            c.claimId === claimId ||
            (c.id && claimId && c.id.replace('CLM-FKS-', 'CLM-DEMO-') === String(claimId).replace('CLM-FKS-', 'CLM-DEMO-'))
        )
      );
      if (!sourceBatch) {
        throw HttpError.notFound(`Claim with ID '${claimId}' not found in any batch`);
      }
    }

    const claims = sourceBatch.claims || [];
    const index = claims.findIndex(
      (c) =>
        c.id === claimId ||
        c.claimId === claimId ||
        (c.id && claimId && c.id.replace('CLM-FKS-', 'CLM-DEMO-') === String(claimId).replace('CLM-FKS-', 'CLM-DEMO-'))
    );
    if (index === -1) {
      throw HttpError.notFound(`Claim with ID '${claimId}' not found in batch '${sourceBatch.id}'`);
    }

    const claim = claims[index];

    if (claim.rolloverStatus === 'rolled_over') {
      throw HttpError.badRequest('Klaim sudah dipindahkan. Cegah proses ganda.', 'DUPLICATE_ROLLOVER');
    }
    if (claim.isForwarded) {
      throw HttpError.badRequest('Klaim sudah diteruskan dan tidak dapat dipindahkan.', 'CLAIM_ALREADY_FORWARDED');
    }

    // Validation rule: cegah klaim masuk ke batch berikutnya sebelum memenuhi aturan validasi
    if (claim.screeningStatus !== 'passed') {
      throw HttpError.badRequest(
        `Klaim '${claimId}' belum memenuhi aturan validasi (status: ${claim.screeningStatus}). Selesaikan perbaikan dan pastikan klaim lolos screening sebelum rollover.`,
        'ROLLOVER_VALIDATION_FAILED'
      );
    }

    // Determine target batch and period
    const sourcePeriod = sourceBatch.period || sourceBatch.billingPeriod || '2026-10';
    let targetPeriod = options.targetPeriod;
    if (!targetPeriod) {
      const parts = sourcePeriod.split('-');
      if (parts.length === 2) {
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        targetPeriod = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
      } else {
        targetPeriod = `${sourcePeriod}-next`;
      }
    }

    let targetBatchId = options.targetBatchId || `BATCH-DEMO-${targetPeriod.replace('-', '')}`;
    let targetBatch = this.batchRepo.findById(targetBatchId);

    if (targetBatch && targetBatch.screeningStatus !== 'draft') {
      if (options.targetBatchId) throw HttpError.badRequest('Batch tujuan sudah diproses. Pilih batch draft.', 'TARGET_BATCH_CLOSED');
      targetBatchId = `${targetBatchId}-CORRECTIONS`;
      targetBatch = this.batchRepo.findById(targetBatchId);
      if (targetBatch && targetBatch.screeningStatus !== 'draft') {
        targetBatchId = `${targetBatchId}-${generateId('NEXT')}`;
        targetBatch = null;
      }
    }

    // Prevent duplicate processing
    if (
      targetBatch &&
      (targetBatch.claims || []).some((c) => c.id === claim.id || (c.claimId && claim.claimId && c.claimId === claim.claimId))
    ) {
      throw HttpError.badRequest(
        `Klaim '${claimId}' sudah ada pada batch tujuan '${targetBatchId}'. Cegah proses ganda.`,
        'DUPLICATE_ROLLOVER'
      );
    }

    // Audit and rollover history
    const rolloverHistoryEntry = {
      fromBatchId: sourceBatch.id,
      fromPeriod: sourcePeriod,
      toBatchId: targetBatchId,
      toPeriod: targetPeriod,
      rolledOverAt: now,
      previousValidationStatus: claim.screeningStatus,
      correctionHistory: claim.lastCorrection || null,
      reason: options.reason || 'Rollover klaim valid ke batch penagihan berikutnya'
    };

    const rolledOverClaim = {
      ...claim,
      initialScreeningStatus: 'passed',
      rolloverStatus: null,
      isForwarded: false,
      forwardedAt: null,
      finalizedAt: null,
      resubmissionStatus: 'included',
      originalBatchId: claim.originalBatchId || sourceBatch.id,
      batchId: targetBatchId,
      batchName: targetBatch?.name || targetBatch?.batchName || `Batch Pengajuan Ulang ${targetPeriod}`,
      periodLabel: targetBatch?.periodLabel || targetPeriod,
      batchPeriod: targetPeriod,
      billingPeriod: targetPeriod,
      workflowStatus: 'VALIDATED',
      claimStatus: 'VALIDATED',
      processingStatus: 'READY',
      rolloverHistory: [...(claim.rolloverHistory || []), rolloverHistoryEntry],
      isRolledOver: true,
      updatedAt: now
    };

    // If target batch does not exist, create it as draft
    if (!targetBatch) {
      const periodLabel = `Periode ${targetPeriod}`;
      targetBatch = {
        id: targetBatchId,
        batchName: `Batch Klaim ${periodLabel}`,
        name: `Batch Klaim ${periodLabel}`,
        billingPeriod: targetPeriod,
        period: targetPeriod,
        periodLabel,
        sourceType: 'E_CLAIM_IMPORT',
        source: 'Rollover Klaim',
        fileMeta: null,
        status: 'DRAFT',
        screeningStatus: 'draft',
        handoffStatus: 'not_ready',
        claimIds: [rolledOverClaim.id],
        claims: [rolledOverClaim],
        summary: { totalClaims: 1, validCount: 1, invalidCount: 0 },
        finalizedAt: null,
        forwardedAt: null,
        createdAt: now,
        updatedAt: now
      };
      await this.batchRepo.create(targetBatch);
    } else {
      targetBatch.claims = [...(targetBatch.claims || []), rolledOverClaim];
      targetBatch.claimIds = [...new Set([...(targetBatch.claimIds || []), rolledOverClaim.id])];
      const validCount = targetBatch.claims.filter((c) => c.screeningStatus === 'passed').length;
      const invalidCount = targetBatch.claims.length - validCount;
      targetBatch.summary = { totalClaims: targetBatch.claims.length, validCount, invalidCount };
      targetBatch.updatedAt = now;
      await this.batchRepo.update(targetBatch.id, targetBatch);
    }

    // Mark claim in source batch as rolled over
    claims[index] = {
      ...claim,
      rolloverStatus: 'rolled_over',
      resubmissionStatus: 'submitted',
      targetBatchId,
      rolloverHistory: rolledOverClaim.rolloverHistory,
      updatedAt: now
    };
    await this.batchRepo.update(sourceBatch.id, { claims, updatedAt: now });

    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'claim',
      entityId: claim.claimId || claim.id,
      action: 'CLAIM_ROLLOVER',
      details: {
        sourceBatchId: sourceBatch.id,
        targetBatchId,
        claimId: claim.id
      },
      createdAt: now
    });

    return {
      success: true,
      claim: rolledOverClaim,
      sourceBatchId: sourceBatch.id,
      targetBatchId
    };
  }
}

module.exports = BatchService;
