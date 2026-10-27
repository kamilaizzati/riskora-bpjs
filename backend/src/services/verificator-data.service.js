const path = require('path');
const fs = require('fs');
const JsonRepository = require('../repositories/json.repository');
const HttpError = require('../utils/http-error');
const { loadSeedClaimsFile } = require('../utils/seed-claims-parser');
const { isCleanState } = require('./clean-state.service');

class VerificatorDataService {
  constructor(customDataDir = null) {
    this.customDataDir = customDataDir || path.join(__dirname, '../data');
    this.claimsRepo = new JsonRepository('claims.json', this.customDataDir);
    this.batchesRepo = new JsonRepository('submission-batches.json', this.customDataDir);
    this.findingsRepo = new JsonRepository('fraud-findings.json', this.customDataDir);
    this.analysisRepo = new JsonRepository('analysis-runs.json', this.customDataDir);
    this.reviewsRepo = new JsonRepository('claim-reviews.json', this.customDataDir);
    this.docsRepo = new JsonRepository('claim-documents.json', this.customDataDir);
    this._cachedSeedClaims = null;
  }

  isCleanStateMode() {
    const defaultDataDir = path.resolve(__dirname, '../data');
    const currentDir = path.resolve(this.customDataDir || defaultDataDir);
    // In normal application mode, clean-state mode is NEVER active
    if (currentDir === defaultDataDir) {
      return false;
    }
    // In isolated test environments, only active when explicitly marked
    return fs.existsSync(path.join(this.customDataDir, '.strict_clean_state'));
  }

  getSeedClaims() {
    if (this.isCleanStateMode()) {
      return [];
    }

    if (this._cachedSeedClaims && Array.isArray(this._cachedSeedClaims)) {
      return this._cachedSeedClaims;
    }

    try {
      const parsed = loadSeedClaimsFile();
      this._cachedSeedClaims = (parsed.claims || []).map((c) => ({
        ...c,
        isSeed: true
      }));
      return this._cachedSeedClaims;
    } catch (err) {
      console.warn('[VerificatorDataService] Seed claims file not loaded:', err.message);
      return [];
    }
  }

  getEligibleCasemixClaims() {
    const batches = this.batchesRepo.findAll();
    const eligible = [];
    const seenIds = new Set();

    for (const b of batches) {
      if (b.status === 'DRAFT' || b.screeningStatus === 'draft') continue;
      if (!Array.isArray(b.claims)) continue;

      for (const c of b.claims) {
        if (c.isDeleted) continue;
        if (c.rolloverStatus === 'rolled_over') continue;
        if (c.screeningStatus === 'needs_correction') continue;
        if (c.screeningStatus !== 'passed') continue;

        const claimId = c.id || c.claimId;
        if (!claimId || seenIds.has(claimId)) continue;
        seenIds.add(claimId);

        eligible.push({
          ...c,
          id: claimId,
          claimId,
          batchId: c.batchId || b.id,
          batchName: c.batchName || b.name || b.batchName
        });
      }
    }

    return eligible;
  }

  getExistingClaims() {
    return this.claimsRepo.findAll(
      (c) => !c.isDeleted && c.screeningStatus !== 'needs_correction'
    );
  }

  _getRunsMap() {
    try {
      const allRuns = this.analysisRepo.readAll();
      const map = new Map();
      for (const run of allRuns) {
        const existing = map.get(run.claimId);
        if (!existing || new Date(run.createdAt) > new Date(existing.createdAt)) {
          map.set(run.claimId, run);
        }
      }
      return map;
    } catch {
      return new Map();
    }
  }

  _getFindingsMap() {
    try {
      const allFindings = this.findingsRepo.findAll();
      const map = new Map();
      for (const f of allFindings) {
        const k = String(f.claimId || '');
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(f);
      }
      return map;
    } catch {
      return new Map();
    }
  }

  mapClaimToVerificator(claim, analysis = null, findings = []) {
    let riskCategory = 'low';
    if (claim.riskLevel) {
      riskCategory = claim.riskLevel.toLowerCase();
    } else if (analysis?.riskCategory) {
      riskCategory = analysis.riskCategory.toLowerCase();
    } else if (typeof claim.riskScore === 'number') {
      riskCategory = claim.riskScore > 70 ? 'high' : claim.riskScore > 40 ? 'medium' : 'low';
    }

    let riskScore = 28;
    if (typeof claim.riskScore === 'number' && claim.riskScore > 0) {
      riskScore = claim.riskScore;
    } else if (typeof analysis?.riskScore === 'number') {
      riskScore = analysis.riskScore;
    } else {
      riskScore = riskCategory === 'high' ? 89 : riskCategory === 'medium' ? 64 : 28;
    }

    let status = claim.status || 'pending_verification';
    const wf = (claim.workflowStatus || '').toUpperCase();
    if (wf === 'INVESTIGATION') status = 'needs_investigation';
    else if (wf === 'UNDER_REVIEW') status = 'in_review';
    else if (wf === 'COMPLETED') status = 'completed';
    else if (wf === 'SUBMITTED' || wf === 'VALIDATED') status = 'pending_verification';

    const anomalyTypes = (Array.isArray(claim.anomalyTypes) && claim.anomalyTypes.length > 0)
      ? claim.anomalyTypes
      : (findings.length > 0
          ? [...new Set(findings.map((f) => f.title || f.findingType || 'Upcoding'))]
          : [riskCategory === 'high' ? 'Indikasi Upcoding' : riskCategory === 'medium' ? 'Indikasi Unbundling' : 'Ketidaksesuaian']);

    const billingBreakdown = claim.billingBreakdown || {
      items: [
        { name: 'Akomodasi Rawat Inap', amount: Math.round(Number(claim.claimAmount || 0) * 0.25) },
        { name: 'Tindakan dan Jasa Medis', amount: Math.round(Number(claim.claimAmount || 0) * 0.35) },
        { name: 'Farmasi dan Alat Kesehatan', amount: Math.round(Number(claim.claimAmount || 0) * 0.2) },
        { name: 'Pemeriksaan Penunjang', amount: Math.round(Number(claim.claimAmount || 0) * 0.2) }
      ],
      total: Number(claim.claimAmount || 0)
    };

    return {
      id: claim.id,
      claimId: claim.id,
      noRm: claim.noRm || `RM-2026-${String(claim.id).slice(-6)}`,
      sepNumber: claim.noSep || claim.sepNumber || `SEP-${claim.id.slice(-6)}`,
      facilityName: claim.facilityName || 'RSUP Dr. Sardjito',
      facilityMeta: claim.facilityMeta || `${claim.facilityName || 'Faskes'} (Tipe A)`,
      careType: claim.careType || (claim.serviceType === 'INPATIENT' ? `Rawat Inap • ${claim.serviceClass || 'Kls 1'}` : `Rawat Jalan • ${claim.serviceClass || 'Poli'}`),
      serviceDate: claim.serviceDate || '2026-10-23',
      admissionDate: claim.admissionDate || claim.serviceDate || '2026-10-20',
      dischargeDate: claim.dischargeDate || claim.serviceDate || '2026-10-23',
      lengthOfStay: Number(claim.lengthOfStay ?? claim.lengthOfStayDays ?? 3),
      inaCbgCode: claim.inacbgCode || claim.submittedInaCbgCode || 'I-4-10-III',
      claimAmount: Number(claim.claimAmount) || 0,
      primaryDiagnosis: claim.primaryDiagnosis || { code: 'I63.9', description: 'Stroke Iskemik Akut' },
      secondaryDiagnoses: claim.secondaryDiagnoses || [],
      procedures: claim.procedures || [],
      billingBreakdown,
      anomalyTypes,
      riskLevel: riskCategory,
      riskScore,
      status,
      workflowStatus: claim.workflowStatus || (status === 'completed' ? 'COMPLETED' : 'SUBMITTED'),
      isSeed: Boolean(claim.isSeed)
    };
  }

  /**
   * Single aggregation path shared by the Verificator dashboard and the anomaly network graph.
   * Returns the raw (unmapped) merged claims:
   *   1. Transaction claims in claims.json (highest priority; review/verification state lives here)
   *   2. Eligible Casemix batch claims (screening passed, not rolled over, not deleted)
   *   3. Seed claims parsed from mock_claims_seed_data_20_cases.md (in-memory only, never persisted here)
   * Deduplicated by claim ID and SEP number. Claims that are soft-deleted or flagged
   * needs_correction in claims.json block same-ID/SEP entries from lower-priority sources.
   */
  getMergedRawClaims() {
    const allRepoClaims = this.claimsRepo.findAll();
    const casemixClaims = this.getEligibleCasemixClaims();
    const seedClaims = this.getSeedClaims();

    const mergedMap = new Map();
    const seenSeps = new Set();
    const blockedIds = new Set();
    const blockedSeps = new Set();

    // 1. Existing verified/transaction claims from claimsRepo have top priority
    for (const c of allRepoClaims) {
      const claimId = String(c.id || c.claimId);
      const sep = c.noSep || c.sepNumber;
      if (c.isDeleted || c.screeningStatus === 'needs_correction') {
        // Respect deletion / correction state: do not resurrect this claim from other sources
        blockedIds.add(claimId);
        if (sep) blockedSeps.add(String(sep));
        continue;
      }
      mergedMap.set(claimId, c);
      if (sep) seenSeps.add(String(sep));
    }

    const isBlockedOrSeen = (claimId, sep) =>
      mergedMap.has(claimId) ||
      blockedIds.has(claimId) ||
      (sep && (seenSeps.has(String(sep)) || blockedSeps.has(String(sep))));

    // 2. Eligible Casemix claims not yet in claimsRepo
    for (const c of casemixClaims) {
      const claimId = String(c.id || c.claimId);
      const sep = c.noSep || c.sepNumber;
      if (isBlockedOrSeen(claimId, sep)) continue;
      mergedMap.set(claimId, c);
      if (sep) seenSeps.add(String(sep));
    }

    // 3. Valid seed claims (deduplicated by claimId and sepNumber)
    for (const s of seedClaims) {
      const claimId = String(s.id || s.claimId);
      const sep = s.noSep || s.sepNumber;
      // Do not overwrite existing transaction claim with static seed data!
      if (isBlockedOrSeen(claimId, sep)) continue;
      mergedMap.set(claimId, s);
      if (sep) seenSeps.add(String(sep));
    }

    return Array.from(mergedMap.values());
  }

  getAggregatedClaims(filters = {}) {
    const runsMap = this._getRunsMap();
    const findingsMap = this._getFindingsMap();

    let mapped = this.getMergedRawClaims().map((raw) => {
      const claimId = String(raw.id || raw.claimId);
      const analysis = runsMap.get(claimId);
      const findings = findingsMap.get(claimId) || [];
      return this.mapClaimToVerificator(raw, analysis, findings);
    });

    const { search, riskLevel, status, anomaly } = filters;
    if (search) {
      const q = search.toLowerCase();
      mapped = mapped.filter((c) =>
        c.sepNumber?.toLowerCase().includes(q) ||
        c.facilityName?.toLowerCase().includes(q) ||
        c.primaryDiagnosis?.description?.toLowerCase().includes(q) ||
        c.primaryDiagnosis?.code?.toLowerCase().includes(q)
      );
    }

    if (riskLevel && riskLevel !== 'all') {
      mapped = mapped.filter((c) => c.riskLevel === riskLevel.toLowerCase());
    }

    if (status && status !== 'all') {
      mapped = mapped.filter((c) => c.status === status);
    }

    if (anomaly && anomaly !== 'all') {
      mapped = mapped.filter((c) => Array.isArray(c.anomalyTypes) && c.anomalyTypes.includes(anomaly));
    }

    return mapped;
  }

  getSummaryMetrics() {
    const claims = this.getAggregatedClaims();

    let pendingVerification = 0;
    let highRisk = 0;
    let inReview = 0;
    let completed = 0;

    for (const claim of claims) {
      if (claim.riskLevel === 'high') {
        highRisk++;
      }

      if (claim.status === 'completed' || claim.workflowStatus === 'COMPLETED') {
        completed++;
      } else if (claim.status === 'in_review' || claim.status === 'needs_investigation' || claim.workflowStatus === 'UNDER_REVIEW' || claim.workflowStatus === 'INVESTIGATION') {
        inReview++;
      } else {
        pendingVerification++;
      }
    }

    return {
      success: true,
      pendingVerification,
      highRisk,
      inReview,
      completed,
      totalClaims: claims.length
    };
  }

  getPriorityClaims(filters = {}) {
    const claims = this.getAggregatedClaims(filters);
    return claims.sort((a, b) => b.riskScore - a.riskScore);
  }

  getClaimById(id) {
    const cleanId = typeof id === 'string' && id.startsWith('claim:') ? id.slice(6) : String(id).trim();
    const claims = this.getAggregatedClaims();

    const claim = claims.find(
      (c) => c.id === cleanId || c.claimId === cleanId || c.sepNumber === cleanId || c.noSep === cleanId
    );

    if (!claim) {
      throw HttpError.notFound(`Claim with ID '${id}' not found`);
    }

    // Load actual or fallback documents
    const rawDocs = this.docsRepo.findAll(
      (d) => d.claimId === claim.id || d.claimId === cleanId || d.claimId === claim.sepNumber
    );

    const docTypeToFrontendId = {
      discharge_summary: 'medical-summary',
      medical_resume: 'medical-summary',
      supporting_test_result: 'laboratory',
      lab_result: 'laboratory',
      hospital_bill: 'billing'
    };
    const docTypeToLabel = {
      'medical-summary': 'Resume Medis',
      laboratory: 'Hasil Laboratorium',
      billing: 'Rincian Tagihan'
    };

    let mappedDocs = [];
    const usedFrontendIds = new Set();

    if (rawDocs && rawDocs.length > 0) {
      for (const d of rawDocs) {
        const fid = docTypeToFrontendId[d.documentType];
        if (fid && !usedFrontendIds.has(fid)) {
          usedFrontendIds.add(fid);
          mappedDocs.push({
            id: fid,
            label: docTypeToLabel[fid] || d.displayName || d.documentType,
            type: d.documentType,
            pages: fid === 'laboratory' ? 1 : 2,
            downloadUrl: `/api/documents/${d.id}/preview`
          });
        }
      }
    }

    for (const [fid, label] of Object.entries(docTypeToLabel)) {
      if (!usedFrontendIds.has(fid)) {
        mappedDocs.push({ id: fid, label, pages: fid === 'laboratory' ? 1 : 2 });
      }
    }

    const order = ['medical-summary', 'laboratory', 'billing'];
    mappedDocs.sort((a, b) => {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    // Load actual or fallback findings
    const claimKeys = new Set([claim.id, cleanId, claim.sepNumber, claim.noSep].filter(Boolean));
    const rawFindings = this.findingsRepo.findAll((f) => claimKeys.has(String(f.claimId)));

    let mappedFindings = [];
    if (rawFindings && rawFindings.length > 0) {
      mappedFindings = rawFindings.map((f, idx) => ({
        id: f.id || `TM-${String(idx + 1).padStart(2, '0')}`,
        evidenceId: `evidence-${idx + 1}`,
        category: f.title || f.findingType || 'Ketidaksesuaian Klinis',
        severity: (f.severity || 'high').toLowerCase(),
        source: 'Resume Medis (Hal. 1)',
        reference: f.id,
        description: f.description || 'Pemeriksaan kesesuaian klinis diperlukan terhadap dokumen resume medis.'
      }));
    } else {
      const anomalyName = claim.anomalyTypes?.[0] || 'Ketidaksesuaian Klinis';
      mappedFindings = [
        {
          id: 'TM-01',
          evidenceId: 'evidence-1',
          category: anomalyName,
          severity: claim.riskLevel === 'high' ? 'high' : 'medium',
          source: 'Resume Medis (Hal. 1)',
          reference: 'SN-CLINICAL-02',
          description: `Diagnosis ${claim.primaryDiagnosis?.description || 'utama'} (${claim.primaryDiagnosis?.code || 'ICD-10'}) memerlukan konfirmasi kesesuaian dengan bukti penunjang medis.`
        }
      ];
    }

    return {
      ...claim,
      documents: mappedDocs,
      findings: mappedFindings
    };
  }

  getAnomalyDistribution() {
    const claims = this.getAggregatedClaims();
    const counts = {
      'Upcoding': 0,
      'Unbundling': 0,
      'Repeat Billing': 0,
      'Phantom Billing': 0
    };

    for (const c of claims) {
      const types = Array.isArray(c.anomalyTypes) ? c.anomalyTypes : [];
      for (const t of types) {
        const str = String(t);
        if (str.includes('Upcoding')) counts['Upcoding']++;
        else if (str.includes('Unbundling')) counts['Unbundling']++;
        else if (str.includes('Repeat') || str.includes('Duplikasi')) counts['Repeat Billing']++;
        else if (str.includes('Phantom')) counts['Phantom Billing']++;
        else counts['Upcoding']++;
      }
    }

    return [
      { name: 'Upcoding', value: counts['Upcoding'], color: '#166534' },
      { name: 'Unbundling', value: counts['Unbundling'], color: '#22A06B' },
      { name: 'Repeat Billing', value: counts['Repeat Billing'], color: '#D97706' },
      { name: 'Phantom Billing', value: counts['Phantom Billing'], color: '#DC2626' }
    ];
  }
}

module.exports = VerificatorDataService;
