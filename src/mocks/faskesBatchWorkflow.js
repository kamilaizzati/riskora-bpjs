import { mockBillingPeriods, mockFaskesClaims } from './faskesWorkflow';

export const screeningStatusLabels = {
  not_screened: 'Belum Diperiksa', passed: 'Lolos Screening Awal', needs_correction: 'Perlu Koreksi',
};

export function evaluateDemoClaim(claim) {
  const findings = [];
  if (!claim.sepNumber?.trim()) findings.push({ code: 'missing_sep', message: 'Nomor SEP belum tersedia.', followUp: 'Lengkapi nomor SEP dari data administrasi.' });
  if (!claim.primaryDiagnosis?.code?.trim()) findings.push({ code: 'missing_diagnosis', message: 'Kode diagnosis utama belum tersedia.', followUp: 'Lengkapi kode diagnosis sesuai data E-Claim.' });
  if (!Number.isFinite(Number(claim.claimAmount)) || Number(claim.claimAmount) < 0) findings.push({ code: 'invalid_amount', message: 'Nilai klaim tidak valid.', followUp: 'Periksa kembali nilai klaim pada sumber data.' });
  if (claim.requiredAdminComplete === false) findings.push({ code: 'missing_admin', message: 'Data administrasi wajib belum lengkap.', followUp: 'Lengkapi data administrasi yang ditandai.' });
  if (claim.documentMetadataComplete === false) findings.push({ code: 'missing_document_metadata', message: 'Dokumen pendukung wajib belum tercatat.', followUp: 'Catat metadata dokumen pendukung yang relevan.' });
  if (claim.careClassNeedsReview) findings.push({ code: 'care_class_review', message: 'Data kelas rawat perlu ditinjau.', followUp: 'Cocokkan kelas rawat dengan sumber administrasi.' });
  return { status: findings.length ? 'needs_correction' : 'passed', findings };
}

function batchClaims(period) {
  return mockFaskesClaims.filter((claim) => claim.billingPeriod === period).map((claim, index) => {
    const demo = { ...structuredClone(claim), serviceDate: claim.submittedAt.slice(0, 10), requiredAdminComplete: true, documentMetadataComplete: true, careClassNeedsReview: false, correctionStatus: 'not_started' };
    if (index === 0) demo.sepNumber = '';
    if (index === 1 || index === 7) demo.documentMetadataComplete = false;
    if (index === 2) demo.careClassNeedsReview = true;
    const result = evaluateDemoClaim(demo);
    return { ...demo, screeningStatus: result.status, screeningFindings: result.findings };
  });
}

function makeBatch(period, status, handoffStatus) {
  const periodMeta = mockBillingPeriods.find((item) => item.id === period);
  const claims = batchClaims(period).map((claim) => ['ready_to_handoff', 'handed_off'].includes(status) ? { ...claim, screeningStatus: 'passed', screeningFindings: [], correctionStatus: claim.screeningStatus === 'needs_correction' ? 'completed' : claim.correctionStatus } : claim);
  return {
    id: `BATCH-RSK-${period.replace('-', '')}-01`, period, periodLabel: periodMeta?.label || period,
    name: `Batch Klaim ${periodMeta?.label || period}`, source: 'Data Klaim Simulasi', fileMeta: null,
    screeningStatus: status, handoffStatus, createdAt: `${period}-25T08:00:00+07:00`, finalizedAt: status === 'ready_to_handoff' || status === 'handed_off' ? `${period}-26T10:00:00+07:00` : null,
    claims,
  };
}

export const defaultDemoBatches = [
  makeBatch('2026-10', 'needs_correction', 'not_ready'),
  makeBatch('2026-09', 'ready_to_handoff', 'ready'),
  makeBatch('2026-08', 'handed_off', 'marked_forwarded'),
];

export function summarizeBatch(batch) {
  const claims = batch?.claims || [];
  return {
    total: claims.length,
    passed: claims.filter((claim) => claim.screeningStatus === 'passed').length,
    needsCorrection: claims.filter((claim) => claim.screeningStatus === 'needs_correction').length,
    notScreened: claims.filter((claim) => claim.screeningStatus === 'not_screened').length,
    correctionsCompleted: claims.filter((claim) => claim.correctionStatus === 'completed').length,
  };
}
