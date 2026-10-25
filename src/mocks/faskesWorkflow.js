const facility = { id: 'facility-001', name: 'RSUP Dr. Sardjito', code: '0182R001' };

export const mockBillingPeriods = [
  { id: '2026-10', label: 'Oktober 2026', status: 'in_progress' },
  { id: '2026-09', label: 'September 2026', status: 'bav_received' },
  { id: '2026-08', label: 'Agustus 2026', status: 'completed' },
];

const aggregates = {
  '2026-10': { batchId: 'BATCH-RSK-202610-01', totalClaims: 980, vclaimMatching: 930, vclaimNonMatching: 50, supportingDocuments: { expectedClaimSets: 930, availableClaimSets: 862, incompleteClaimSets: 68 }, bav: { received: false, passed: null, pending: null, notEligible: null } },
  '2026-09': { batchId: 'BATCH-RSK-202609-01', totalClaims: 1200, vclaimMatching: 1145, vclaimNonMatching: 55, supportingDocuments: { expectedClaimSets: 1145, availableClaimSets: 1100, incompleteClaimSets: 45 }, bav: { received: true, receivedAt: '2026-10-18T09:30:00+07:00', passed: 1062, pending: 70, notEligible: 13 } },
  '2026-08': { batchId: 'BATCH-RSK-202608-01', totalClaims: 1080, vclaimMatching: 1038, vclaimNonMatching: 42, supportingDocuments: { expectedClaimSets: 1038, availableClaimSets: 1038, incompleteClaimSets: 0 }, bav: { received: true, receivedAt: '2026-09-17T10:15:00+07:00', passed: 992, pending: 38, notEligible: 8 } },
};

const stageDefinitions = {
  '2026-10': [
    ['eclaim', 'E-Claim', 'Data klaim periode telah disiapkan oleh tim Casemix.', 'completed', '980 klaim dalam TXT periode'],
    ['vclaim', 'Virtual Claim / VClaim', 'Umpan balik kecocokan administratif telah diterima.', 'attention', '930 sesuai · 50 tidak sesuai'],
    ['purification', 'Purifikasi Awal', 'Batch berada pada checkpoint purifikasi awal.', 'in_progress', '930 klaim siap dipantau'],
    ['jkn_drive', 'JKN Drive', 'Kelengkapan set dokumen pendukung sedang dipantau.', 'attention', '862 dari 930 set tersedia'],
    ['bav', 'Verifikasi BPJS & BAV', 'Menunggu hasil verifikasi dan Berita Acara Verifikasi.', 'waiting', 'BAV belum diterima'],
  ],
  '2026-09': [
    ['eclaim', 'E-Claim', 'TXT periode telah disiapkan dari proses coding individual.', 'completed', '1.200 klaim dalam TXT periode'],
    ['vclaim', 'Virtual Claim / VClaim', 'Umpan balik kecocokan administratif telah diterima.', 'completed', '1.145 sesuai · 55 tidak sesuai'],
    ['purification', 'Purifikasi Awal', 'Checkpoint purifikasi awal telah tercatat.', 'completed', '1.145 klaim diproses'],
    ['jkn_drive', 'JKN Drive', 'Status set dokumen pendukung telah dicocokkan.', 'attention', '1.100 dari 1.145 set tersedia'],
    ['bav', 'Verifikasi BPJS & BAV', 'Berita Acara Verifikasi telah diterima.', 'completed', '1.062 lolos · 70 pending · 13 tidak layak'],
  ],
  '2026-08': [
    ['eclaim', 'E-Claim', 'TXT periode telah disiapkan.', 'completed', '1.080 klaim'],
    ['vclaim', 'Virtual Claim / VClaim', 'Umpan balik VClaim telah diterima.', 'completed', '1.038 sesuai · 42 tidak sesuai'],
    ['purification', 'Purifikasi Awal', 'Checkpoint purifikasi telah selesai.', 'completed', '1.038 klaim'],
    ['jkn_drive', 'JKN Drive', 'Seluruh set dokumen relevan tersedia.', 'completed', '1.038 dari 1.038 set tersedia'],
    ['bav', 'Verifikasi BPJS & BAV', 'BAV periode telah diterima.', 'completed', '992 lolos · 38 pending · 8 tidak layak'],
  ],
};

const diagnoses = [['I63.9', 'Stroke Iskemik Akut'], ['I25.1', 'Penyakit Jantung Koroner'], ['K35.8', 'Apendisitis Akut'], ['N18.5', 'Penyakit Ginjal Kronis Stadium 5'], ['E11.9', 'Diabetes Melitus Tipe 2'], ['J18.9', 'Pneumonia']];
const correctionReasons = ['Kelas rawat tidak sesuai', 'Memerlukan keterangan penjamin tambahan', 'Ketidaksesuaian data administrasi'];
const documentDefinitions = {
  inpatient: [['patient_identity', 'Identitas pasien', true], ['ina_cbg', 'Hasil coding INA-CBG', true], ['medical_resume', 'Resume medis', true], ['sep', 'SEP', true], ['hospital_billing', 'Billing rumah sakit', true], ['admission_request', 'Surat pengantar rawat inap', true], ['operation_report', 'Laporan operasi', 'conditional'], ['supporting_exam', 'Pemeriksaan penunjang', 'conditional'], ['death_certificate', 'Surat kematian', 'conditional'], ['birth_certificate', 'Surat kelahiran', 'conditional'], ['partograph', 'Partograf', 'conditional'], ['newborn_screening', 'Skrining bayi baru lahir', 'conditional'], ['accident_chronology', 'Kronologi kecelakaan', 'conditional']],
  outpatient: [['patient_identity', 'Identitas pasien', true], ['ina_cbg', 'Hasil coding INA-CBG', true], ['consultation_response', 'Jawaban konsultasi', true], ['sep', 'SEP', true], ['hospital_billing', 'Billing rumah sakit', true], ['control_letter', 'Surat kontrol', true], ['supporting_exam', 'Pemeriksaan penunjang', 'conditional'], ['hemodialysis_statement', 'Keterangan hemodialisis >2 kali/minggu', 'conditional'], ['audiometry', 'Hasil audiometri', 'conditional']],
};

function createDocuments(serviceType, index, incomplete) {
  return documentDefinitions[serviceType].map(([id, label, requirement], documentIndex) => {
    const applicable = requirement === true || (index + documentIndex) % 4 === 0;
    return { id, label, requirement: requirement === true ? 'required' : 'conditional', status: !applicable ? 'not_required' : incomplete && documentIndex === 2 ? 'missing' : 'available' };
  });
}

function createPeriodClaims(period, count, offset) {
  return Array.from({ length: count }, (_, index) => {
    const serviceType = index % 3 === 0 ? 'outpatient' : 'inpatient';
    const vclaimStatus = index < 3 ? 'non_matching' : 'matching';
    const correctionReason = vclaimStatus === 'non_matching' ? correctionReasons[index % correctionReasons.length] : null;
    const aggregate = aggregates[period];
    const verificationStatus = !aggregate.bav.received ? 'awaiting' : vclaimStatus === 'non_matching' ? 'not_available' : index % 9 === 0 ? 'pending' : index % 11 === 0 ? 'not_eligible' : 'passed';
    const [code, description] = diagnoses[index % diagnoses.length];
    const documentIncomplete = index % 7 === 0;
    return {
      id: `faskes-claim-${String(offset + index + 1).padStart(3, '0')}`, claimId: `CLM-FKS-${period.replace('-', '')}-${String(index + 1).padStart(4, '0')}`,
      facilityId: facility.id, billingPeriod: period, sepNumber: `${facility.code}${period.replace('-', '').slice(2)}V${String(6100 + offset + index).padStart(6, '0')}`,
      serviceType, careType: serviceType === 'inpatient' ? `Rawat Inap • Kelas ${(index % 3) + 1}` : 'Rawat Jalan • Spesialis', submittedAt: `${period}-${String((index % 24) + 1).padStart(2, '0')}T0${index % 9}:15:00+07:00`,
      primaryDiagnosis: { code, description }, claimAmount: 3200000 + index * 725000, submittedInaCbgCode: `DEMO-${serviceType === 'inpatient' ? 'RI' : 'RJ'}-${index + 1}`,
      vclaimStatus, correctionReason, correctionIndicator: Boolean(correctionReason) || documentIncomplete,
      workflowStage: correctionReason ? 'vclaim' : documentIncomplete ? 'jkn_drive' : aggregate.bav.received ? 'bav' : 'purification',
      supportingDocumentStatus: documentIncomplete ? 'incomplete' : 'available', verificationStatus,
      status: correctionReason || documentIncomplete ? 'needs_correction' : verificationStatus === 'passed' ? 'screening_passed' : 'in_screening',
      correctionInstructions: correctionReason || (documentIncomplete ? 'Lengkapi dokumen pendukung yang masih belum tersedia.' : null), documents: createDocuments(serviceType, index, documentIncomplete),
    };
  });
}

export const mockFaskesClaims = [...createPeriodClaims('2026-10', 14, 0), ...createPeriodClaims('2026-09', 14, 14), ...createPeriodClaims('2026-08', 10, 28)];

const activities = {
  '2026-10': [['eclaim_prepared', 'TXT E-Claim periode disiapkan', '980 klaim tercatat pada batch simulasi Oktober 2026.'], ['vclaim_feedback', 'Umpan balik VClaim diterima', '930 klaim sesuai dan 50 klaim memerlukan perbaikan.'], ['correction_required', 'Koreksi data diperlukan', 'Ketidaksesuaian administratif perlu ditindaklanjuti melalui proses operasional yang berlaku.'], ['document_updated', 'Status dokumen pendukung diperbarui', '862 dari 930 set dokumen klaim relevan tersedia.']],
  '2026-09': [['bav_received', 'BAV periode diterima', 'Hasil simulasi mencatat 1.062 lolos, 70 pending, dan 13 tidak layak.'], ['document_updated', 'Status dokumen pendukung diperbarui', '1.100 dari 1.145 set dokumen klaim relevan tersedia.'], ['vclaim_feedback', 'Umpan balik VClaim diterima', '1.145 klaim sesuai dan 55 klaim tidak sesuai.'], ['eclaim_prepared', 'TXT E-Claim periode disiapkan', '1.200 klaim tercatat pada batch simulasi September 2026.']],
};

function buildPeriod(period) {
  const aggregate = aggregates[period];
  const claims = mockFaskesClaims.filter((claim) => claim.billingPeriod === period);
  return {
    facility, period: mockBillingPeriods.find((item) => item.id === period), ...aggregate, stages: stageDefinitions[period].map(([id, name, description, status, summary]) => ({ id, name, description, status, summary })), claims,
    actionRequiredClaims: claims.filter((claim) => claim.correctionIndicator),
    summary: { totalClaims: aggregate.totalClaims, vclaimMatching: aggregate.vclaimMatching, needsCorrection: aggregate.vclaimNonMatching, awaitingVerification: aggregate.bav.received ? aggregate.bav.pending : aggregate.vclaimMatching },
    statusDistribution: [{ status: 'matching', label: 'Sesuai VClaim', value: aggregate.vclaimMatching, color: '#166534' }, { status: 'non_matching', label: 'Tidak Sesuai', value: aggregate.vclaimNonMatching, color: '#D97706' }],
    recentActivities: (activities[period] || activities['2026-09']).map(([type, title, description], index) => ({ id: `${period}-activity-${index + 1}`, type, title, description, occurredAt: `${period}-25T${12 - index}:00:00+07:00`, relativeTime: index === 0 ? 'Terbaru' : `${index + 1} hari lalu`, period })),
  };
}

export const mockFaskesPeriods = Object.fromEntries(mockBillingPeriods.map((period) => [period.id, buildPeriod(period.id)]));
