const { getAnomalyTypes } = require('../utils/anomaly-types');
const JsonRepository = require('../repositories/json.repository');
const HttpError = require('../utils/http-error');
const { generateId } = require('../utils/id-generator');
const riskEngine = require('./risk-engine.service');
const DocumentService = require('./document.service');

class ClaimService {
  constructor(customDataDir = null) {
    this.claimsRepo = new JsonRepository('claims.json', customDataDir);
    this.facilitiesRepo = new JsonRepository('facilities.json', customDataDir);
    this.docsRepo = new JsonRepository('claim-documents.json', customDataDir);
    this.analysisRepo = new JsonRepository('analysis-runs.json', customDataDir);
    this.findingsRepo = new JsonRepository('fraud-findings.json', customDataDir);
    this.auditRepo = new JsonRepository('audit-logs.json', customDataDir);
    this.reviewsRepo = new JsonRepository('claim-reviews.json', customDataDir);
  }

  /**
   * Helper to attach latest analysis score and category to claims
   */
  _enrichClaimsWithLatestAnalysis(claims) {
    const allRuns = this.analysisRepo.readAll();
    const runsByClaim = new Map();

    for (const run of allRuns) {
      const existing = runsByClaim.get(run.claimId);
      if (!existing || new Date(run.createdAt) > new Date(existing.createdAt)) {
        runsByClaim.set(run.claimId, run);
      }
    }

    return claims.map((claim) => {
      const latestRun = runsByClaim.get(claim.id);
      return {
        ...claim,
        latestAnalysis: latestRun
          ? {
              analysisRunId: latestRun.id,
              riskScore: latestRun.riskScore,
              riskCategory: latestRun.riskCategory,
              scoringMethod: latestRun.scoringMethod,
              isMockResult: latestRun.isMockResult,
              createdAt: latestRun.createdAt
            }
          : null
      };
    });
  }

  /**
   * List claims with pagination, filtering, searching and sorting
   */
  getClaims(params = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      riskCategory,
      workflowStatus,
      serviceType,
      facilityId,
      search,
      dateFrom,
      dateTo
    } = params;

    // Load active claims
    let claims = this.claimsRepo.findAll((c) => !c.isDeleted);
    claims = this._enrichClaimsWithLatestAnalysis(claims);

    // Filter by workflowStatus
    if (workflowStatus) {
      claims = claims.filter((c) => (c.workflowStatus || '').toUpperCase() === workflowStatus.toUpperCase());
    }

    // Filter by serviceType
    if (serviceType) {
      claims = claims.filter((c) => (c.serviceType || '').toUpperCase() === serviceType.toUpperCase());
    }

    // Filter by facilityId
    if (facilityId) {
      claims = claims.filter((c) => String(c.facilityId) === String(facilityId));
    }

    // Filter by riskCategory (from latest analysis)
    if (riskCategory) {
      claims = claims.filter((c) => c.latestAnalysis && c.latestAnalysis.riskCategory === riskCategory.toUpperCase());
    }

    // Filter by date range (serviceDate)
    if (dateFrom) {
      claims = claims.filter((c) => c.serviceDate && c.serviceDate >= dateFrom);
    }
    if (dateTo) {
      claims = claims.filter((c) => c.serviceDate && c.serviceDate <= dateTo);
    }

    // Search across synthetic SEP, record number, and facility name
    if (search) {
      const query = search.toLowerCase();
      claims = claims.filter((c) =>
        (c.noSep && c.noSep.toLowerCase().includes(query)) ||
        (c.noRm && c.noRm.toLowerCase().includes(query)) ||
        (c.facilityName && c.facilityName.toLowerCase().includes(query)) ||
        (c.primaryDiagnosis?.description && c.primaryDiagnosis.description.toLowerCase().includes(query))
      );
    }

    // Total count before pagination
    const totalRecords = claims.length;
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    // Sorting
    claims.sort((a, b) => {
      let valA;
      let valB;

      if (sortBy === 'riskScore') {
        valA = a.latestAnalysis?.riskScore ?? -1;
        valB = b.latestAnalysis?.riskScore ?? -1;
      } else if (sortBy === 'claimAmount') {
        valA = a.claimAmount || 0;
        valB = b.claimAmount || 0;
      } else if (sortBy === 'serviceDate') {
        valA = a.serviceDate || '';
        valB = b.serviceDate || '';
      } else {
        // default createdAt
        valA = new Date(a.createdAt || 0).getTime();
        valB = new Date(b.createdAt || 0).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedClaims = claims.slice(startIndex, startIndex + limit);

    return {
      claims: paginatedClaims,
      meta: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Get single claim by ID with related context (documents, findings, reviews, and normalized fields)
   */
  getClaimById(id) {
    if (typeof id === 'string' && id.startsWith('claim:')) {
      id = id.slice(6);
    }
    let claim = this.claimsRepo.findById(id);
    if (!claim || claim.isDeleted) {
      claim =
        this.claimsRepo.findAll(
          (c) => !c.isDeleted && (c.id === id || c.claimId === id || c.noSep === id || c.sepNumber === id)
        )[0] || null;
    }
    // Also check if id is an alias (e.g. claim-001 -> maps to 1st claim, or CLM-DEMO-202610-0001)
    if (!claim || claim.isDeleted) {
      const match = String(id).match(/^(?:claim|CLM-(?:FKS|DEMO)-\d{6})-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        const allClaims = this.claimsRepo.findAll((c) => !c.isDeleted);
        if (num > 0 && num <= allClaims.length) {
          claim = allClaims[num - 1];
        }
      }
    }
    // Also check submission batches if not in claimsRepo yet
    if (!claim) {
      const batchesRepo = new JsonRepository('submission-batches.json', this.claimsRepo.dataDir);
      const batches = batchesRepo.findAll();
      for (const batch of batches) {
        const found = (batch.claims || []).find((c) => c.id === id || c.claimId === id || c.noSep === id || c.sepNumber === id);
        if (found) {
          claim = found;
          break;
        }
      }
    }
    // Check seed claims from mock_claims_seed_data_20_cases.md
    if (!claim) {
      try {
        const VerificatorDataService = require('./verificator-data.service');
        const vService = new VerificatorDataService(this.claimsRepo.dataDir);
        const seedClaims = vService.getSeedClaims();
        claim = seedClaims.find((c) => c.id === id || c.claimId === id || c.noSep === id || c.sepNumber === id) || null;
      } catch (e) {}
    }

    if (!claim || claim.isDeleted) {
      throw HttpError.notFound(`Claim with ID '${id}' not found`);
    }

    const [enriched] = this._enrichClaimsWithLatestAnalysis([claim]);

    // Attach related documents, findings, and reviews
    const docService = new DocumentService(this.claimsRepo.dataDir);
    const rawDocs = docService.getDocuments(claim.id);
    const findings = this.findingsRepo.findAll((f) => String(f.claimId) === String(claim.id));
    const reviews = this.reviewsRepo.findAll((r) => String(r.claimId) === String(claim.id));

    // Normalize risk category and score
    let riskCategory = (enriched.latestAnalysis?.riskCategory || (claim.riskScore > 70 ? 'HIGH' : claim.riskScore > 40 ? 'MEDIUM' : 'LOW')).toLowerCase();
    let riskScore = enriched.latestAnalysis?.riskScore ?? (claim.riskScore || (riskCategory === 'high' ? 89 : riskCategory === 'medium' ? 64 : 28));

    if (findings.some((f) => (f.severity || '').toUpperCase() === 'HIGH') && riskCategory === 'low') {
      riskCategory = 'high';
      riskScore = Math.max(riskScore, 85);
    } else if (findings.some((f) => (f.severity || '').toUpperCase() === 'MEDIUM') && riskCategory === 'low') {
      riskCategory = 'medium';
      riskScore = Math.max(riskScore, 60);
    }

    let status = 'pending_verification';
    const wf = (claim.workflowStatus || '').toUpperCase();
    if (wf === 'INVESTIGATION') status = 'needs_investigation';
    else if (wf === 'UNDER_REVIEW') status = 'in_review';
    else if (wf === 'COMPLETED') status = 'completed';

    const anomalyTypes = getAnomalyTypes(claim, findings);

    // Map documents ensuring standard IDs ('medical-summary', 'laboratory', 'billing') exist for DocumentViewer
    const documents = [
      {
        id: 'medical-summary',
        label: 'Resume Medis',
        type: 'discharge_summary',
        pages: 2,
        previewUrl: rawDocs.find((d) => (d.documentType || '').includes('discharge') || (d.documentType || '').includes('summary'))?.previewUrl || null,
        downloadUrl: rawDocs.find((d) => (d.documentType || '').includes('discharge') || (d.documentType || '').includes('summary'))?.previewUrl || null
      },
      {
        id: 'laboratory',
        label: 'Hasil Laboratorium',
        type: 'supporting_test_result',
        pages: 1,
        previewUrl: rawDocs.find((d) => (d.documentType || '').includes('test') || (d.documentType || '').includes('lab'))?.previewUrl || null,
        downloadUrl: rawDocs.find((d) => (d.documentType || '').includes('test') || (d.documentType || '').includes('lab'))?.previewUrl || null
      },
      {
        id: 'billing',
        label: 'Rincian Tagihan',
        type: 'hospital_bill',
        pages: 2,
        previewUrl: rawDocs.find((d) => (d.documentType || '').includes('bill'))?.previewUrl || null,
        downloadUrl: rawDocs.find((d) => (d.documentType || '').includes('bill'))?.previewUrl || null
      }
    ];

    // Append any additional raw docs from backend
    for (const d of rawDocs) {
      if (!documents.some((doc) => doc.label === d.fileName || doc.type === d.documentType)) {
        documents.push({
          id: d.id,
          label: d.fileName || d.documentType || 'Dokumen Pendukung',
          type: d.documentType,
          pages: 1,
          previewUrl: d.previewUrl || `/api/documents/${d.id}/preview`,
          downloadUrl: d.previewUrl || `/api/documents/${d.id}/preview`
        });
      }
    }

    const formattedFindings = (findings && findings.length > 0)
      ? findings.map((f, idx) => ({
          id: f.id || `TM-${String(idx + 1).padStart(2, '0')}`,
          evidenceId: `evidence-${idx + 1}`,
          category: f.title || f.findingType || 'Ketidaksesuaian Klinis',
          severity: (f.severity || 'high').toLowerCase(),
          source: 'Resume Medis (Hal. 1)',
          reference: f.id,
          description: f.description || 'Pemeriksaan kesesuaian klinis diperlukan terhadap dokumen resume medis.'
        }))
      : [
          {
            id: 'TM-01',
            evidenceId: 'evidence-1',
            category: 'Ketidaksesuaian Klinis',
            severity: riskCategory === 'high' ? 'high' : 'medium',
            source: 'Resume Medis (Hal. 1)',
            reference: 'SN-CLINICAL-02',
            description: `Diagnosis ${claim.primaryDiagnosis?.description || 'utama'} memerlukan konfirmasi kesesuaian dengan bukti penunjang medis.`
          }
        ];

    return {
      ...enriched,
      claimId: claim.id,
      sepNumber: claim.noSep || claim.sepNumber || `SEP-${claim.id.slice(-6)}`,
      facilityMeta: claim.facilityMeta || `${claim.facilityName || 'Faskes'} (Tipe A)`,
      careType: claim.careType || (claim.serviceType === 'INPATIENT' ? `Rawat Inap • ${claim.serviceClass || 'Kls 1'}` : `Rawat Jalan • ${claim.serviceClass || 'Poli'}`),
      admissionDate: claim.admissionDate || claim.serviceDate || '2026-10-23',
      dischargeDate: claim.dischargeDate || claim.serviceDate || '2026-10-23',
      lengthOfStay: claim.lengthOfStayDays || (claim.serviceType === 'INPATIENT' ? 3 : 0),
      inaCbgCode: claim.inacbgCode || claim.submittedInaCbgCode || 'I-4-10-III',
      anomalyTypes,
      riskLevel: riskCategory,
      riskScore,
      status,
      documents,
      findings: formattedFindings,
      reviews
    };
  }

  /**
   * Create a new claim
   */
  async createClaim(payload) {
    const id = generateId('CLM');
    const now = new Date().toISOString();

    // Lookup facility name if not provided
    let facilityName = payload.facilityName;
    if (!facilityName && payload.facilityId) {
      const facility = this.facilitiesRepo.findById(payload.facilityId);
      if (facility) {
        facilityName = facility.name;
      }
    }

    const newClaim = {
      id,
      ...payload,
      facilityName: facilityName || 'Fasilitas Kesehatan Demo',
      createdAt: now,
      updatedAt: now,
      isDeleted: false
    };

    const saved = await this.claimsRepo.create(newClaim);

    // Record audit event
    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'claim',
      entityId: id,
      action: 'CLAIM_CREATED',
      details: { noSep: saved.noSep, facilityId: saved.facilityId },
      createdAt: now
    });

    return saved;
  }

  /**
   * Update claim by ID
   */
  async updateClaim(id, updates) {
    const existing = this.getClaimById(id);
    const updated = await this.claimsRepo.update(id, updates);

    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'claim',
      entityId: id,
      action: 'CLAIM_UPDATED',
      details: { updatedFields: Object.keys(updates) },
      createdAt: new Date().toISOString()
    });

    return updated;
  }

  /**
   * Soft-delete claim
   */
  async deleteClaim(id) {
    const claim = this.getClaimById(id);
    await this.claimsRepo.softDelete(id);

    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'claim',
      entityId: id,
      action: 'CLAIM_SOFT_DELETED',
      details: { noSep: claim.noSep },
      createdAt: new Date().toISOString()
    });

    return { message: `Claim '${id}' successfully deleted`, id };
  }

  /**
   * Get documents for claim — does NOT require claim to be in claims.json (works for batch-staged claims too)
   */
  getClaimDocuments(claimId) {
    const docService = new DocumentService(this.claimsRepo.dataDir);
    const docs = docService.getDocuments(claimId);
    // Only verify claim existence in claims.json if no documents were found via document service
    // (allows fetching docs for batch-staged claims before finalization)
    if (docs.length === 0) {
      this.getClaimById(claimId); // will throw 404 if claim truly doesn't exist anywhere
    }
    return docs;
  }

  /**
   * Get all analysis runs for claim
   */
  getClaimAnalysis(claimId) {
    this.getClaimById(claimId); // verifies existence
    const runs = this.analysisRepo.findAll((a) => String(a.claimId) === String(claimId));
    runs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return runs;
  }

  /**
   * Get findings for claim
   */
  getClaimFindings(claimId) {
    this.getClaimById(claimId); // verifies existence
    return this.findingsRepo.findAll((f) => String(f.claimId) === String(claimId));
  }

  /**
   * Execute analysis pipeline for a claim
   * 1. Find claim
   * 2. Load context (related claims, facility, documents)
   * 3. Run deterministic risk engine
   * 4. Persist new analysis run
   * 5. Persist generated findings
   * 6. Record audit event
   * 7. Return analysis run and findings
   */
  async analyzeClaim(claimId) {
    const claim = this.getClaimById(claimId);

    // Load related context
    const relatedClaims = this.claimsRepo.findAll((c) => !c.isDeleted && String(c.id) !== String(claimId));
    const facility = claim.facilityId ? this.facilitiesRepo.findById(claim.facilityId) : null;
    const documents = this.docsRepo.findAll((d) => String(d.claimId) === String(claimId));

    // Run deterministic risk engine
    const evaluation = riskEngine.evaluateClaim({
      claim,
      relatedClaims,
      facility,
      documents
    });

    const now = new Date().toISOString();
    const analysisRunId = generateId('ANL');

    // Create analysis run record
    const analysisRun = {
      id: analysisRunId,
      claimId: claim.id,
      riskScore: evaluation.riskScore,
      riskCategory: evaluation.riskCategory,
      scoringMethod: evaluation.scoringMethod,
      ruleBreakdown: evaluation.ruleBreakdown,
      summary: evaluation.summary,
      limitations: evaluation.limitations,
      isMockResult: false,
      createdAt: now
    };

    // Prepare generated findings records
    const generatedFindings = evaluation.findings.map((f) => ({
      id: generateId('FND'),
      claimId: claim.id,
      analysisRunId,
      findingType: f.findingType,
      severity: f.severity,
      title: f.title,
      description: f.description,
      evidence: f.evidence,
      recommendedAction: f.recommendedAction,
      status: 'OPEN',
      createdAt: now,
      updatedAt: now
    }));

    // Persist staged updates
    await this.analysisRepo.create(analysisRun);

    for (const finding of generatedFindings) {
      await this.findingsRepo.create(finding);
    }

    // Record audit event
    await this.auditRepo.create({
      id: generateId('AUD'),
      entityType: 'claim',
      entityId: claim.id,
      action: 'CLAIM_ANALYSIS_EXECUTED',
      details: {
        analysisRunId,
        riskScore: evaluation.riskScore,
        riskCategory: evaluation.riskCategory,
        findingsGenerated: generatedFindings.length
      },
      createdAt: now
    });

    // Touch claim updatedAt
    await this.claimsRepo.update(claim.id, { updatedAt: now });

    return {
      analysisRun,
      findings: generatedFindings
    };
  }
}

module.exports = ClaimService;
