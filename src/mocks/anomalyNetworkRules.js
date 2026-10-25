export const relationshipTypes = {
  potential_duplicate: { label: 'Potensi Duplikasi', color: '#DC2626' },
  overlapping_episode: { label: 'Episode Tumpang Tindih', color: '#D97706' },
  repeated_procedure: { label: 'Tindakan Berulang', color: '#7C3AED' },
  informational: { label: 'Relasi Informatif', color: '#64748B' },
};

const position = (x, y) => ({ x, y });
const diagnosis = (code, description) => ({ code, description });
const claim = (id, shortId, patientId, serviceStart, serviceEnd, fields) => ({
  id, shortId, patientId, sepNumber: `SEP-SYN-${shortId.slice(-3)}`, serviceStart, serviceEnd,
  serviceDate: serviceStart, period: serviceStart.slice(0, 7), facilityName: 'RS Sintetis Nusantara',
  claimAmount: 0, careType: 'Rawat Inap', procedureCodes: [], clusterId: null,
  needsReviewAttention: false, ...fields,
});

export const mockAnomalyNodes = [
  // Skenario 1A: pasien dan episode yang sama, konteks klaim hampir identik.
  claim('syn-dup-01', 'CLM-D01', 'PSN-SYN-A01', '2026-10-03', '2026-10-08', { episodeId: 'EPI-A01', primaryDiagnosis: diagnosis('J18.9', 'Pneumonia'), inaCbgCode: 'J-4-16-I', procedureCodes: ['RADIOGRAFI-TORAKS'], claimAmount: 12800000, position: position(80, 80), clusterId: 'review-duplicate', needsReviewAttention: true }),
  claim('syn-dup-02', 'CLM-D02', 'PSN-SYN-A01', '2026-10-03', '2026-10-08', { episodeId: 'EPI-A01', primaryDiagnosis: diagnosis('J18.9', 'Pneumonia'), inaCbgCode: 'J-4-16-I', procedureCodes: ['RADIOGRAFI-TORAKS'], claimAmount: 12800000, position: position(350, 90), clusterId: 'review-duplicate', needsReviewAttention: true }),
  // Skenario 1B: pasien sama dan rawat inap tumpang tindih, tetapi episode/konteks berbeda.
  claim('syn-overlap-01', 'CLM-O01', 'PSN-SYN-B02', '2026-10-11', '2026-10-16', { episodeId: 'EPI-B01', primaryDiagnosis: diagnosis('K35.8', 'Apendisitis akut'), inaCbgCode: 'K-1-13-II', procedureCodes: ['APPENDEKTOMI'], claimAmount: 15400000, position: position(80, 300), clusterId: 'review-overlap', needsReviewAttention: true, overlapReviewContext: 'Dua episode rawat inap aktif tercatat bersamaan tanpa penanda transfer.' }),
  claim('syn-overlap-02', 'CLM-O02', 'PSN-SYN-B02', '2026-10-15', '2026-10-19', { episodeId: 'EPI-B02', primaryDiagnosis: diagnosis('T81.4', 'Infeksi pascatindakan'), inaCbgCode: 'K-4-10-II', procedureCodes: ['PERAWATAN-LUKA'], claimAmount: 9100000, position: position(350, 310), clusterId: 'review-overlap', needsReviewAttention: true, overlapReviewContext: 'Dua episode rawat inap aktif tercatat bersamaan tanpa penanda transfer.' }),
  // Skenario 2: hemodialisis berulang yang secara klinis dapat diharapkan.
  claim('syn-hd-01', 'CLM-H01', 'PSN-SYN-C03', '2026-10-02', '2026-10-02', { episodeId: 'EPI-HD-01', primaryDiagnosis: diagnosis('N18.5', 'Penyakit ginjal kronis stadium 5'), inaCbgCode: 'N-3-15-0', procedureCodes: ['39.95'], claimAmount: 1100000, careType: 'Rawat Jalan', position: position(650, 70), clusterId: 'info-hemodialysis' }),
  claim('syn-hd-02', 'CLM-H02', 'PSN-SYN-C03', '2026-10-05', '2026-10-05', { episodeId: 'EPI-HD-02', primaryDiagnosis: diagnosis('N18.5', 'Penyakit ginjal kronis stadium 5'), inaCbgCode: 'N-3-15-0', procedureCodes: ['39.95'], claimAmount: 1100000, careType: 'Rawat Jalan', position: position(890, 75), clusterId: 'info-hemodialysis' }),
  claim('syn-hd-03', 'CLM-H03', 'PSN-SYN-C03', '2026-10-09', '2026-10-09', { episodeId: 'EPI-HD-03', primaryDiagnosis: diagnosis('N18.5', 'Penyakit ginjal kronis stadium 5'), inaCbgCode: 'N-3-15-0', procedureCodes: ['39.95'], claimAmount: 1100000, careType: 'Rawat Jalan', position: position(770, 230), clusterId: 'info-hemodialysis' }),
  // Skenario 3: diagnosis stroke sama, pasien berbeda—tidak dibuat edge.
  claim('syn-stroke-01', 'CLM-S01', 'PSN-SYN-D04', '2026-10-20', '2026-10-24', { episodeId: 'EPI-S01', primaryDiagnosis: diagnosis('I63.9', 'Stroke iskemik'), inaCbgCode: 'G-4-14-II', procedureCodes: ['CT-KEPALA'], claimAmount: 18450000, position: position(70, 540) }),
  claim('syn-stroke-02', 'CLM-S02', 'PSN-SYN-E05', '2026-10-21', '2026-10-25', { episodeId: 'EPI-S02', primaryDiagnosis: diagnosis('I63.9', 'Stroke iskemik'), inaCbgCode: 'G-4-14-II', procedureCodes: ['CT-KEPALA'], claimAmount: 19200000, position: position(330, 545) }),
  // Skenario 4: diagnosis berbeda dan nominal mirip—tidak dibuat edge.
  claim('syn-amount-stroke', 'CLM-A01', 'PSN-SYN-F06', '2026-09-03', '2026-09-07', { episodeId: 'EPI-A11', primaryDiagnosis: diagnosis('I63.9', 'Stroke iskemik'), inaCbgCode: 'G-4-14-II', claimAmount: 15000000, position: position(610, 500) }),
  claim('syn-amount-ckd', 'CLM-A02', 'PSN-SYN-G07', '2026-09-18', '2026-09-22', { episodeId: 'EPI-A12', primaryDiagnosis: diagnosis('N18.5', 'Penyakit ginjal kronis stadium 5'), inaCbgCode: 'N-4-10-II', claimAmount: 15050000, position: position(870, 510) }),
  // Skenario 5: pasien sama tetapi episode berjauhan—tidak dibuat edge.
  claim('syn-separate-01', 'CLM-P01', 'PSN-SYN-H08', '2026-08-01', '2026-08-03', { episodeId: 'EPI-P01', primaryDiagnosis: diagnosis('A09', 'Gastroenteritis'), inaCbgCode: 'K-4-17-I', claimAmount: 3200000, position: position(1080, 210) }),
  claim('syn-separate-02', 'CLM-P02', 'PSN-SYN-H08', '2026-10-12', '2026-10-13', { episodeId: 'EPI-P02', primaryDiagnosis: diagnosis('J06.9', 'Infeksi saluran napas atas'), inaCbgCode: 'J-4-15-I', claimAmount: 1800000, careType: 'Rawat Jalan', position: position(1100, 520) }),
  // Relasi informatif eksplisit: kontrol setelah rawat inap, bukan anomali.
  claim('syn-transition-01', 'CLM-T01', 'PSN-SYN-I09', '2026-09-08', '2026-09-11', { episodeId: 'EPI-T01', careTransitionId: 'TRANS-T01', legitimateTransition: true, primaryDiagnosis: diagnosis('I50.9', 'Gagal jantung'), inaCbgCode: 'I-4-12-II', claimAmount: 9600000, position: position(610, 700), clusterId: 'info-transition' }),
  claim('syn-transition-02', 'CLM-T02', 'PSN-SYN-I09', '2026-09-18', '2026-09-18', { episodeId: 'EPI-T02', careTransitionId: 'TRANS-T01', legitimateTransition: true, primaryDiagnosis: diagnosis('I50.9', 'Gagal jantung'), inaCbgCode: 'Q-5-44-0', claimAmount: 650000, careType: 'Rawat Jalan', position: position(870, 700), clusterId: 'info-transition' }),
];

const overlaps = (a, b) => new Date(a.serviceStart) <= new Date(b.serviceEnd) && new Date(b.serviceStart) <= new Date(a.serviceEnd);
const daysBetween = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000);
const edge = (id, source, target, relationshipType, explanation, supportingEvidence, reviewStatus, reviewReason) => ({
  id, source, target, type: relationshipType, relationshipType, label: relationshipTypes[relationshipType].label,
  explanation, supportingEvidence, reviewStatus, reviewReason,
});

export function generateClaimRelationships(nodes) {
  const edges = [];
  for (let i = 0; i < nodes.length; i += 1) for (let j = i + 1; j < nodes.length; j += 1) {
    const a = nodes[i]; const b = nodes[j];
    if (a.patientId !== b.patientId) continue;
    if (a.careTransitionId && a.careTransitionId === b.careTransitionId && a.legitimateTransition && b.legitimateTransition) {
      edges.push(edge(`information-${a.id}-${b.id}`, a.id, b.id, 'informational', 'Dua klaim milik pasien pseudonim yang sama membentuk transisi rawat inap ke kontrol rawat jalan yang dicatat secara eksplisit.', { sharedPatientId: a.patientId, episodeIds: [a.episodeId, b.episodeId], serviceIntervals: [`${a.serviceStart}–${a.serviceEnd}`, `${b.serviceStart}–${b.serviceEnd}`], context: 'Kontrol pascarawat inap yang tercatat sebagai transisi pelayanan.' }, 'Informational', 'Interval tidak tumpang tindih dan data sintetis mencantumkan konteks transisi yang wajar; relasi tidak ditandai sebagai anomali.'));
      continue;
    }
    const sameContext = a.episodeId === b.episodeId && a.careType === b.careType && a.primaryDiagnosis?.code === b.primaryDiagnosis?.code && a.inaCbgCode === b.inaCbgCode;
    if (overlaps(a, b) && sameContext) {
      edges.push(edge(`duplicate-${a.id}-${b.id}`, a.id, b.id, 'potential_duplicate', 'Dua klaim milik pasien pseudonim yang sama, mencakup episode pelayanan yang sama, dan memiliki konteks klinis serta kelompok klaim yang cocok.', { sharedPatientId: a.patientId, episodeId: a.episodeId, serviceIntervals: [`${a.serviceStart}–${a.serviceEnd}`, `${b.serviceStart}–${b.serviceEnd}`], diagnosisCode: a.primaryDiagnosis.code, inaCbgCode: a.inaCbgCode }, 'Requires Review', 'Kemiripan konteks pada episode yang sama perlu diperiksa untuk memastikan tidak ada pencatatan klaim ganda.'));
      continue;
    }
    if (overlaps(a, b) && a.careType === 'Rawat Inap' && b.careType === 'Rawat Inap' && a.overlapReviewContext && b.overlapReviewContext) {
      edges.push(edge(`overlap-${a.id}-${b.id}`, a.id, b.id, 'overlapping_episode', 'Interval dua episode rawat inap pasien pseudonim yang sama saling tumpang tindih dan data simulasi tidak mencantumkan penanda transfer.', { sharedPatientId: a.patientId, serviceIntervals: [`${a.serviceStart}–${a.serviceEnd}`, `${b.serviceStart}–${b.serviceEnd}`], episodeIds: [a.episodeId, b.episodeId], context: a.overlapReviewContext }, 'Requires Review', 'Perlu konfirmasi apakah terdapat transfer, koreksi tanggal, atau dua episode yang benar-benar berbeda.'));
      continue;
    }
    const sharedProcedures = a.procedureCodes.filter((code) => b.procedureCodes.includes(code));
    if (sharedProcedures.length && daysBetween(a.serviceStart, b.serviceStart) <= 30) {
      const hemodialysis = sharedProcedures.includes('39.95');
      edges.push(edge(`procedure-${a.id}-${b.id}`, a.id, b.id, 'repeated_procedure', hemodialysis ? 'Pasien pseudonim yang sama memiliki sesi hemodialisis berulang pada tanggal berbeda. Relasi ini ditampilkan sebagai konteks longitudinal, bukan indikasi anomali.' : 'Pasien pseudonim yang sama memiliki tindakan berulang dalam jendela tinjauan 30 hari.', { sharedPatientId: a.patientId, procedureCodes: sharedProcedures, serviceDates: [a.serviceStart, b.serviceStart], reviewWindowDays: 30, medicallyExpectedRecurringService: hemodialysis }, 'Informational', hemodialysis ? 'Hemodialisis dapat merupakan layanan berulang yang diharapkan; tidak ada aturan frekuensi klinis tervalidasi pada prototipe.' : 'Belum tersedia aturan frekuensi klinis tervalidasi untuk meningkatkan relasi menjadi perlu review.'));
    }
  }
  return edges;
}

export const mockAnomalyEdges = generateClaimRelationships(mockAnomalyNodes);
export const mockAnomalyNetwork = {
  generatedAt: '2026-10-25T08:00:00.000Z',
  disclaimer: 'Relasi berbasis aturan pada data sintetis membantu peninjauan konteks klaim. Relasi bukan kesimpulan fraud dan tidak menggunakan skor AI.',
  nodes: mockAnomalyNodes,
  edges: mockAnomalyEdges,
};
