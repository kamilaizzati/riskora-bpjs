import { mockAnomalyNetwork } from '../mocks/anomalyNetwork';
import { apiGet } from './apiClient';

const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false';
const wait = (signal) => new Promise((resolve, reject) => {
  const timer = window.setTimeout(resolve, 220);
  signal?.addEventListener('abort', () => {
    window.clearTimeout(timer);
    reject(new DOMException('Permintaan dibatalkan', 'AbortError'));
  });
});

const normalizeNetwork = (response) => {
  const value = response?.data ?? response ?? {};
  const nodes = Array.isArray(value.nodes) ? value.nodes : [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = (Array.isArray(value.edges) ? value.edges : []).map((edge) => ({
    ...edge,
    type: edge.relationshipType || edge.type,
    relationshipType: edge.relationshipType || edge.type,
    supportingEvidence: edge.supportingEvidence || edge.evidence || {},
    reviewStatus: edge.reviewStatus || 'Informational',
    reviewReason: edge.reviewReason || 'Alasan review belum tersedia.',
  })).filter((edge) => edge.id && nodeIds.has(edge.source) && nodeIds.has(edge.target) && Object.keys(edge.supportingEvidence).length > 0);
  return { ...value, nodes, edges };
};

export async function getAnomalyNetwork(filters = {}, { signal } = {}) {
  if (useMockApi) {
    await wait(signal);
    return normalizeNetwork(structuredClone(mockAnomalyNetwork));
  }
  const params = new URLSearchParams();
  if (filters.period && filters.period !== 'all') params.set('period', filters.period);
  filters.relationshipTypes?.forEach((type) => params.append('relationshipType', type));
  const query = params.toString();
  return normalizeNetwork(await apiGet(`/api/verificator/anomaly-network${query ? `?${query}` : ''}`, { signal }));
}

export async function getNetworkClaimDetail(claimId, { signal } = {}) {
  if (useMockApi) {
    await wait(signal);
    const claim = mockAnomalyNetwork.nodes.find((node) => node.id === claimId);
    if (!claim) throw new Error('Klaim tidak ditemukan.');
    return structuredClone(claim);
  }
  return apiGet(`/api/verificator/anomaly-network/claims/${encodeURIComponent(claimId)}`, { signal });
}

export async function getClaimRelationships(claimId, { signal } = {}) {
  if (useMockApi) {
    await wait(signal);
    return structuredClone(mockAnomalyNetwork.edges.filter((item) => item.source === claimId || item.target === claimId));
  }
  return apiGet(`/api/verificator/anomaly-network/claims/${encodeURIComponent(claimId)}/relationships`, { signal });
}
