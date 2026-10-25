import { mockBillingPeriods, mockFaskesClaims, mockFaskesPeriods } from '../mocks/faskesWorkflow';
import { apiGet, apiPost } from './apiClient';
import { getBatchClaims, getClaimBatches, updateClaimCorrection } from './faskesBatchService';

const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false';

const waitForMock = (value, signal) => new Promise((resolve, reject) => {
  const timer = window.setTimeout(() => resolve(structuredClone(value)), 220);
  signal?.addEventListener('abort', () => {
    window.clearTimeout(timer);
    reject(new DOMException('Permintaan dibatalkan', 'AbortError'));
  });
});

const unwrap = (response) => response?.data ?? response;
const normalizeSummary = (response) => {
  const value = unwrap(response) ?? {};
  return {
    totalSubmitted: Number(value.totalSubmitted) || 0,
    inScreening: Number(value.inScreening) || 0,
    needsCorrection: Number(value.needsCorrection) || 0,
    screeningPassed: Number(value.screeningPassed) || 0,
  };
};
const normalizeList = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : [];
};

export async function getFaskesDashboardSummary({ signal } = {}) {
  if (useMockApi) return waitForMock(mockFaskesPeriods['2026-10'].summary, signal);
  return normalizeSummary(await apiGet('/api/faskes/dashboard/summary', { signal }));
}

export async function getFaskesActionRequiredClaims({ signal } = {}) {
  if (useMockApi) return waitForMock(mockFaskesPeriods['2026-10'].actionRequiredClaims, signal);
  return normalizeList(await apiGet('/api/faskes/dashboard/action-required-claims', { signal }));
}

export async function getFaskesClaims(filters = {}, { signal } = {}) {
  if (useMockApi) {
    const batchClaims = (await getClaimBatches()).flatMap((batch) => batch.claims.map((claim) => ({ ...claim, batchId: batch.id, batchName: batch.name, periodLabel: batch.periodLabel })));
    const claims = batchClaims.filter((claim) =>
      (!filters.period || filters.period === 'all' || claim.billingPeriod === filters.period) &&
      (!filters.serviceType || filters.serviceType === 'all' || claim.serviceType === filters.serviceType) &&
      (!filters.batchId || filters.batchId === 'all' || claim.batchId === filters.batchId) &&
      (!filters.screeningStatus || filters.screeningStatus === 'all' || claim.screeningStatus === filters.screeningStatus) &&
      (!filters.finding || filters.finding === 'all' || (filters.finding === 'none' ? !claim.screeningFindings?.length : claim.screeningFindings?.some((item) => item.code === filters.finding))));
    return waitForMock(claims, signal);
  }
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value && value !== 'all'));
  return normalizeList(await apiGet(`/api/faskes/claims${params.size ? `?${params}` : ''}`, { signal }));
}

export async function getFaskesClaimById(claimId, { signal } = {}) {
  if (useMockApi) {
    const claim = (await getBatchClaims()).find((item) => item.id === claimId) ?? mockFaskesClaims.find((item) => item.id === claimId) ?? null;
    return waitForMock(claim, signal);
  }
  return unwrap(await apiGet(`/api/faskes/claims/${encodeURIComponent(claimId)}`, { signal }));
}

export async function submitFaskesClaimCorrection(claimId, payload, { signal } = {}) {
  if (useMockApi) {
    const claim = (await getBatchClaims()).find((item) => item.id === claimId);
    if (!claim) throw new Error('Klaim tidak ditemukan.');
    const submittedAt = new Date().toISOString();
    await updateClaimCorrection(claimId, { lastCorrection: { ...payload, submittedAt }, internalFollowUpStatus: 'recorded', correctionStatus: 'ready_for_rescreen' });
    return waitForMock({ claimId, status: 'ready_for_rescreen', submittedAt }, signal);
  }
  throw new Error('Endpoint pengajuan koreksi belum dikonfigurasi pada backend.');
}

export async function submitFaskesClaimForScreening(payload, { signal } = {}) {
  if (useMockApi) {
    const id = `faskes-claim-${Date.now()}`;
    const claim = {
      id,
      sepNumber: payload.claim.sepNumber,
      careType: `${payload.claim.careType} • ${payload.claim.careClass || payload.claim.unit}`,
      submittedAt: new Date().toISOString(),
      primaryDiagnosis: payload.clinical.primaryDiagnosis,
      claimAmount: Number(payload.financial.claimAmount) || 0,
      submittedInaCbgCode: payload.financial.inaCbgCode || null,
      status: 'in_screening',
    };
    mockFaskesClaims.unshift(claim);
    return waitForMock({ claimId: id, status: claim.status, submittedAt: claim.submittedAt }, signal);
  }
  return unwrap(await apiPost('/api/faskes/claims/pre-screening', payload, { signal }));
}

export async function getFaskesScreeningDistribution({ signal } = {}) {
  if (useMockApi) return waitForMock(mockFaskesPeriods['2026-10'].statusDistribution, signal);
  return normalizeList(await apiGet('/api/faskes/dashboard/screening-distribution', { signal }));
}

export async function getFaskesRecentActivities({ signal } = {}) {
  if (useMockApi) return waitForMock(mockFaskesPeriods['2026-10'].recentActivities, signal);
  return normalizeList(await apiGet('/api/faskes/dashboard/recent-activities', { signal }));
}

export async function getSubmissionPeriods({ signal } = {}) {
  if (useMockApi) return waitForMock(mockBillingPeriods, signal);
  return normalizeList(await apiGet('/api/faskes/submissions/periods', { signal }));
}

export async function getSubmissionOverview(period, { signal } = {}) {
  if (useMockApi) return waitForMock(mockFaskesPeriods[period] ?? null, signal);
  return unwrap(await apiGet(`/api/faskes/submissions/${encodeURIComponent(period)}`, { signal }));
}

export async function getFaskesDashboard(period = '2026-10', { signal } = {}) {
  if (useMockApi) {
    const batches = await getClaimBatches();
    const batch = batches.find((item) => item.period === period) || batches[0];
    const claims = batch?.claims || [];
    const passed = claims.filter((claim) => claim.screeningStatus === 'passed').length;
    const needsCorrection = claims.filter((claim) => claim.screeningStatus === 'needs_correction').length;
    return waitForMock({
      summary: { activeBatches: batch ? 1 : 0, totalClaims: claims.length, screeningPassed: passed, needsCorrection },
      actionRequiredClaims: claims.filter((claim) => claim.screeningStatus === 'needs_correction'),
      statusDistribution: [
        { status: 'passed', label: 'Lolos Screening Awal', value: passed, color: '#166534' },
        { status: 'needs_correction', label: 'Perlu Koreksi', value: needsCorrection, color: '#D97706' },
        { status: 'not_screened', label: 'Belum Diperiksa', value: claims.filter((claim) => claim.screeningStatus === 'not_screened').length, color: '#64748B' },
      ],
      recentActivities: [
        { id: `${batch?.id}-screen`, type: 'eclaim_prepared', title: 'Batch E-Claim tersedia', period, relativeTime: 'Terbaru', description: `${claims.length} klaim tersedia untuk pre-screening RISKORA.` },
        { id: `${batch?.id}-result`, type: needsCorrection ? 'correction_required' : 'document_updated', title: needsCorrection ? 'Koreksi diperlukan' : 'Screening awal selesai', period, relativeTime: 'Status saat ini', description: needsCorrection ? `${needsCorrection} klaim perlu ditindaklanjuti sebelum finalisasi.` : 'Seluruh klaim lolos screening awal dan dapat difinalisasi.' },
        { id: `${batch?.id}-handoff`, type: 'document_updated', title: 'Status penerusan terpisah', period, relativeTime: 'Manual', description: batch?.handoffStatus === 'marked_forwarded' ? 'Batch ditandai sudah diteruskan melalui proses resmi VClaim.' : 'RISKORA belum mencatat penerusan batch ke VClaim.' },
      ],
    }, signal);
  }
  return unwrap(await apiGet(`/api/faskes/dashboard?period=${encodeURIComponent(period)}`, { signal }));
}

export async function getVclaimFeedback(period, options = {}) {
  const overview = await getSubmissionOverview(period, options);
  return { matching: overview?.vclaimMatching ?? 0, nonMatching: overview?.vclaimNonMatching ?? 0, claims: overview?.actionRequiredClaims?.filter((claim) => claim.vclaimStatus === 'non_matching') ?? [] };
}

export async function getSupportingDocumentStatus(period, options = {}) {
  const overview = await getSubmissionOverview(period, options);
  return overview?.supportingDocuments ?? { expectedClaimSets: 0, availableClaimSets: 0, incompleteClaimSets: 0 };
}

export async function getVerificationFeedback(period, options = {}) {
  const overview = await getSubmissionOverview(period, options);
  return overview?.bav ?? { received: false, passed: null, pending: null, notEligible: null };
}
