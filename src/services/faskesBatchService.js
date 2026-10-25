import { defaultDemoBatches, evaluateDemoClaim, summarizeBatch } from '../mocks/faskesBatchWorkflow';

const STORAGE_KEY = 'riskora_demo_claim_batches_v2';

function readBatches() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return Array.isArray(stored) && stored.length ? stored : structuredClone(defaultDemoBatches);
  } catch { return structuredClone(defaultDemoBatches); }
}

function writeBatches(batches) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  window.dispatchEvent(new CustomEvent('riskora-batches-updated'));
  return batches;
}

const wait = (value) => new Promise((resolve) => window.setTimeout(() => resolve(structuredClone(value)), 180));

export async function getClaimBatches() { return wait(readBatches()); }
export async function getClaimBatch(batchId) { return wait(readBatches().find((batch) => batch.id === batchId) || null); }
export async function getActiveClaimBatch(period = '2026-10') { return wait(readBatches().find((batch) => batch.period === period) || null); }
export async function getBatchClaims() { return wait(readBatches().flatMap((batch) => batch.claims)); }

export async function createDemoBatch({ period, name, fileMeta = null }) {
  const batches = readBatches();
  const template = defaultDemoBatches.find((batch) => batch.period === period) || defaultDemoBatches[0];
  const batch = { ...structuredClone(template), id: `BATCH-DEMO-${period.replace('-', '')}`, name: name || `Batch Demo ${template.periodLabel}`, source: 'Data Klaim Simulasi', fileMeta, screeningStatus: 'draft', handoffStatus: 'not_ready', finalizedAt: null, claims: template.claims.map((claim) => ({ ...claim, screeningStatus: 'not_screened', screeningFindings: [], correctionStatus: 'not_started' })) };
  const next = [batch, ...batches.filter((item) => item.id !== batch.id && item.period !== period)];
  writeBatches(next);
  return wait(batch);
}

export async function runBatchPrescreening(batchId) {
  const batches = readBatches();
  const index = batches.findIndex((batch) => batch.id === batchId);
  if (index < 0) throw new Error('Batch tidak ditemukan.');
  const batch = batches[index];
  batch.claims = batch.claims.map((claim) => { const result = evaluateDemoClaim(claim); return { ...claim, screeningStatus: result.status, screeningFindings: result.findings }; });
  batch.screeningStatus = summarizeBatch(batch).needsCorrection ? 'needs_correction' : 'screening_complete';
  batches[index] = batch;
  writeBatches(batches);
  return wait(batch);
}

export async function finalizeBatchScreening(batchId) {
  const batches = readBatches();
  const index = batches.findIndex((batch) => batch.id === batchId);
  if (index < 0) throw new Error('Batch tidak ditemukan.');
  if (summarizeBatch(batches[index]).needsCorrection > 0) throw new Error('Selesaikan koreksi dan pemeriksaan ulang sebelum finalisasi.');
  batches[index] = { ...batches[index], screeningStatus: 'ready_to_handoff', handoffStatus: 'ready', finalizedAt: new Date().toISOString() };
  writeBatches(batches);
  return wait(batches[index]);
}

export async function markBatchForwarded(batchId) {
  const batches = readBatches();
  const index = batches.findIndex((batch) => batch.id === batchId);
  if (index < 0) throw new Error('Batch tidak ditemukan.');
  batches[index] = { ...batches[index], screeningStatus: 'handed_off', handoffStatus: 'marked_forwarded', forwardedAt: new Date().toISOString() };
  writeBatches(batches);
  return wait(batches[index]);
}

export async function updateClaimCorrection(claimId, updates) {
  const batches = readBatches();
  for (const batch of batches) {
    const index = batch.claims.findIndex((claim) => claim.id === claimId);
    if (index >= 0) {
      batch.claims[index] = { ...batch.claims[index], ...updates };
      writeBatches(batches);
      return wait(batch.claims[index]);
    }
  }
  throw new Error('Klaim tidak ditemukan.');
}

export async function rescreenCorrectedClaim(claimId) {
  const batches = readBatches();
  for (const batch of batches) {
    const index = batch.claims.findIndex((claim) => claim.id === claimId);
    if (index < 0) continue;
    const claim = batch.claims[index];
    if (claim.correctionStatus !== 'ready_for_rescreen') throw new Error('Simpan tindak lanjut koreksi sebelum pemeriksaan ulang.');
    const codes = new Set((claim.screeningFindings || []).map((finding) => finding.code));
    const corrected = { ...claim,
      sepNumber: codes.has('missing_sep') ? `SEP-DEMO-${claim.id.slice(-6).toUpperCase()}` : claim.sepNumber,
      primaryDiagnosis: codes.has('missing_diagnosis') ? { code: 'Z00.0', description: 'Data diagnosis simulasi telah dilengkapi' } : claim.primaryDiagnosis,
      claimAmount: codes.has('invalid_amount') ? 0 : claim.claimAmount,
      requiredAdminComplete: codes.has('missing_admin') ? true : claim.requiredAdminComplete,
      documentMetadataComplete: codes.has('missing_document_metadata') ? true : claim.documentMetadataComplete,
      careClassNeedsReview: codes.has('care_class_review') ? false : claim.careClassNeedsReview,
    };
    const result = evaluateDemoClaim(corrected);
    batch.claims[index] = { ...corrected, screeningStatus: result.status, screeningFindings: result.findings, correctionStatus: result.status === 'passed' ? 'completed' : 'in_progress', rescreenedAt: new Date().toISOString() };
    batch.screeningStatus = summarizeBatch(batch).needsCorrection ? 'needs_correction' : 'screening_complete';
    writeBatches(batches);
    return wait(batch.claims[index]);
  }
  throw new Error('Klaim tidak ditemukan.');
}
