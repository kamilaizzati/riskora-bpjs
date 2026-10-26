export const mockFaskesDashboard = {
  summary: {
    totalSubmitted: 248,
    inScreening: 18,
    needsCorrection: 12,
    screeningPassed: 218,
  },
  actionRequiredClaims: [
    {
      id: 'faskes-claim-001',
      sepNumber: '0182R0011024V006214',
      careType: 'Rawat Inap • Kelas 1',
      submittedAt: '2024-10-18T09:42:00+07:00',
      primaryDiagnosis: { code: 'I63.9', description: 'Stroke Iskemik Akut' },
      claimAmount: 18450000,
      submittedInaCbgCode: 'DEMO-I-4-10-III',
      status: 'needs_correction',
      correctionInstructions: 'Lengkapi resume medis dan konfirmasi dokumen penunjang diagnosis sekunder.',
    },
    {
      id: 'faskes-claim-002',
      sepNumber: '0182R0011024V006305',
      careType: 'Rawat Inap • ICU',
      submittedAt: '2024-10-18T11:16:00+07:00',
      primaryDiagnosis: { code: 'I25.1', description: 'Penyakit Jantung Koroner' },
      claimAmount: 32800000,
      submittedInaCbgCode: 'DEMO-I-1-20-II',
      status: 'needs_correction',
      correctionInstructions: 'Unggah lembar tindakan yang telah ditandatangani dokter penanggung jawab.',
    },
    {
      id: 'faskes-claim-003',
      sepNumber: '0182R0011024V006411',
      careType: 'Rawat Jalan • Bedah',
      submittedAt: '2024-10-19T08:05:00+07:00',
      primaryDiagnosis: { code: 'K35.8', description: 'Apendisitis Akut' },
      claimAmount: 9650000,
      submittedInaCbgCode: 'DEMO-K-1-13-I',
      status: 'needs_correction',
      correctionInstructions: 'Periksa kembali kesesuaian tanggal pelayanan pada dokumen penunjang.',
    },
  ],
  claimReferences: [
    { id: 'faskes-claim-004', sepNumber: '0182R0011024V006089', status: 'screening_passed' },
    { id: 'faskes-claim-005', sepNumber: '0182R0011024V005972', status: 'in_screening' },
    { id: 'faskes-claim-006', sepNumber: '0182R0011024V005844', status: 'submitted' },
  ],
  screeningDistribution: [
    { status: 'screening_passed', label: 'Lolos Screening', value: 218, color: '#166534' },
    { status: 'in_screening', label: 'Dalam Screening', value: 18, color: '#2563EB' },
    { status: 'needs_correction', label: 'Perlu Koreksi', value: 12, color: '#D97706' },
  ],
  recentActivities: [
    {
      id: 'activity-001',
      type: 'needs_correction',
      claimId: 'faskes-claim-001',
      sepNumber: '0182R0011024V006214',
      description: 'Klaim memerlukan kelengkapan resume medis sebelum diproses kembali.',
      occurredAt: '2024-10-21T14:20:00+07:00',
      relativeTime: '2 jam lalu',
    },
    {
      id: 'activity-002',
      type: 'screening_passed',
      claimId: 'faskes-claim-004',
      sepNumber: '0182R0011024V006089',
      description: 'Klaim telah lolos pemeriksaan awal dan diteruskan ke alur berikutnya.',
      occurredAt: '2024-10-21T11:30:00+07:00',
      relativeTime: '5 jam lalu',
    },
    {
      id: 'activity-003',
      type: 'in_screening',
      claimId: 'faskes-claim-005',
      sepNumber: '0182R0011024V005972',
      description: 'Berkas klaim sedang melalui proses screening awal Riskora.',
      occurredAt: '2024-10-20T16:10:00+07:00',
      relativeTime: '1 hari lalu',
    },
    {
      id: 'activity-004',
      type: 'submitted',
      claimId: 'faskes-claim-006',
      sepNumber: '0182R0011024V005844',
      description: 'Pengajuan klaim berhasil dicatat dan menunggu proses screening.',
      occurredAt: '2024-10-20T09:15:00+07:00',
      relativeTime: '1 hari lalu',
    },
  ],
};

const claimTemplates = [
  { diagnosis: { code: 'E11.9', description: 'Diabetes Melitus Tipe 2' }, careType: 'Rawat Jalan • Penyakit Dalam', amount: 4250000 },
  { diagnosis: { code: 'J18.9', description: 'Pneumonia, Tidak Spesifik' }, careType: 'Rawat Inap • Kelas 2', amount: 9600000 },
  { diagnosis: { code: 'I10', description: 'Hipertensi Esensial' }, careType: 'Rawat Jalan • Kardiologi', amount: 2850000 },
  { diagnosis: { code: 'K29.7', description: 'Gastritis, Tidak Spesifik' }, careType: 'Rawat Jalan • Gastro', amount: 3120000 },
];
const claimStatuses = ['screening_passed', 'in_screening', 'submitted', 'screening_passed'];

mockFaskesDashboard.allClaims = [
  ...mockFaskesDashboard.actionRequiredClaims,
  ...Array.from({ length: 21 }, (_, index) => {
    const template = claimTemplates[index % claimTemplates.length];
    const sequence = String(6089 - index * 17).padStart(6, '0');
    return {
      id: `faskes-claim-${String(index + 4).padStart(3, '0')}`,
      sepNumber: `0182R0011024V${sequence}`,
      careType: template.careType,
      submittedAt: new Date(Date.UTC(2024, 9, 17 - index, 3 + (index % 7), 15)).toISOString(),
      primaryDiagnosis: template.diagnosis,
      claimAmount: template.amount + index * 125000,
      submittedInaCbgCode: `DEMO-${template.diagnosis.code.replace('.', '-')}-${(index % 3) + 1}`,
      status: claimStatuses[index % claimStatuses.length],
    };
  }),
];
