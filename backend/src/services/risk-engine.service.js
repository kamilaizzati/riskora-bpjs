const riskConfig = require('../config/risk-rules.config');

/**
 * Deterministic Rule-Based Risk Engine for Riskora
 * Evaluates claims against transparent, configurable triage criteria.
 */
class RiskEngineService {
  constructor(config = riskConfig) {
    this.config = config;
  }

  /**
   * Evaluate a claim and return structured risk scoring & findings
   * @param {object} params
   * @param {object} params.claim - Target claim to evaluate
   * @param {Array<object>} [params.relatedClaims=[]] - Other claims in dataset for context
   * @param {object} [params.facility=null] - Facility info
   * @param {Array<object>} [params.documents=[]] - Metadata of documents linked to this claim
   * @returns {object} Analysis result
   */
  evaluateClaim({ claim, relatedClaims = [], facility = null, documents = [] }) {
    const rules = [];
    const limitations = [];
    const findings = [];

    // Rule 1: Duplicate Billing Indicator (Max 30 pts)
    const duplicateRule = this._checkDuplicateBilling(claim, relatedClaims);
    rules.push(duplicateRule);
    if (duplicateRule.status === 'FLAGGED' && duplicateRule.finding) {
      findings.push(duplicateRule.finding);
    }

    // Rule 2: Missing Required Document (Max 20 pts)
    const missingDocsRule = this._checkMissingDocuments(claim, documents);
    rules.push(missingDocsRule);
    if (missingDocsRule.status === 'FLAGGED' && missingDocsRule.finding) {
      findings.push(missingDocsRule.finding);
    }

    // Rule 3: Field Inconsistency (Max 20 pts)
    const inconsistencyRule = this._checkFieldInconsistency(claim);
    rules.push(inconsistencyRule);
    if (inconsistencyRule.status === 'FLAGGED' && inconsistencyRule.finding) {
      findings.push(inconsistencyRule.finding);
    }

    // Rule 4: Coding or Tariff Anomaly (Max 15 pts)
    const codingTariffRule = this._checkCodingAndTariff(claim);
    rules.push(codingTariffRule);
    if (codingTariffRule.status === 'FLAGGED' && codingTariffRule.finding) {
      findings.push(codingTariffRule.finding);
    }
    if (codingTariffRule.limitation) {
      limitations.push(codingTariffRule.limitation);
    }

    // Rule 5: Length of Stay Anomaly (Max 10 pts)
    const losRule = this._checkLengthOfStay(claim);
    rules.push(losRule);
    if (losRule.status === 'FLAGGED' && losRule.finding) {
      findings.push(losRule.finding);
    }

    // Rule 6: Compounding Multiple Indicators Bonus (Max 5 pts)
    const flaggedCount = rules.filter((r) => r.status === 'FLAGGED').length;
    let compoundingContribution = 0;
    if (flaggedCount >= this.config.thresholds.multipleIndicatorsMinCount) {
      compoundingContribution = this.config.weights.multipleIndicatorsBonus;
      rules.push({
        ruleId: 'MULTI_INDICATOR_COMPOUNDING',
        name: 'Multi-Indicator Risk Amplification',
        status: 'FLAGGED',
        scoreContribution: compoundingContribution,
        maxWeight: this.config.weights.multipleIndicatorsBonus,
        evidence: `Claim triggered ${flaggedCount} independent indicators, compounding review urgency.`
      });
    } else {
      rules.push({
        ruleId: 'MULTI_INDICATOR_COMPOUNDING',
        name: 'Multi-Indicator Risk Amplification',
        status: 'PASS',
        scoreContribution: 0,
        maxWeight: this.config.weights.multipleIndicatorsBonus,
        evidence: 'Fewer than 2 independent risk indicators observed.'
      });
    }

    // Calculate total score and cap at 100
    const rawScore = rules.reduce((sum, r) => sum + (r.scoreContribution || 0), 0);
    const riskScore = Math.min(100, Math.max(0, rawScore));

    // Determine category based on configured bands
    let riskCategory = 'LOW';
    if (riskScore >= this.config.scoreBands.HIGH.min) {
      riskCategory = 'HIGH';
    } else if (riskScore >= this.config.scoreBands.MEDIUM.min) {
      riskCategory = 'MEDIUM';
    }

    // Clean rule breakdown for response (remove internal helper objects)
    const ruleBreakdown = rules.map((r) => ({
      ruleId: r.ruleId,
      name: r.name,
      status: r.status,
      scoreContribution: r.scoreContribution,
      maxWeight: r.maxWeight,
      evidence: r.evidence,
      reason: r.reason || null
    }));

    // Summary text
    let summary = 'Klaim memenuhi seluruh kriteria verifikasi awal tanpa indikator risiko yang terdeteksi.';
    if (riskCategory === 'HIGH') {
      summary = `Klaim berprioritas pemeriksaan TINGGI (${riskScore}/100) dengan ${findings.length} indikator yang memerlukan klarifikasi berkas penunjang.`;
    } else if (riskCategory === 'MEDIUM') {
      summary = `Klaim terdeteksi memiliki risiko SEDANG (${riskScore}/100); disarankan verifikasi administratif pada indikator terkait.`;
    }

    return {
      riskScore,
      riskCategory,
      scoringMethod: 'DETERMINISTIC_RULE_ENGINE',
      summary,
      ruleBreakdown,
      limitations: limitations.length > 0 ? limitations : ['Evaluasi terbatas pada metadata klaim dan berkas demo yang tersedia.'],
      findings,
      isMockResult: false
    };
  }

  /**
   * Rule 1: Duplicate Billing Check
   * A repeated patient RM alone is NOT duplicate billing.
   * Duplicate billing indicator triggers ONLY if:
   * 1) Exact same noSep in another active claim, OR
   * 2) Same patient RM + same serviceDate + identical primary diagnosis or procedure in the same billing period.
   */
  _checkDuplicateBilling(claim, relatedClaims) {
    const maxWeight = this.config.weights.duplicateBilling;
    const ruleId = 'DUPLICATE_BILLING_CHECK';
    const name = 'Pemeriksaan Duplikasi Tagihan (Duplicate Billing)';

    const otherClaims = (relatedClaims || []).filter(
      (c) => String(c.id) !== String(claim.id) && !c.isDeleted
    );

    // 1. Check duplicate SEP
    const sameSepClaims = otherClaims.filter(
      (c) => c.noSep && claim.noSep && String(c.noSep).trim() === String(claim.noSep).trim()
    );
    if (sameSepClaims.length > 0) {
      const match = sameSepClaims[0];
      return {
        ruleId,
        name,
        status: 'FLAGGED',
        scoreContribution: maxWeight,
        maxWeight,
        evidence: `Nomor SEP '${claim.noSep}' tercatat ganda pada klaim ID '${match.id}' (Tgl: ${match.serviceDate}).`,
        finding: {
          findingType: 'DUPLICATE_BILLING_INDICATOR',
          severity: 'HIGH',
          title: 'Indikasi Nomor SEP Ganda',
          description: `Nomor SEP '${claim.noSep}' ditemukan pada klaim lain dalam sistem.`,
          evidence: [
            {
              sourceType: 'claim_record',
              field: 'noSep',
              observedValue: claim.noSep,
              conflictingClaimId: match.id,
              notes: 'Duplikasi nomor SEP pada sistem klaim'
            }
          ],
          recommendedAction: 'Periksa keabsahan penerbitan SEP dan sinkronisasi data bridging RS.'
        }
      };
    }

    // 2. Check same patient + same date + same diagnosis / procedure
    const samePatientSameDate = otherClaims.filter(
      (c) =>
        c.noRm &&
        claim.noRm &&
        String(c.noRm).trim() === String(claim.noRm).trim() &&
        c.serviceDate &&
        claim.serviceDate &&
        c.serviceDate === claim.serviceDate
    );

    if (samePatientSameDate.length > 0) {
      // Check if primary diagnosis or procedures overlap on the same date
      const overlap = samePatientSameDate.find((c) => {
        const sameDiag = c.primaryDiagnosis?.code && claim.primaryDiagnosis?.code && c.primaryDiagnosis.code === claim.primaryDiagnosis.code;
        const sameProc = Array.isArray(c.procedures) && Array.isArray(claim.procedures) &&
          c.procedures.some((p1) => claim.procedures.some((p2) => (p1.code || p1) === (p2.code || p2)));
        return sameDiag || sameProc;
      });

      if (overlap) {
        return {
          ruleId,
          name,
          status: 'FLAGGED',
          scoreContribution: maxWeight,
          maxWeight,
          evidence: `Pasien RM '${claim.noRm}' memiliki klaim terpisah pada tanggal yang sama (${claim.serviceDate}) dengan diagnosis/prosedur yang bertumpuk (Klaim '${overlap.id}').`,
          finding: {
            findingType: 'DUPLICATE_BILLING_INDICATOR',
            severity: 'HIGH',
            title: 'Indikasi Tagihan Berulang Pasien Sama (Same-Day Overlap)',
            description: `Ditemukan klaim ganda untuk nomor RM ${claim.noRm} pada tanggal pelayanan yang sama.`,
            evidence: [
              {
                sourceType: 'claim_record',
                field: 'noRm',
                observedValue: claim.noRm,
                conflictingClaimId: overlap.id,
                serviceDate: claim.serviceDate
              }
            ],
            recommendedAction: 'Klarifikasi apakah merupakan episode pelayanan yang sama atau kunjungan terpisah yang sah.'
          }
        };
      }
    }

    return {
      ruleId,
      name,
      status: 'PASS',
      scoreContribution: 0,
      maxWeight,
      evidence: 'Tidak ditemukan duplikasi SEP atau tagihan bertumpuk pada tanggal pelayanan yang sama.'
    };
  }

  /**
   * Rule 2: Missing Required Document Check
   * Only evaluated when the required checklist is known.
   * Unknown document status remains NOT_EVALUATED or PASS, not missing.
   */
  _checkMissingDocuments(claim, documents) {
    const maxWeight = this.config.weights.missingRequiredDocument;
    const ruleId = 'MISSING_REQUIRED_DOCUMENT_CHECK';
    const name = 'Pemeriksaan Kelengkapan Dokumen Wajib';

    const checklist = this.config.requiredDocuments[claim.serviceType];
    if (!checklist || checklist.length === 0) {
      return {
        ruleId,
        name,
        status: 'NOT_EVALUATED',
        scoreContribution: 0,
        maxWeight,
        evidence: 'Daftar kelengkapan dokumen untuk tipe layanan ini belum dikonfigurasi.',
        reason: 'CHECKLIST_NOT_CONFIGURED'
      };
    }

    // Determine which documents are required for this specific case
    const hasProcedures = Array.isArray(claim.procedures) && claim.procedures.length > 0;
    const mandatoryDocTypes = checklist
      .filter((item) => {
        if (item.condition === 'ALWAYS') return true;
        if (item.condition === 'HAS_PROCEDURES' && hasProcedures) return true;
        return false;
      })
      .map((item) => item.documentType);

    // If no document metadata exists at all in the database, do NOT assume missing
    if (!documents || documents.length === 0) {
      return {
        ruleId,
        name,
        status: 'NOT_EVALUATED',
        scoreContribution: 0,
        maxWeight,
        evidence: 'Metadata dokumen belum terhubung pada sistem; status kelengkapan tidak dapat diverifikasi secara otomatis.',
        reason: 'NO_DOCUMENTS_ATTACHED'
      };
    }

    // Check if any mandatory document is explicitly marked MISSING or REJECTED
    const missingDocs = [];
    for (const reqType of mandatoryDocTypes) {
      const doc = documents.find((d) => d.documentType === reqType);
      if (doc && (doc.documentStatus === 'MISSING' || doc.documentStatus === 'REJECTED')) {
        missingDocs.push({
          documentType: reqType,
          status: doc.documentStatus,
          notes: doc.reviewNotes || 'Dokumen wajib belum tersedia'
        });
      }
    }

    if (missingDocs.length > 0) {
      const docList = missingDocs.map((d) => d.documentType).join(', ');
      return {
        ruleId,
        name,
        status: 'FLAGGED',
        scoreContribution: maxWeight,
        maxWeight,
        evidence: `Ditemukan dokumen wajib yang berstatus MISSING atau REJECTED: ${docList}.`,
        finding: {
          findingType: 'MISSING_REQUIRED_DOCUMENT',
          severity: 'MEDIUM',
          title: 'Ketidaklengkapan Berkas Klaim Wajib',
          description: `Terdapat berkas wajib yang belum terlampir atau ditolak: ${docList}.`,
          evidence: missingDocs.map((d) => ({
            sourceType: 'document_metadata',
            documentType: d.documentType,
            status: d.status,
            notes: d.notes
          })),
          recommendedAction: 'Minta fasilitas kesehatan untuk melengkapi berkas yang belum ada.'
        }
      };
    }

    return {
      ruleId,
      name,
      status: 'PASS',
      scoreContribution: 0,
      maxWeight,
      evidence: 'Seluruh berkas dokumen wajib yang terdata telah diunggah atau berstatus valid.'
    };
  }

  /**
   * Rule 3: Field Inconsistency Check
   * Inconsistencies between mutually dependent fields.
   */
  _checkFieldInconsistency(claim) {
    const maxWeight = this.config.weights.fieldInconsistency;
    const ruleId = 'FIELD_INCONSISTENCY_CHECK';
    const name = 'Pemeriksaan Konsistensi Data Bidang (Field Inconsistency)';

    const issues = [];

    // Check 1: Inpatient with LOS = 0 without note
    if (claim.serviceType === 'INPATIENT' && claim.lengthOfStayDays === 0) {
      issues.push("Layanan 'INPATIENT' terdaftar dengan lama rawat 0 hari tanpa keterangan rujukan/transfer.");
    }

    // Check 2: Outpatient with LOS > 0
    if (claim.serviceType === 'OUTPATIENT' && claim.lengthOfStayDays > 0) {
      issues.push(`Layanan 'OUTPATIENT' terdaftar memiliki lama rawat ${claim.lengthOfStayDays} hari.`);
    }

    // Check 3: Admission date after discharge date
    if (claim.admissionDate && claim.dischargeDate) {
      if (new Date(claim.admissionDate) > new Date(claim.dischargeDate)) {
        issues.push(`Tanggal masuk (${claim.admissionDate}) lebih akhir dari tanggal pulang (${claim.dischargeDate}).`);
      }
    }

    // Check 4: Negative claim amount
    if (typeof claim.claimAmount === 'number' && claim.claimAmount < 0) {
      issues.push(`Nominal klaim tidak valid (nilai negatif: ${claim.claimAmount}).`);
    }

    if (issues.length > 0) {
      return {
        ruleId,
        name,
        status: 'FLAGGED',
        scoreContribution: maxWeight,
        maxWeight,
        evidence: issues.join(' '),
        finding: {
          findingType: 'FIELD_INCONSISTENCY',
          severity: 'HIGH',
          title: 'Ketidakkonsistenan Nilai Bidang Klaim',
          description: issues.join(' '),
          evidence: [
            {
              sourceType: 'claim_fields',
              issues
            }
          ],
          recommendedAction: 'Koreksi data administratif klaim sebelum diajukan ke proses verifikasi lanjutan.'
        }
      };
    }

    return {
      ruleId,
      name,
      status: 'PASS',
      scoreContribution: 0,
      maxWeight,
      evidence: 'Data bidang utama konsisten dan sesuai batasan logis.'
    };
  }

  /**
   * Rule 4: Explicit Coding & Tariff Rules
   * Returns NOT_EVALUATED if benchmark or reference data is not configured.
   */
  _checkCodingAndTariff(claim) {
    const maxWeight = this.config.weights.codingOrTariffAnomaly;
    const ruleId = 'CODING_TARIFF_CHECK';
    const name = 'Pemeriksaan Keselarasan Koding dan Tarif (INA-CBG)';

    // Check 1: Extreme claim amount for outpatient without procedures
    const isOutpatient = claim.serviceType === 'OUTPATIENT';
    const noProcedures = !claim.procedures || claim.procedures.length === 0;
    const highOutpatientAmount = 15000000; // 15 million IDR threshold for non-procedural outpatient

    if (isOutpatient && noProcedures && claim.claimAmount > highOutpatientAmount) {
      return {
        ruleId,
        name,
        status: 'FLAGGED',
        scoreContribution: maxWeight,
        maxWeight,
        evidence: `Klaim rawat jalan non-tindakan memiliki nominal Rp ${claim.claimAmount.toLocaleString('id-ID')} yang melampaui batas ambang demonstrasi (Rp 15.000.000).`,
        finding: {
          findingType: 'TARIFF_REVIEW',
          severity: 'MEDIUM',
          title: 'Nominal Klaim Rawat Jalan Perlu Penelaahan',
          description: 'Tagihan rawat jalan non-prosedur melebihi ambang batas wajar untuk pemeriksaan standar.',
          evidence: [
            {
              sourceType: 'claim_record',
              field: 'claimAmount',
              observedValue: claim.claimAmount,
              threshold: highOutpatientAmount
            }
          ],
          recommendedAction: 'Verifikasi rincian tagihan RS dan kode grouper INA-CBG yang digunakan.'
        }
      };
    }

    return {
      ruleId,
      name,
      status: 'PASS',
      scoreContribution: 0,
      maxWeight,
      evidence: 'Tidak terdeteksi anomali ekstrem pada kombinasi diagnosis dasar dan tarif.',
      limitation: 'Benchmark tarif INA-CBG resmi regional belum diintegrasikan; pemeriksaan menggunakan ambang prototype.'
    };
  }

  /**
   * Rule 5: Length of Stay (LOS) Anomaly
   */
  _checkLengthOfStay(claim) {
    const maxWeight = this.config.weights.lengthOfStayAnomaly;
    const ruleId = 'LENGTH_OF_STAY_CHECK';
    const name = 'Pemeriksaan Kewajaran Lama Rawat (Length of Stay)';

    if (claim.serviceType !== 'INPATIENT') {
      return {
        ruleId,
        name,
        status: 'PASS',
        scoreContribution: 0,
        maxWeight,
        evidence: 'Pemeriksaan lama rawat inap tidak berlaku untuk layanan rawat jalan.'
      };
    }

    const los = typeof claim.lengthOfStayDays === 'number' ? claim.lengthOfStayDays : 0;
    const isIcu = (claim.serviceClass || '').toUpperCase().includes('ICU');
    const maxAllowed = isIcu
      ? this.config.thresholds.los.inpatientIcuMaxDays
      : this.config.thresholds.los.inpatientStandardMaxDays;

    if (los > maxAllowed) {
      return {
        ruleId,
        name,
        status: 'FLAGGED',
        scoreContribution: maxWeight,
        maxWeight,
        evidence: `Lama rawat (${los} hari) melampaui batas ambang demo (${maxAllowed} hari untuk ${isIcu ? 'ICU' : 'Rawat Inap Standar'}).`,
        finding: {
          findingType: 'LENGTH_OF_STAY_REVIEW',
          severity: 'LOW',
          title: 'Lama Rawat Melampaui Rata-Rata Acuan Demo',
          description: `Pasien dirawat selama ${los} hari, melebihi ambang acuan ${maxAllowed} hari.`,
          evidence: [
            {
              sourceType: 'claim_record',
              field: 'lengthOfStayDays',
              observedValue: los,
              threshold: maxAllowed
            }
          ],
          recommendedAction: 'Periksa catatan perkembangan medis pasien terintegrasi (CPPT) untuk indikasi medis perpanjangan rawat.'
        }
      };
    }

    return {
      ruleId,
      name,
      status: 'PASS',
      scoreContribution: 0,
      maxWeight,
      evidence: `Lama rawat (${los} hari) dalam batas wajar acuan demo (maks ${maxAllowed} hari).`
    };
  }
}

module.exports = new RiskEngineService();
