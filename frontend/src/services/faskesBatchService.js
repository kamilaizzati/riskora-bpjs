import { defaultDemoBatches, evaluateDemoClaim, summarizeBatch } from '../mocks/faskesBatchWorkflow';
import { apiGet, apiPatch, apiPost } from './apiClient';

const STORAGE_KEY = 'riskora_demo_claim_batches_v3';
const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true';

function readBatches() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (Array.isArray(stored)) return stored;
    return useMockApi ? structuredClone(defaultDemoBatches) : [];
  } catch {
    return useMockApi ? structuredClone(defaultDemoBatches) : [];
  }
}

function writeBatches(batches, shouldDispatch = true) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  } catch {
    // ignore storage quota errors
  }
  if (shouldDispatch) {
    window.dispatchEvent(new CustomEvent('riskora-batches-updated'));
  }
  return batches;
}

function mergeBatchIntoStorage(batch) {
  const batches = readBatches();
  const next = [batch, ...batches.filter((b) => b.id !== batch.id)];
  writeBatches(next, true);
  return batch;
}

const wait = (value) => new Promise((resolve) => window.setTimeout(() => resolve(structuredClone(value)), 180));

export async function getClaimBatches() {
  if (!useMockApi) {
    try {
      const res = await apiGet('/api/batches');
      const batches = res.data || res;
      if (Array.isArray(batches)) {
        const claimBatches = batches.filter((b) => Array.isArray(b.claims) && b.claims.length > 0);
        writeBatches(claimBatches, false);
        return claimBatches;
      }
      return [];
    } catch {
      return [];
    }
  }
  return wait(readBatches());
}

export async function getClaimBatch(batchId) {
  if (!useMockApi) {
    try {
      const res = await apiGet(`/api/batches/${encodeURIComponent(batchId)}`);
      const batch = res.data || res;
      if (batch) return batch;
      return null;
    } catch {
      return null;
    }
  }
  return wait(readBatches().find((batch) => batch.id === batchId) || null);
}

export async function getActiveClaimBatch(period = '2026-10') {
  if (!useMockApi) {
    try {
      const res = await apiGet(`/api/batches?period=${encodeURIComponent(period)}`);
      const batches = res.data || res;
      if (Array.isArray(batches)) {
        const batch = batches.find((b) => (b.period === period || b.billingPeriod === period) && Array.isArray(b.claims) && b.claims.length > 0);
        if (batch) return batch;
        return null;
      }
      return null;
    } catch {
      return null;
    }
  }
  return wait(readBatches().find((batch) => (batch.period === period || batch.billingPeriod === period) && Array.isArray(batch.claims) && batch.claims.length > 0) || null);
}

export async function getBatchClaims() {
  const batches = await getClaimBatches();
  return batches.flatMap((batch) => batch.claims || []);
}

export async function uploadClaimBatch({ content, period, name, fileName }) {
  if (!useMockApi) {
    const res = await apiPost('/api/batches/upload', {
      content,
      period,
      batchName: name,
      fileName
    });
    const batch = res.data || res;
    if (batch) {
      mergeBatchIntoStorage(batch);
      return batch;
    }
    throw new Error('Import batch TXT gagal.');
  }

  const template = defaultDemoBatches.find((item) => item.period === period) || defaultDemoBatches[0];
  const batch = {
    ...structuredClone(template),
    id: `BATCH-DEMO-${(period || template.period).replace('-', '')}`,
    name: name || `Batch Demo ${template.periodLabel}`,
    period: period || template.period,
    source: 'Data Klaim Simulasi',
    fileMeta: fileName ? { name: fileName, type: 'text/plain', validatedLocally: true } : null,
    screeningStatus: 'draft',
    handoffStatus: 'not_ready',
    finalizedAt: null,
    claims: template.claims.map((claim) => ({
      ...claim,
      screeningStatus: 'not_screened',
      screeningFindings: [],
      correctionStatus: 'not_started'
    }))
  };
  mergeBatchIntoStorage(batch);
  return wait(batch);
}

export async function createDemoBatch({ period, name, fileMeta = null }) {
  if (!useMockApi) {
    try {
      const res = await apiPost('/api/batches/demo', { period, name, fileMeta });
      const batch = res.data || res;
      if (batch) {
        mergeBatchIntoStorage(batch);
        return batch;
      }
    } catch {
      // Fallback
    }
  }

  const template = defaultDemoBatches.find((batch) => batch.period === period) || defaultDemoBatches[0];
  const batch = {
    ...structuredClone(template),
    id: `BATCH-DEMO-${period.replace('-', '')}`,
    name: name || `Batch Demo ${template.periodLabel}`,
    source: 'Data Klaim Simulasi',
    fileMeta,
    screeningStatus: 'draft',
    handoffStatus: 'not_ready',
    finalizedAt: null,
    claims: template.claims.map((claim) => ({
      ...claim,
      screeningStatus: 'not_screened',
      screeningFindings: [],
      correctionStatus: 'not_started',
    })),
  };
  mergeBatchIntoStorage(batch);
  return wait(batch);
}

export async function runBatchPrescreening(batchId) {
  if (!useMockApi) {
    try {
      const res = await apiPost(`/api/batches/${encodeURIComponent(batchId)}/screening`, {});
      const batch = res.data || res;
      if (batch) {
        const batches = readBatches();
        const idx = batches.findIndex((b) => b.id === batchId);
        if (idx >= 0) batches[idx] = batch;
        else batches.unshift(batch);
        writeBatches(batches);
        return batch;
      }
    } catch {
      // Fallback
    }
  }

  const batches = readBatches();
  const index = batches.findIndex((batch) => batch.id === batchId);
  if (index < 0) throw new Error('Batch tidak ditemukan.');
  const batch = batches[index];
  batch.claims = batch.claims.map((claim) => {
    const result = evaluateDemoClaim(claim);
    return { ...claim, screeningStatus: result.status, screeningFindings: result.findings };
  });
  batch.screeningStatus = summarizeBatch(batch).needsCorrection ? 'needs_correction' : 'screening_complete';
  batches[index] = batch;
  writeBatches(batches);
  return wait(batch);
}

export async function finalizeBatchScreening(batchId) {
  if (!useMockApi) {
    try {
      const res = await apiPost(`/api/batches/${encodeURIComponent(batchId)}/finalize`, {});
      const batch = res.data || res;
      if (batch) {
        const batches = readBatches();
        const idx = batches.findIndex((b) => b.id === batchId);
        if (idx >= 0) batches[idx] = batch;
        writeBatches(batches);
        return batch;
      }
    } catch (err) {
      if (err.message && !err.message.includes('status 404')) {
        throw err;
      }
    }
  }

  const batches = readBatches();
  const index = batches.findIndex((batch) => batch.id === batchId);
  if (index < 0) throw new Error('Batch tidak ditemukan.');
  const validCount = (batches[index].claims || []).filter(
    (c) => c.screeningStatus === 'passed' || c.correctionStatus === 'completed'
  ).length;
  if (validCount === 0) {
    throw new Error('Tidak ada klaim valid yang dapat difinalisasi.');
  }
  const pendingCount = summarizeBatch(batches[index]).needsCorrection;
  batches[index] = {
    ...batches[index],
    status: pendingCount > 0 ? 'PARTIALLY_FINALIZED' : 'FINALIZED',
    screeningStatus: 'ready_to_handoff',
    handoffStatus: 'ready',
    finalizedAt: new Date().toISOString(),
    finalizedClaimsCount: validCount,
    pendingClaimsCount: pendingCount
  };
  writeBatches(batches);
  return wait(batches[index]);
}

export async function markBatchForwarded(batchId) {
  if (!useMockApi) {
    try {
      const res = await apiPost(`/api/batches/${encodeURIComponent(batchId)}/handoff`, {});
      const batch = res.data || res;
      if (batch) {
        const batches = readBatches();
        const idx = batches.findIndex((b) => b.id === batchId);
        if (idx >= 0) batches[idx] = batch;
        writeBatches(batches);
        return batch;
      }
    } catch {
      // Fallback
    }
  }

  const batches = readBatches();
  const index = batches.findIndex((batch) => batch.id === batchId);
  if (index < 0) throw new Error('Batch tidak ditemukan.');
  const pendingCount = summarizeBatch(batches[index]).needsCorrection;
  batches[index] = {
    ...batches[index],
    status: pendingCount > 0 ? 'PARTIALLY_FORWARDED' : 'FORWARDED',
    screeningStatus: 'handed_off',
    handoffStatus: pendingCount > 0 ? 'partially_forwarded' : 'marked_forwarded',
    forwardedAt: new Date().toISOString(),
    claims: (batches[index].claims || []).map((c) => {
      const isPassed = c.screeningStatus === 'passed' || c.correctionStatus === 'completed';
      return isPassed
        ? {
            ...c,
            workflowStatus: 'COMPLETED',
            claimStatus: 'COMPLETED',
            isForwarded: true,
            forwardedAt: new Date().toISOString()
          }
        : c;
    })
  };
  writeBatches(batches);
  return wait(batches[index]);
}

export async function updateClaimCorrection(claimId, updates) {
  if (!useMockApi) {
    try {
      const res = await apiPatch(`/api/batches/claims/${encodeURIComponent(claimId)}`, updates);
      if (res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }
  }

  const batches = readBatches();
  for (const batch of batches) {
    const index = batch.claims.findIndex((claim) => claim.id === claimId || claim.claimId === claimId);
    if (index >= 0) {
      batch.claims[index] = { ...batch.claims[index], ...updates };
      writeBatches(batches);
      return wait(batch.claims[index]);
    }
  }
  throw new Error('Klaim tidak ditemukan.');
}

export async function rescreenCorrectedClaim(claimId) {
  if (!useMockApi) {
    try {
      const res = await apiPost(`/api/batches/claims/${encodeURIComponent(claimId)}/rescreen`, {});
      const claimData = res.data?.claim || res.data;
      if (claimData) {
        const batches = readBatches();
        for (const batch of batches) {
          const index = batch.claims.findIndex((claim) => claim.id === claimId || claim.claimId === claimId);
          if (index >= 0) {
            batch.claims[index] = { ...batch.claims[index], ...claimData };
            writeBatches(batches);
            break;
          }
        }
        return claimData;
      }
    } catch (err) {
      if (err.message && !err.message.includes('status 404')) {
        throw err;
      }
    }
  }

  const batches = readBatches();
  for (const batch of batches) {
    const index = batch.claims.findIndex((claim) => claim.id === claimId || claim.claimId === claimId);
    if (index < 0) continue;
    const claim = batch.claims[index];
    if (claim.correctionStatus !== 'ready_for_rescreen') {
      throw new Error('Simpan tindak lanjut koreksi sebelum pemeriksaan ulang.');
    }
    const codes = new Set((claim.screeningFindings || []).map((finding) => finding.code));
    const corrected = {
      ...claim,
      sepNumber: codes.has('missing_sep') ? `SEP-DEMO-${claim.id.slice(-6).toUpperCase()}` : claim.sepNumber,
      primaryDiagnosis: codes.has('missing_diagnosis') ? { code: 'Z00.0', description: 'Data diagnosis simulasi telah dilengkapi' } : claim.primaryDiagnosis,
      claimAmount: codes.has('invalid_amount') ? 0 : claim.claimAmount,
      requiredAdminComplete: codes.has('missing_admin') ? true : claim.requiredAdminComplete,
      documentMetadataComplete: codes.has('missing_document_metadata') ? true : claim.documentMetadataComplete,
      careClassNeedsReview: codes.has('care_class_review') ? false : claim.careClassNeedsReview,
    };
    const result = evaluateDemoClaim(corrected);
    batch.claims[index] = {
      ...corrected,
      screeningStatus: result.status,
      screeningFindings: result.findings,
      correctionStatus: result.status === 'passed' ? 'completed' : 'in_progress',
      rescreenedAt: new Date().toISOString(),
    };
    batch.screeningStatus = summarizeBatch(batch).needsCorrection ? 'needs_correction' : 'screening_complete';
    writeBatches(batches);
    return wait(batch.claims[index]);
  }
  throw new Error('Klaim tidak ditemukan.');
}

export async function rolloverClaim(claimId, options = {}) {
  if (!useMockApi) {
    const res = await apiPost(`/api/batches/claims/${encodeURIComponent(claimId)}/rollover`, options);
    return res.data || res;
  }
  throw new Error('Rollover mock belum tersedia.');
}
