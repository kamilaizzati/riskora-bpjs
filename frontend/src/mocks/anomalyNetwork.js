/* Legacy broad relationship fixtures retained only as commented migration context.
import { mockVerificatorClaims } from './verificatorClaims';

export const relationshipTypes = {
  shared_diagnosis: { label: 'Diagnosis Serupa', color: '#2563EB' },
  shared_procedure: { label: 'Prosedur Serupa', color: '#7C3AED' },
  same_facility: { label: 'Faskes Sama', color: '#0891B2' },
  similar_billing_pattern: { label: 'Pola Tagihan Serupa', color: '#D97706' },
  close_service_period: { label: 'Periode Pelayanan Berdekatan', color: '#64748B' },
};

const positions = [
  [60, 70], [300, 35], [285, 205], [45, 240],
  [610, 55], [850, 75], [825, 245], [590, 225],
  [70, 475], [305, 430], [320, 610], [80, 640],
  [610, 455], [855, 430], [850, 620], [600, 635],
  [1080, 180], [1080, 520],
];

const procedureSets = [
  ['CT-SCAN-KEPALA'], ['CT-SCAN-KEPALA'], ['APPENDEKTOMI'], ['HEMODIALISIS'],
  ['ORIF-FEMUR'], ['PEMERIKSAAN-LAB'], ['OPERASI-KATARAK'], ['RADIOGRAFI-TORAKS'],
  ['EKG'], ['SECTIO-CAESAREA'], ['ENDOSKOPI'], ['NEBULISASI'],
  ['LAPAROSKOPI'], ['FISIOTERAPI-LUTUT'], ['EKG'], ['ENDOSKOPI'],
  ['NEBULISASI'], ['LAPAROSKOPI'],
];

const clusterIds = [
  'cluster-a', 'cluster-a', 'cluster-a', 'cluster-a',
  'cluster-b', 'cluster-b', 'cluster-b', 'cluster-b',
  'cluster-c', 'cluster-c', 'cluster-c', 'cluster-c',
  'cluster-d', 'cluster-d', 'cluster-d', 'cluster-d',
  null, null,
];

const attentionClaims = new Set(['claim-001', 'claim-002', 'claim-005', 'claim-010', 'claim-013']);

export const mockAnomalyNodes = mockVerificatorClaims.slice(0, 18).map((claim, index) => ({
  ...claim,
  shortId: `CLM-${String(index + 1).padStart(3, '0')}`,
  position: { x: positions[index][0], y: positions[index][1] },
  procedureCodes: procedureSets[index],
  clusterId: clusterIds[index],
  needsReviewAttention: attentionClaims.has(claim.id),
  period: claim.serviceDate.slice(0, 7),
}));

const edge = (id, source, target, type, explanation, evidence) => ({
  id, source, target, type, label: relationshipTypes[type].label, explanation, evidence,
});

export const mockAnomalyEdges = [
  edge('edge-001', 'claim-001', 'claim-002', 'shared_procedure', 'Kedua klaim mencantumkan pemeriksaan CT kepala dalam data simulasi.', { procedureCode: 'CT-SCAN-KEPALA' }),
  edge('edge-002', 'claim-001', 'claim-003', 'close_service_period', 'Tanggal pelayanan kedua klaim berjarak dua hari.', { dateDifferenceDays: 2 }),
  edge('edge-003', 'claim-002', 'claim-003', 'close_service_period', 'Tanggal pelayanan kedua klaim berjarak satu hari.', { dateDifferenceDays: 1 }),
  edge('edge-004', 'claim-003', 'claim-004', 'close_service_period', 'Kedua klaim tercatat pada tanggal pelayanan yang sama.', { dateDifferenceDays: 0 }),
  edge('edge-005', 'claim-001', 'claim-004', 'similar_billing_pattern', 'Nilai klaim berada dalam kelompok nominal rawat inap yang serupa pada data simulasi.', { amountRange: 'Rp7,2–18,45 juta', comparisonBasis: 'kelompok nominal prototipe' }),

  edge('edge-006', 'claim-005', 'claim-006', 'close_service_period', 'Kedua klaim memiliki tanggal pelayanan yang sama.', { dateDifferenceDays: 0 }),
  edge('edge-007', 'claim-006', 'claim-007', 'close_service_period', 'Kedua klaim memiliki tanggal pelayanan yang sama.', { dateDifferenceDays: 0 }),
  edge('edge-008', 'claim-007', 'claim-008', 'close_service_period', 'Tanggal pelayanan kedua klaim berjarak satu hari.', { dateDifferenceDays: 1 }),
  edge('edge-009', 'claim-005', 'claim-008', 'similar_billing_pattern', 'Kedua klaim berada pada pola nominal rawat inap menengah dalam skenario simulasi.', { amountDifference: 11850000, comparisonBasis: 'kategori nominal prototipe' }),
  edge('edge-010', 'claim-005', 'claim-007', 'shared_procedure', 'Kedua klaim memuat prosedur bedah dalam kelompok tindakan yang dibandingkan.', { procedureGroup: 'PROSEDUR-BEDAH' }),

  edge('edge-011', 'claim-009', 'claim-010', 'close_service_period', 'Tanggal pelayanan kedua klaim berjarak satu hari.', { dateDifferenceDays: 1 }),
  edge('edge-012', 'claim-010', 'claim-011', 'close_service_period', 'Tanggal pelayanan kedua klaim berjarak dua hari.', { dateDifferenceDays: 2 }),
  edge('edge-013', 'claim-011', 'claim-012', 'close_service_period', 'Tanggal pelayanan kedua klaim berjarak satu hari.', { dateDifferenceDays: 1 }),
  edge('edge-014', 'claim-011', 'claim-016', 'shared_diagnosis', 'Kedua klaim memiliki diagnosis utama dengan kode ICD-10 A09.', { diagnosisCode: 'A09' }),
  edge('edge-015', 'claim-011', 'claim-016', 'same_facility', 'Kedua klaim berasal dari RSUP Dr. Kariadi.', { facilityName: 'RSUP Dr. Kariadi' }),
  edge('edge-016', 'claim-010', 'claim-012', 'similar_billing_pattern', 'Nilai klaim menunjukkan rentang nominal yang berdekatan dalam data simulasi.', { amountDifference: 8875000, comparisonBasis: 'rentang prototipe' }),

  edge('edge-019', 'claim-014', 'claim-015', 'close_service_period', 'Tanggal pelayanan kedua klaim berjarak satu hari.', { dateDifferenceDays: 1 }),
  edge('edge-020', 'claim-015', 'claim-016', 'close_service_period', 'Tanggal pelayanan kedua klaim berjarak satu hari.', { dateDifferenceDays: 1 }),
  edge('edge-021', 'claim-014', 'claim-016', 'similar_billing_pattern', 'Nilai klaim berada pada kelompok nominal yang berdekatan dalam data simulasi.', { amountDifference: 1375000, comparisonBasis: 'rentang prototipe' }),
  edge('edge-024', 'claim-009', 'claim-015', 'shared_procedure', 'Kedua klaim mencantumkan pemeriksaan EKG dalam data simulasi.', { procedureCode: 'EKG' }),
];

export const mockAnomalyNetwork = {
  generatedAt: '2024-10-31T08:00:00.000Z',
  disclaimer: 'Relasi menunjukkan kesamaan atribut pada data simulasi dan bukan kesimpulan fraud.',
  nodes: mockAnomalyNodes,
  edges: mockAnomalyEdges,
};
*/

export { clusters, entityTypes, mockAnomalyEdges, mockAnomalyNetwork, mockAnomalyNodes, relationshipTypes } from './investigationNetwork';
