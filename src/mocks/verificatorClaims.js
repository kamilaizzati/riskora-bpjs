import { goldenVerificatorClaims } from './goldenDemoScenario.js';

const referenceClaims = [
  {
    sepNumber: '0182R0010924V004812', facilityName: 'RSUP Dr. Sardjito', facilityMeta: 'Yogyakarta (Tipe A)',
    careType: 'Rawat Inap • Kls 1', serviceDate: '2024-09-24', diagnosisCode: 'I63.9', diagnosis: 'Stroke Iskemik Akut',
    claimAmount: 18450000, anomalyType: 'Upcoding', riskLevel: 'high', status: 'needs_investigation',
  },
  {
    sepNumber: '0115R0050924V001923', facilityName: 'RSUD Cipto Mangunkusumo', facilityMeta: 'Jakarta Pusat (Tipe A)',
    careType: 'Rawat Inap • ICU', serviceDate: '2024-09-25', diagnosisCode: 'I25.1', diagnosis: 'Penyakit Jantung Koroner',
    claimAmount: 32800000, anomalyType: 'Repeat Billing', riskLevel: 'high', status: 'pending_verification',
  },
  {
    sepNumber: '0204R0020924V007144', facilityName: 'RS Hermina Kemayoran', facilityMeta: 'Jakarta Pusat (Tipe B)',
    careType: 'Rawat Inap • Bedah', serviceDate: '2024-09-26', diagnosisCode: 'K35.8', diagnosis: 'Apendisitis Akut',
    claimAmount: 9650000, anomalyType: 'Unbundling', riskLevel: 'medium', status: 'in_review',
  },
  {
    sepNumber: '0177R0080924V003290', facilityName: 'RSUD Dr. Soetomo', facilityMeta: 'Surabaya (Tipe A)',
    careType: 'Rawat Jalan • HD', serviceDate: '2024-09-26', diagnosisCode: 'N18.5', diagnosis: 'Gagal Ginjal Kronik St. 5',
    claimAmount: 7200000, anomalyType: 'Clinical Mismatch', riskLevel: 'medium', status: 'pending_verification',
  },
  {
    sepNumber: '0312R0030924V006741', facilityName: 'RS Siloam Kebon Jeruk', facilityMeta: 'Jakarta Barat (Tipe B)',
    careType: 'Rawat Inap • Bedah', serviceDate: '2024-09-27', diagnosisCode: 'S72.0', diagnosis: 'Fraktur Femur Tertutup',
    claimAmount: 24150000, anomalyType: 'Phantom Billing', riskLevel: 'high', status: 'needs_investigation',
  },
  {
    sepNumber: '0312R0030924V006718', facilityName: 'RS Santo Borromeus', facilityMeta: 'Bandung (Tipe B)',
    careType: 'Rawat Jalan • Penyakit Dalam', serviceDate: '2024-09-27', diagnosisCode: 'E11.9', diagnosis: 'Diabetes Mellitus Tipe 2',
    claimAmount: 4150000, anomalyType: 'Incomplete Documents', riskLevel: 'low', status: 'in_review',
  },
  {
    sepNumber: '0142R0040924V008821', facilityName: 'RSUD Tarakan', facilityMeta: 'Jakarta Pusat (Tipe B)',
    careType: 'Rawat Inap • Bedah Mata', serviceDate: '2024-09-27', diagnosisCode: 'H25.0', diagnosis: 'Katarak Senilis',
    claimAmount: 8900000, anomalyType: 'Clinical Mismatch', riskLevel: 'low', status: 'pending_verification',
  },
  {
    sepNumber: '0199R0070924V009210', facilityName: 'RS Paru Dr. H.A. Rotinsulu', facilityMeta: 'Bandung (Tipe A)',
    careType: 'Rawat Inap • Paru', serviceDate: '2024-09-28', diagnosisCode: 'J18.9', diagnosis: 'Pneumonia Komuniti',
    claimAmount: 12300000, anomalyType: 'Upcoding', riskLevel: 'medium', status: 'pending_verification',
  },
  {
    sepNumber: '0201R0060924V005432', facilityName: 'RS Harapan Kita', facilityMeta: 'Jakarta Barat (Tipe A)',
    careType: 'Rawat Jalan • Jantung', serviceDate: '2024-09-28', diagnosisCode: 'I10', diagnosis: 'Hipertensi Esensial Primer',
    claimAmount: 3850000, anomalyType: 'Incomplete Documents', riskLevel: 'low', status: 'in_review',
  },
  {
    sepNumber: '0118R0090924V002195', facilityName: 'RSIA Bunda Jakarta', facilityMeta: 'Jakarta Pusat (Tipe C)',
    careType: 'Rawat Inap • Kebidanan', serviceDate: '2024-09-29', diagnosisCode: 'O82.0', diagnosis: 'Seksio Sesarea Elektif',
    claimAmount: 15600000, anomalyType: 'Repeat Billing', riskLevel: 'high', status: 'needs_investigation',
  },
];

const facilityPool = [
  ['RSUP Dr. Kariadi', 'Semarang (Tipe A)'],
  ['RSUD Saiful Anwar', 'Malang (Tipe A)'],
  ['RS Hasan Sadikin', 'Bandung (Tipe A)'],
  ['RSUD Sanglah', 'Denpasar (Tipe A)'],
  ['RSUD Moewardi', 'Surakarta (Tipe A)'],
];
const diagnosisPool = [
  ['A09', 'Gastroenteritis Akut'], ['J45.9', 'Asma Bronkial'], ['K80.2', 'Kolelitiasis'],
  ['M17.9', 'Osteoartritis Lutut'], ['I50.9', 'Gagal Jantung'],
];
const anomalyPool = ['Upcoding', 'Unbundling', 'Repeat Billing', 'Clinical Mismatch', 'Incomplete Documents'];

const generatedClaims = Array.from({ length: 76 }, (_, offset) => {
  const sequence = offset + 11;
  const [facilityName, facilityMeta] = facilityPool[offset % facilityPool.length];
  const [diagnosisCode, diagnosis] = diagnosisPool[offset % diagnosisPool.length];
  const riskLevel = offset < 38 ? 'high' : offset < 57 ? 'medium' : 'low';
  const status = offset < 15 ? 'needs_investigation' : offset < 37 ? 'pending_verification' : 'in_review';
  return {
    sepNumber: `${String(100 + (offset % 80)).padStart(4, '0')}R${String((offset % 9) + 1).padStart(3, '0')}1024V${String(2000 + sequence).padStart(6, '0')}`,
    facilityName,
    facilityMeta,
    careType: offset % 2 === 0 ? 'Rawat Inap • Kls 2' : 'Rawat Jalan • Spesialis',
    serviceDate: `2024-10-${String((offset % 28) + 1).padStart(2, '0')}`,
    diagnosisCode,
    diagnosis,
    claimAmount: 3250000 + (offset % 12) * 1375000,
    anomalyType: anomalyPool[offset % anomalyPool.length],
    riskLevel,
    status,
  };
});

export const mockVerificatorClaims = [
  ...goldenVerificatorClaims,
  ...[...referenceClaims, ...generatedClaims].map((claim, index) => ({
    id: `claim-${String(index + 1).padStart(3, '0')}`,
    ...claim,
    primaryDiagnosis: { code: claim.diagnosisCode, description: claim.diagnosis },
    anomalyTypes: [claim.anomalyType],
  })),
];
