export const goldenDemo = {
  id: 'golden-demo-2026-09',
  batchId: 'BATCH-RSK-202609-01',
  billingPeriod: '2026-09',
  facility: { id: 'facility-001', code: '0182R001', name: 'RSUP Dr. Sardjito', meta: 'Yogyakarta (Tipe A)' },
  handoffStatus: 'marked_forwarded',
  claims: [
    { id:'demo-claim-001', claimId:'CLM-DEMO-202609-001', patientId:'PSN-DEMO-001', episodeId:'EPI-DEMO-001', sepNumber:'0182R0010926V006114', serviceDate:'2026-09-14', serviceEnd:'2026-09-18', careType:'Rawat Inap • Kelas 1', serviceType:'inpatient', diagnosisCode:'J18.9', diagnosis:'Pneumonia', inaCbgCode:'J-4-16-I', claimAmount:12800000, anomalyType:'Repeat Billing', riskLevel:'high', verifierStatus:'needs_investigation', journeyNote:'Klaim pertama pada episode pneumonia yang sama.' },
    { id:'demo-claim-002', claimId:'CLM-DEMO-202609-002', patientId:'PSN-DEMO-001', episodeId:'EPI-DEMO-001', sepNumber:'0182R0010926V006115', serviceDate:'2026-09-14', serviceEnd:'2026-09-18', careType:'Rawat Inap • Kelas 1', serviceType:'inpatient', diagnosisCode:'J18.9', diagnosis:'Pneumonia', inaCbgCode:'J-4-16-I', claimAmount:12800000, anomalyType:'Repeat Billing', riskLevel:'high', verifierStatus:'pending_verification', journeyNote:'Klaim kedua pada episode yang sama; memerlukan klarifikasi duplikasi.' },
    { id:'demo-claim-003', claimId:'CLM-DEMO-202609-003', patientId:'PSN-DEMO-002', episodeId:'EPI-DEMO-002', sepNumber:'0182R0010926V006116', serviceDate:'2026-09-20', serviceEnd:'2026-09-20', careType:'Rawat Jalan • Hemodialisis', serviceType:'outpatient', diagnosisCode:'N18.5', diagnosis:'Penyakit Ginjal Kronis Stadium 5', inaCbgCode:'N-3-15-0', claimAmount:1100000, anomalyType:'Clinical Mismatch', riskLevel:'low', verifierStatus:'in_review', journeyNote:'Sesi hemodialisis rutin; relasi longitudinal bersifat informatif.' },
    { id:'demo-claim-004', claimId:'CLM-DEMO-202609-004', patientId:'PSN-DEMO-003', episodeId:'EPI-DEMO-003', sepNumber:'0182R0010926V006117', serviceDate:'2026-09-22', serviceEnd:'2026-09-22', careType:'Rawat Jalan • Bedah', serviceType:'outpatient', diagnosisCode:'K35.8', diagnosis:'Apendisitis Akut', inaCbgCode:'K-1-13-II', claimAmount:9650000, anomalyType:'Incomplete Documents', riskLevel:'medium', verifierStatus:'pending_verification', journeyNote:'Koreksi metadata dokumen telah selesai sebelum finalisasi batch.' },
  ],
};

export const goldenFaskesClaims = goldenDemo.claims.map((claim, index) => ({
  ...claim, facilityId:goldenDemo.facility.id, billingPeriod:goldenDemo.billingPeriod,
  primaryDiagnosis:{code:claim.diagnosisCode,description:claim.diagnosis}, submittedInaCbgCode:claim.inaCbgCode,
  submittedAt:`2026-09-${String(24+index).padStart(2,'0')}T09:15:00+07:00`, screeningStatus:'passed', screeningFindings:[],
  status:'screening_passed', correctionStatus:index===3?'completed':'not_started', correctionIndicator:false,
  requiredAdminComplete:true, documentMetadataComplete:true, careClassNeedsReview:false,
  vclaimStatus:'matching', verificationStatus:'awaiting', workflowStage:'handoff', supportingDocumentStatus:'available',
}));

export const goldenVerificatorClaims = goldenDemo.claims.map((claim) => ({
  id:claim.id, claimId:claim.claimId, patientId:claim.patientId, episodeId:claim.episodeId, sepNumber:claim.sepNumber,
  facilityId:goldenDemo.facility.id, facilityName:goldenDemo.facility.name, facilityMeta:goldenDemo.facility.meta,
  careType:claim.careType, serviceDate:claim.serviceDate, serviceEnd:claim.serviceEnd,
  diagnosisCode:claim.diagnosisCode, diagnosis:claim.diagnosis, primaryDiagnosis:{code:claim.diagnosisCode,description:claim.diagnosis},
  inaCbgCode:claim.inaCbgCode, claimAmount:claim.claimAmount, anomalyType:claim.anomalyType, anomalyTypes:[claim.anomalyType],
  riskLevel:claim.riskLevel, status:claim.verifierStatus, sourceBatchId:goldenDemo.batchId, handoffStatus:goldenDemo.handoffStatus,
  journeyNote:claim.journeyNote, synthetic:true,
}));
