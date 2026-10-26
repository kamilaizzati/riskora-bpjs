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

  async runBatchScreening(batchId) {
    const batch = this.getBatchById(batchId);
    const now = new Date().toISOString();

    // Check existing documents
    const allDocs = this.docsRepo.findAll();

    let needsCorrectionCount = 0;
    const evaluatedClaims = (batch.claims || []).map((claim) => {
      const findings = [];
      const suffix = claim.id.slice(-4);

      // Check document readiness
      const claimDocs = allDocs.filter((d) => d.claimId === claim.id || d.claimId === claim.id.replace('CLM-FKS-', 'CLM-DEMO-'));

      // Deterministic triage rules for demo dataset:
      // Claim 0002: Diabetes Mellitus with high claim amount without HbA1c lab test attached
      if (suffix === '0002') {
        findings.push({
          code: 'clinical_lab_review',
          title: 'Konfirmasi Pemeriksaan Penunjang',
          message: 'Pemeriksaan glukosa/HbA1c berkala disarankan dikonfirmasi pada resume medis rawat inap.',
          severity: 'medium',
          source: 'Resume Medis'
        });
      }

      // Claim 0005: Acute appendicitis surgery -> confirm operation report exists
      if (suffix === '0005') {
        const hasOpReport = claimDocs.some((d) => d.fileName && d.fileName.includes('operation-report'));
        if (!hasOpReport) {
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
        findings.push({
          code: 'care_class_review',
          title: 'Kesesuaian Kelas Rawat',
          message: 'Verifikasi kesesuaian hak kelas rawat peserta dengan penempatan bangsal.',
          severity: 'low',
          source: 'SEP'
        });
      }

      const isPassed = findings.length === 0;
      if (!isPassed) needsCorrectionCount++;

      return {
        ...claim,
        screeningStatus: isPassed ? 'passed' : 'needs_correction',
        screeningFindings: findings,
        correctionStatus: isPassed ? 'not_needed' : 'pending'
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

  async finalizeBatch(batchId) {
    const batch = this.getBatchById(batchId);
    const now = new Date().toISOString();

    const pendingCorrections = (batch.claims || []).filter(
      (c) => c.screeningStatus === 'needs_correction' && c.correctionStatus !== 'completed'
    );
    if (pendingCorrections.length > 0) {
      throw HttpError.badRequest(
        `Selesaikan koreksi pada ${pendingCorrections.length} klaim sebelum finalisasi batch.`,
        'PENDING_CORRECTIONS'
      );
    }

    // Activate claims into claims storage
    for (const c of batch.claims || []) {
      const existingClaim = this.claimsRepo.findById(c.id);
      if (!existingClaim) {
        await this.claimsRepo.create({
          ...c,
          batchId,
          createdAt: now,
          updatedAt: now,
          isDeleted: false
        });
      }
    }

    const updated = await this.batchRepo.update(batchId, {
      status: 'FINALIZED',
      screeningStatus: 'ready_to_handoff',
      handoffStatus: 'ready',
      finalizedAt: now,
      updatedAt: now
    });

    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'batch',
      entityId: batchId,
      action: 'BATCH_FINALIZED',
      details: { totalClaims: (batch.claims || []).length },
      createdAt: now
    });

    return updated;
  }

  async markBatchForwarded(batchId) {
    const batch = this.getBatchById(batchId);
    const now = new Date().toISOString();

    const updated = await this.batchRepo.update(batchId, {
      status: 'FORWARDED',
      screeningStatus: 'handed_off',
      handoffStatus: 'marked_forwarded',
      forwardedAt: now,
      updatedAt: now
    });

    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'batch',
      entityId: batchId,
      action: 'BATCH_FORWARDED_VCLAIM',
      details: { totalClaims: (batch.claims || []).length },
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
      targetBatch = allBatches.find((b) => (b.claims || []).some((c) => c.id === claimId));
      if (!targetBatch) {
        throw HttpError.notFound(`Claim with ID '${claimId}' not found in any batch`);
      }
    }

    const claims = targetBatch.claims || [];
    const index = claims.findIndex((c) => c.id === claimId);
    if (index === -1) {
      throw HttpError.notFound(`Claim with ID '${claimId}' not found in batch '${targetBatch.id}'`);
    }

    const currentClaim = claims[index];
    const updatedClaim = {
      ...currentClaim,
      correctionStatus: payload.correctionStatus || 'corrected',
      internalFollowUpStatus: payload.internalFollowUpStatus || 'recorded',
      lastCorrection: {
        ...payload,
        submittedAt: now
      },
      screeningStatus: payload.screeningStatus || 'passed',
      screeningFindings: payload.screeningStatus === 'passed' ? [] : currentClaim.screeningFindings
    };

    claims[index] = updatedClaim;

    await this.batchRepo.update(targetBatch.id, {
      claims,
      updatedAt: now
    });

    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'claim',
      entityId: claimId,
      action: 'BATCH_CLAIM_CORRECTED',
      details: { batchId: targetBatch.id, updates: payload },
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
      targetBatch = allBatches.find((b) => (b.claims || []).some((c) => c.id === claimId));
      if (!targetBatch) {
        throw HttpError.notFound(`Claim with ID '${claimId}' not found in any batch`);
      }
    }

    const claims = targetBatch.claims || [];
    const index = claims.findIndex((c) => c.id === claimId);
    if (index === -1) {
      throw HttpError.notFound(`Claim with ID '${claimId}' not found in batch '${targetBatch.id}'`);
    }

    claims[index] = {
      ...claims[index],
      screeningStatus: 'passed',
      screeningFindings: [],
      correctionStatus: 'completed'
    };

    await this.batchRepo.update(targetBatch.id, {
      claims,
      updatedAt: now
    });

    return claims[index];
  }
}

module.exports = BatchService;
