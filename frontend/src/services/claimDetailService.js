import { mockVerificatorClaims } from '../mocks/verificatorClaims';
import { apiGet } from './apiClient';

const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false';

function enrichClaim(claim) {
  if (!claim) return null;
  const isHigh = claim.riskLevel === 'high';
  const isMedium = claim.riskLevel === 'medium';
  return {
    ...claim,
    admissionDate: claim.id === 'claim-001' ? '2024-09-20' : claim.serviceDate,
    dischargeDate: claim.serviceDate,
    lengthOfStay: claim.id === 'claim-001' ? 4 : 3,
    inaCbgCode: claim.id === 'claim-001' ? 'I-4-10-III' : 'A-4-12-II',
    riskScore: isHigh ? 89 : isMedium ? 64 : 28,
    documents: [
      { id: 'medical-summary', label: 'Resume Medis', pages: 2 },
      { id: 'laboratory', label: 'Hasil Laboratorium', pages: 1 },
      { id: 'billing', label: 'Rincian Tagihan', pages: 2 },
    ],
    findings: [
      {
        id: 'TM-01', evidenceId: 'evidence-1', category: 'Ketidaksesuaian Klinis', severity: 'high',
        source: 'Resume Medis (Hal. 1)', reference: 'SN-CLINICAL-02',
        description: `Diagnosis ${claim.primaryDiagnosis.description} memerlukan pemeriksaan kesesuaian dengan bukti klinis yang tercantum dalam resume medis. Tingkat keparahan grouping perlu dikonfirmasi terhadap kondisi objektif pasien.`,
      },
      {
        id: 'TM-02', evidenceId: 'evidence-2', category: claim.anomalyTypes[0] === 'Upcoding' ? 'Indikasi Upcoding' : 'Anomali Pengkodean', severity: 'medium',
        source: 'Resume Medis / Rincian Tagihan', reference: 'INA-CBG-DIFF-88',
        description: 'Terdapat perbedaan yang perlu ditinjau antara informasi klinis dan pengkodean klaim INA-CBG. Komponen diagnosis sekunder belum sepenuhnya didukung data objektif pada dokumen.',
      },
    ],
  };
}

export async function getClaimDetail(claimId, { signal } = {}) {
  if (useMockApi) {
    await new Promise((resolve, reject) => {
      const timer = window.setTimeout(resolve, 160);
      signal?.addEventListener('abort', () => {
        window.clearTimeout(timer);
        reject(new DOMException('Permintaan dibatalkan', 'AbortError'));
      });
    });
    return enrichClaim(mockVerificatorClaims.find((claim) => claim.id === claimId));
  }
  return apiGet(`/api/verificator/claims/${encodeURIComponent(claimId)}`, { signal });
}
