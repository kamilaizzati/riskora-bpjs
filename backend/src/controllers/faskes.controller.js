const BatchService = require('../services/batch.service');
const ClaimService = require('../services/claim.service');
const DocumentService = require('../services/document.service');
const JsonRepository = require('../repositories/json.repository');
const HttpError = require('../utils/http-error');
const { generateId } = require('../utils/id-generator');

function getServices(req) {
  const dataDir = req.app.get('dataDir');
  return {
    batchService: new BatchService(dataDir),
    claimService: new ClaimService(dataDir),
    claimsRepo: new JsonRepository('claims.json', dataDir),
    batchesRepo: new JsonRepository('submission-batches.json', dataDir),
    dataDir
  };
}

const defaultPeriods = [
  { id: '2026-10', label: 'Oktober 2026', deadline: '2026-11-10', status: 'active' },
  { id: '2026-09', label: 'September 2026', deadline: '2026-10-10', status: 'closed' },
  { id: '2026-08', label: 'Agustus 2026', deadline: '2026-09-10', status: 'closed' }
];

function getActiveBatchData(services, period = null) {
  const batches = services.batchesRepo.findAll();

  let targetBatches = [];
  if (period && period !== 'all') {
    targetBatches = batches.filter(
      (b) => (b.period === period || b.billingPeriod === period) && Array.isArray(b.claims) && b.claims.length > 0
    );
  } else {
    // If period is 'all' or omitted, aggregate across all batches with claims
    targetBatches = batches.filter((b) => Array.isArray(b.claims) && b.claims.length > 0);
  }

  const batch = targetBatches[0] || null;
  const seenIds = new Set();
  const claims = [];

  for (const b of targetBatches) {
    for (const c of b.claims || []) {
      if (c.rolloverStatus === 'rolled_over') continue;
      if (!seenIds.has(c.id)) {
        seenIds.add(c.id);
        claims.push({
          ...c,
          batchId: c.batchId || b.id,
          batchName: c.batchName || b.batchName || b.name,
          periodLabel: c.periodLabel || b.periodLabel,
          billingPeriod: c.billingPeriod || b.billingPeriod || c.batchPeriod
        });
      }
    }
  }

  const passed = claims.filter((c) => c.screeningStatus === 'passed').length;
  const needsCorrection = claims.filter((c) => c.screeningStatus === 'needs_correction' && c.rolloverStatus !== 'rolled_over').length;
  const notScreened = claims.filter((c) => !c.screeningStatus || c.screeningStatus === 'not_screened').length;

  return {
    batch,
    targetBatches,
    claims,
    summary: {
      activeBatches: targetBatches.length,
      totalSubmitted: claims.length,
      totalClaims: claims.length,
      inScreening: notScreened,
      needsCorrection: needsCorrection,
      screeningPassed: passed
    },
    passed,
    needsCorrection,
    notScreened
  };
}

function getDashboardSummary(req, res, next) {
  try {
    const services = getServices(req);
    const { summary } = getActiveBatchData(services, req.query.period || '2026-10');
    return res.status(200).json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
}

function getActionRequiredClaims(req, res, next) {
  try {
    const services = getServices(req);
    const { claims } = getActiveBatchData(services, req.query.period || '2026-10');
    const actionRequired = claims.filter((c) => c.screeningStatus === 'needs_correction' && c.rolloverStatus !== 'rolled_over');
    return res.status(200).json({ success: true, data: actionRequired });
  } catch (err) {
    next(err);
  }
}

function getDashboard(req, res, next) {
  try {
    const services = getServices(req);
    const period = req.query.period || '2026-10';
    const { batch, claims, summary, passed, needsCorrection, notScreened } = getActiveBatchData(services, period);

    const data = {
      summary: {
        activeBatches: summary.activeBatches,
        totalClaims: summary.totalClaims,
        screeningPassed: passed,
        needsCorrection: needsCorrection
      },
      actionRequiredClaims: claims.filter((c) => c.screeningStatus === 'needs_correction' && c.rolloverStatus !== 'rolled_over'),
      statusDistribution: [
        { status: 'passed', label: 'Lolos Screening Awal', value: passed, color: '#166534' },
        { status: 'needs_correction', label: 'Perlu Koreksi', value: needsCorrection, color: '#D97706' },
        { status: 'not_screened', label: 'Belum Diperiksa', value: notScreened, color: '#64748B' }
      ],
      recentActivities: claims.length > 0
        ? [
            {
              id: `${batch?.id || 'demo'}-screen`,
              type: 'eclaim_prepared',
              title: 'Batch E-Claim tersedia',
              period,
              relativeTime: 'Terbaru',
              description: `${claims.length} klaim tersedia untuk pre-screening RISKORA.`
            },
            {
              id: `${batch?.id || 'demo'}-result`,
              type: needsCorrection ? 'correction_required' : 'document_updated',
              title: needsCorrection ? 'Koreksi diperlukan' : 'Screening awal selesai',
              period,
              relativeTime: 'Status saat ini',
              description: needsCorrection
                ? `${needsCorrection} klaim perlu ditindaklanjuti sebelum finalisasi.`
                : 'Seluruh klaim lolos screening awal dan dapat difinalisasi.'
            },
            {
              id: `${batch?.id || 'demo'}-handoff`,
              type: 'document_updated',
              title: 'Status penerusan terpisah',
              period,
              relativeTime: 'Manual',
              description: batch?.handoffStatus === 'marked_forwarded'
                ? 'Batch ditandai sudah diteruskan melalui proses resmi VClaim.'
                : 'RISKORA belum mencatat penerusan batch ke VClaim.'
            }
          ]
        : []
    };

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

function getClaims(req, res, next) {
  try {
    const services = getServices(req);
    const { period, serviceType, batchId, screeningStatus, finding, submissionStatus } = req.query;
    const { claims } = getActiveBatchData(services, period || 'all');

    const historicalBatch = batchId && batchId !== 'all' ? services.batchesRepo.findById(batchId) : null;
    let filtered = historicalBatch ? (historicalBatch.claims || []).map((claim) => ({ ...claim, batchId: historicalBatch.id,
      batchName: historicalBatch.name || historicalBatch.batchName, billingPeriod: historicalBatch.period, periodLabel: historicalBatch.periodLabel })) : [...claims];

    if (submissionStatus === 'ready') {
      const readyIds = new Set(services.batchService.getReadyResubmissions().map((claim) => `${claim.sourceBatchId}:${claim.id}`));
      filtered = filtered.filter((claim) => readyIds.has(`${claim.batchId}:${claim.id}`));
    }

    if (period && period !== 'all') {
      filtered = filtered.filter((c) => c.billingPeriod === period || c.batchPeriod === period);
    }
    if (serviceType && serviceType !== 'all') {
      filtered = filtered.filter(
        (c) => (c.serviceType || '').toLowerCase() === serviceType.toLowerCase()
      );
    }
    if (batchId && batchId !== 'all') {
      filtered = filtered.filter((c) => c.batchId === batchId);
    }
    if (screeningStatus && screeningStatus !== 'all') {
      filtered = filtered.filter((c) => c.screeningStatus === screeningStatus);
    }
    if (finding && finding !== 'all') {
      if (finding === 'none') {
        filtered = filtered.filter((c) => !c.screeningFindings?.length);
      } else {
        filtered = filtered.filter((c) => c.screeningFindings?.some((f) => f.code === finding));
      }
    }

    return res.status(200).json({ success: true, data: filtered });
  } catch (err) {
    next(err);
  }
}

function getClaimById(req, res, next) {
  try {
    const services = getServices(req);
    const { claims } = getActiveBatchData(services, 'all');
    let claim = claims.find((c) => c.id === req.params.id || c.claimId === req.params.id);
    if (!claim) {
      // Fallback search in active claims
      try {
        claim = services.claimService.getClaimById(req.params.id);
      } catch {
        return res.status(404).json({ success: false, error: { message: 'Klaim tidak ditemukan' } });
      }
    }

    const docService = new DocumentService(services.dataDir);
    const docs = docService.getDocuments(claim.claimId || claim.id);

    return res.status(200).json({
      success: true,
      data: {
        ...claim,
        documents: docs
      }
    });
  } catch (err) {
    next(err);
  }
}

function getClaimDocuments(req, res, next) {
  try {
    const services = getServices(req);
    const docService = new DocumentService(services.dataDir);
    const docs = docService.getDocuments(req.params.id);
    return res.status(200).json({ success: true, data: docs });
  } catch (err) {
    next(err);
  }
}

async function submitClaimCorrection(req, res, next) {
  try {
    const services = getServices(req);
    const { id } = req.params;
    const payload = req.body || {};
    const updated = await services.batchService.updateClaimCorrection(null, id, payload);
    return res.status(200).json({
      success: true,
      data: {
        claimId: updated.claimId || updated.id,
        status: updated.correctionStatus || 'ready_for_rescreen',
        submittedAt: updated.lastCorrection?.submittedAt || new Date().toISOString(),
        claim: updated
      }
    });
  } catch (err) {
    next(err);
  }
}

async function rescreenClaim(req, res, next) {
  try {
    const services = getServices(req);
    const { id } = req.params;
    const result = await services.batchService.rescreenClaim(null, id);
    return res.status(200).json({
      success: true,
      data: {
        claim: result,
        ...result
      },
      message: 'Claim rescreened successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function rolloverClaim(req, res, next) {
  try {
    const services = getServices(req);
    const { id } = req.params;
    const result = await services.batchService.rolloverClaim(null, id, req.body);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

async function submitPreScreening(req, res, next) {
  try {
    const payload = req.body || {};
    const id = generateId('CLM-PRE');
    const submittedAt = new Date().toISOString();

    return res.status(200).json({
      success: true,
      data: {
        claimId: id,
        status: 'in_screening',
        submittedAt
      }
    });
  } catch (err) {
    next(err);
  }
}

function getScreeningDistribution(req, res, next) {
  try {
    const services = getServices(req);
    const { passed, needsCorrection, notScreened } = getActiveBatchData(services, req.query.period || '2026-10');
    return res.status(200).json({
      success: true,
      data: [
        { status: 'passed', label: 'Lolos Screening Awal', value: passed, color: '#166534' },
        { status: 'needs_correction', label: 'Perlu Koreksi', value: needsCorrection, color: '#D97706' },
        { status: 'not_screened', label: 'Belum Diperiksa', value: notScreened, color: '#64748B' }
      ]
    });
  } catch (err) {
    next(err);
  }
}

function getRecentActivities(req, res, next) {
  try {
    const services = getServices(req);
    const period = req.query.period || '2026-10';
    const { batch, claims, passed, needsCorrection } = getActiveBatchData(services, period);

    const activities = [
      {
        id: `${batch?.id || 'demo'}-act-1`,
        type: 'eclaim_prepared',
        title: 'Batch E-Claim disiapkan',
        period,
        relativeTime: 'Hari ini, 08:30 WIB',
        description: `${claims.length || 20} berkas klaim selesai diproses dari TXT E-Claim.`
      },
      {
        id: `${batch?.id || 'demo'}-act-2`,
        type: 'document_updated',
        title: 'Pre-screening dokumen selesai',
        period,
        relativeTime: 'Hari ini, 09:15 WIB',
        description: `${passed} klaim lolos screening awal, ${needsCorrection} memerlukan klarifikasi.`
      }
    ];

    return res.status(200).json({ success: true, data: activities });
  } catch (err) {
    next(err);
  }
}

function getSubmissionPeriods(req, res, next) {
  try {
    const services = getServices(req);
    const batches = services.batchesRepo.findAll();

    const periodSet = new Map();
    for (const p of defaultPeriods) {
      periodSet.set(p.id, p);
    }

    for (const b of batches) {
      const p = b.period || b.billingPeriod;
      if (p && !periodSet.has(p)) {
        periodSet.set(p, {
          id: p,
          label: b.periodLabel || p,
          deadline: `${p}-10`,
          status: 'closed'
        });
      }
    }

    return res.status(200).json({ success: true, data: Array.from(periodSet.values()) });
  } catch (err) {
    next(err);
  }
}

function getSubmissionOverview(req, res, next) {
  try {
    const services = getServices(req);
    const { period } = req.params;
    const { claims, passed, needsCorrection, notScreened } = getActiveBatchData(services, period);

    const data = {
      period,
      totalClaims: claims.length || 20,
      vclaimMatching: passed,
      vclaimNonMatching: needsCorrection,
      bav: {
        received: period === '2026-09' || period === '2026-08',
        passed: passed,
        pending: needsCorrection,
        notEligible: 0
      },
      supportingDocuments: {
        expectedClaimSets: claims.length || 20,
        availableClaimSets: passed,
        incompleteClaimSets: needsCorrection
      },
      actionRequiredClaims: claims.filter((c) => c.screeningStatus === 'needs_correction')
    };

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardSummary,
  getActionRequiredClaims,
  getDashboard,
  getClaims,
  getClaimById,
  getClaimDocuments,
  submitClaimCorrection,
  rescreenClaim,
  rolloverClaim,
  submitPreScreening,
  getScreeningDistribution,
  getRecentActivities,
  getSubmissionPeriods,
  getSubmissionOverview
};
