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

  async uploadBatch({ content, period = '2026-10', batchName = null, fileName = 'demo_batch_sardjito_oktober_2026.txt', useDemoFile = false }) {
    let rawContent = content;

    // Load from workspace disk if demo flag is set or content is empty
    if (useDemoFile || !rawContent) {
      const possibleLocations = [
        path.resolve(this.customDataDir, 'demo_batch_sardjito_oktober_2026.txt'),
        path.resolve(process.cwd(), 'demo_batch_sardjito_oktober_2026.txt'),
        path.resolve(process.cwd(), '../demo_batch_sardjito_oktober_2026.txt'),
        path.resolve(__dirname, '../../../demo_batch_sardjito_oktober_2026.txt'),
        'D:\\KADA-2026\\GITHUB SC\\riskora-bpjs\\demo_batch_sardjito_oktober_2026.txt'
      ];

      for (const loc of possibleLocations) {
        if (fs.existsSync(loc)) {
          rawContent = fs.readFileSync(loc, 'utf8');
          fileName = path.basename(loc);
          break;
        }
      }

      if (!rawContent) {
        throw HttpError.notFound('Demo file demo_batch_sardjito_oktober_2026.txt was not found on server');
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
        batchPeriod: row.batchPeriod || period,
        screeningStatus: 'not_screened',
        screeningFindings: [],
        correctionStatus: 'not_started',
        isSynthetic: true
      };
    });

    const batchId = `BATCH-DEMO-${period.replace('-', '')}`;
    const periodLabel = period === '2026-10' ? 'Oktober 2026' : period;
    const resolvedName = batchName && batchName.trim() ? batchName.trim() : `Batch Klaim ${periodLabel}`;
    const now = new Date().toISOString();

    const batch = {
      id: batchId,
      batchName: resolvedName,
      name: resolvedName,
      billingPeriod: period,
      period,
      periodLabel,
      sourceType: 'E_CLAIM_IMPORT',
      source: 'Data Klaim Simulasi',
      fileMeta: {
        name: fileName,
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
      details: { totalClaims: mappedClaims.length, fileName },
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

    const updatedBatch = await this.batchRepo.update(batchId, {
      claims: evaluatedClaims,
      screeningStatus,
      status: 'SCREENED',
      updatedAt: now
    });

    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'batch',
      entityId: batchId,
      action: 'BATCH_PRESCREENED',
      details: { totalClaims: evaluatedClaims.length, needsCorrectionCount },
      createdAt: now
    });

    return updatedBatch;
  }

  async updateClaimCorrection(batchId, claimId, updates) {
    let batch;
    if (batchId) {
      batch = this.getBatchById(batchId);
    } else {
      const batches = this.batchRepo.findAll();
      batch = batches.find((b) => (b.claims || []).some((c) => c.id === claimId));
      if (!batch) throw HttpError.notFound(`Claim '${claimId}' not found in any batch`);
    }

    const claimIndex = (batch.claims || []).findIndex((c) => c.id === claimId);
    if (claimIndex < 0) throw HttpError.notFound(`Claim '${claimId}' not found in batch '${batch.id}'`);

    const currentClaim = batch.claims[claimIndex];
    const updatedClaim = {
      ...currentClaim,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    batch.claims[claimIndex] = updatedClaim;
    await this.batchRepo.update(batch.id, { claims: batch.claims, updatedAt: new Date().toISOString() });
    return updatedClaim;
  }

  async rescreenClaim(batchId, claimId) {
    let batch;
    if (batchId) {
      batch = this.getBatchById(batchId);
    } else {
      const batches = this.batchRepo.findAll();
      batch = batches.find((b) => (b.claims || []).some((c) => c.id === claimId));
      if (!batch) throw HttpError.notFound(`Claim '${claimId}' not found in any batch`);
    }

    const claimIndex = (batch.claims || []).findIndex((c) => c.id === claimId);
    if (claimIndex < 0) throw HttpError.notFound(`Claim '${claimId}' not found in batch '${batch.id}'`);

    const claim = batch.claims[claimIndex];
    const resolvedClaim = {
      ...claim,
      screeningStatus: 'passed',
      screeningFindings: [],
      correctionStatus: 'completed',
      rescreenedAt: new Date().toISOString()
    };

    batch.claims[claimIndex] = resolvedClaim;

    // Check if any claim still needs correction in batch
    const stillNeedsCorrection = batch.claims.some((c) => c.screeningStatus === 'needs_correction' && c.correctionStatus !== 'completed');
    const screeningStatus = stillNeedsCorrection ? 'needs_correction' : 'ready_to_handoff';

    const updatedBatch = await this.batchRepo.update(batch.id, {
      claims: batch.claims,
      screeningStatus,
      updatedAt: new Date().toISOString()
    });

    return {
      claim: resolvedClaim,
      batch: updatedBatch
    };
  }

  async finalizeBatch(batchId) {
    const batch = this.getBatchById(batchId);
    const pendingClaims = (batch.claims || []).filter(
      (c) => c.screeningStatus === 'needs_correction' && c.correctionStatus !== 'completed'
    );

    if (pendingClaims.length > 0) {
      throw HttpError.badRequest('Selesaikan koreksi dan pemeriksaan ulang sebelum finalisasi.');
    }

    const now = new Date().toISOString();

    // Upsert all batch claims into claims.json
    for (const c of batch.claims || []) {
      const existing = this.claimsRepo.findById(c.id);
      const claimPayload = {
        ...c,
        batchId: batch.id,
        workflowStatus: 'SUBMITTED',
        status: 'SUBMITTED',
        isDeleted: false,
        updatedAt: now
      };

      if (existing) {
        await this.claimsRepo.update(c.id, claimPayload);
      } else {
        await this.claimsRepo.create(claimPayload);
      }
    }

    const updatedBatch = await this.batchRepo.update(batchId, {
      screeningStatus: 'ready_to_handoff',
      handoffStatus: 'ready',
      status: 'FINALIZED',
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

    return updatedBatch;
  }

  async markBatchForwarded(batchId) {
    const batch = this.getBatchById(batchId);
    const now = new Date().toISOString();

    const updatedBatch = await this.batchRepo.update(batchId, {
      screeningStatus: 'handed_off',
      handoffStatus: 'marked_forwarded',
      forwardedAt: now,
      updatedAt: now
    });

    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'batch',
      entityId: batchId,
      action: 'BATCH_FORWARDED_VCLAIM_RECORDED',
      details: { batchId },
      createdAt: now
    });

    return updatedBatch;
  }
}

module.exports = BatchService;
