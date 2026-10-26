/**
 * Riskora Risk Engine Configuration
 *
 * Configurable prototype weights and thresholds for deterministic rule-based scoring.
 * NOTE: These are demonstration and triage priority rules for BPJS verifiers,
 * NOT official BPJS sanction criteria or legal proof of fraud.
 */
module.exports = {
  // Score categories and thresholds
  scoreBands: {
    LOW: { min: 0, max: 29 },
    MEDIUM: { min: 30, max: 59 },
    HIGH: { min: 60, max: 100 }
  },

  // Maximum weight contributions per rule category (Sum = 100)
  weights: {
    duplicateBilling: 30,
    missingRequiredDocument: 20,
    fieldInconsistency: 20,
    codingOrTariffAnomaly: 15,
    lengthOfStayAnomaly: 10,
    multipleIndicatorsBonus: 5
  },

  // Thresholds and heuristics
  thresholds: {
    // Length of stay anomaly thresholds (prototype demonstration)
    los: {
      outpatientMaxDays: 0,
      inpatientStandardMaxDays: 14,
      inpatientIcuMaxDays: 10
    },
    // Tariff anomaly ratio: claim amount vs benchmark threshold (when benchmark exists)
    tariff: {
      highMultiplierThreshold: 2.0
    },
    // Minimum number of distinct triggered rules to receive the compounding bonus
    multipleIndicatorsMinCount: 2
  },

  // Known standard required documents per service type (case-specific checklists)
  requiredDocuments: {
    INPATIENT: [
      { documentType: 'sep', displayName: 'Surat Eligibilitas Peserta (SEP)', condition: 'ALWAYS' },
      { documentType: 'patient_identity', displayName: 'Kartu Peserta / Identitas', condition: 'ALWAYS' },
      { documentType: 'discharge_summary', displayName: 'Resume Medis Pasien Pulang', condition: 'ALWAYS' },
      { documentType: 'hospital_bill', displayName: 'Kuitansi / Rincian Biaya RS', condition: 'ALWAYS' },
      { documentType: 'inacbg_output', displayName: 'Lembar Verifikasi E-Claim / Grouper', condition: 'ALWAYS' },
      // Conditional documents
      { documentType: 'operation_report', displayName: 'Laporan Operasi / Bedah', condition: 'HAS_PROCEDURES' }
    ],
    OUTPATIENT: [
      { documentType: 'sep', displayName: 'Surat Eligibilitas Peserta (SEP)', condition: 'ALWAYS' },
      { documentType: 'patient_identity', displayName: 'Kartu Peserta / Identitas', condition: 'ALWAYS' },
      { documentType: 'control_letter', displayName: 'Surat Kontrol / Surat Konsul', condition: 'ALWAYS' },
      { documentType: 'hospital_bill', displayName: 'Bukti Pelayanan / Tagihan RS', condition: 'ALWAYS' }
    ]
  }
};
