import { mockVerificatorDashboard } from '../mocks/verificatorDashboard';
import { apiGet } from './apiClient';

const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true';

const waitForMock = (data, signal) =>
  new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => resolve(structuredClone(data)), 240);
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timer);
      reject(new DOMException('Permintaan dibatalkan', 'AbortError'));
    });
  });

export async function getVerificatorDashboard({ signal } = {}) {
  if (useMockApi) return waitForMock(mockVerificatorDashboard, signal);

  const [summary, priorityClaims, anomalyDistribution, screeningResults] = await Promise.all([
    apiGet('/api/verificator/dashboard/summary', { signal }),
    apiGet('/api/verificator/dashboard/priority-claims', { signal }),
    apiGet('/api/verificator/dashboard/anomaly-distribution', { signal }),
    apiGet('/api/verificator/dashboard/screening-results', { signal }),
  ]);

  return {
    summary: summary ?? {},
    priorityClaims: Array.isArray(priorityClaims) ? priorityClaims : priorityClaims?.items ?? [],
    anomalyDistribution: Array.isArray(anomalyDistribution) ? anomalyDistribution : anomalyDistribution?.items ?? [],
    screeningResults: Array.isArray(screeningResults) ? screeningResults : screeningResults?.items ?? [],
  };
}
