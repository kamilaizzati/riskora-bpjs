import { mockVerificatorClaims } from '../mocks/verificatorClaims';
import { apiGet } from './apiClient';

const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false';

export async function getClaimsQueue({ signal } = {}) {
  if (useMockApi) {
    await new Promise((resolve, reject) => {
      const timer = window.setTimeout(resolve, 180);
      signal?.addEventListener('abort', () => {
        window.clearTimeout(timer);
        reject(new DOMException('Permintaan dibatalkan', 'AbortError'));
      });
    });
    return structuredClone(mockVerificatorClaims);
  }

  const response = await apiGet('/api/verificator/claims', { signal });
  return Array.isArray(response) ? response : response?.items ?? [];
}
