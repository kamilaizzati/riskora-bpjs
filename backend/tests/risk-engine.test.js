const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const riskEngine = require('../src/services/risk-engine.service');

describe('Risk Engine Unit Tests', () => {
  const cleanInpatientClaim = {
    id: 'CLM-CLEAN-01',
    noSep: 'SEP-CLEAN-01',
    noRm: 'RM-CLEAN-01',
    facilityId: 'FASKES-001',
    serviceType: 'INPATIENT',
    serviceClass: 'Kelas 1',
    serviceDate: '2026-10-24',
    admissionDate: '2026-10-21',
    dischargeDate: '2026-10-24',
    lengthOfStayDays: 3,
    primaryDiagnosis: { code: 'I10', description: 'Essential hypertension' },
    secondaryDiagnoses: [],
    procedures: [],
    claimAmount: 6500000,
    requiredDocumentTypes: ['sep', 'patient_identity', 'discharge_summary', 'hospital_bill', 'inacbg_output']
  };

  const validDocuments = [
    { documentType: 'sep', documentStatus: 'UPLOADED' },
    { documentType: 'patient_identity', documentStatus: 'UPLOADED' },
    { documentType: 'discharge_summary', documentStatus: 'UPLOADED' },
    { documentType: 'hospital_bill', documentStatus: 'UPLOADED' },
    { documentType: 'inacbg_output', documentStatus: 'UPLOADED' }
  ];

  it('Clean claim produces riskScore = 0, LOW category, and empty findings list', () => {
    const result = riskEngine.evaluateClaim({
      claim: cleanInpatientClaim,
      relatedClaims: [],
      documents: validDocuments
    });

    assert.equal(result.riskScore, 0);
    assert.equal(result.riskCategory, 'LOW');
    assert.equal(result.findings.length, 0);
    assert.equal(result.isMockResult, false);
    assert.ok(result.ruleBreakdown.every((r) => r.status === 'PASS' || r.status === 'NOT_EVALUATED'));
  });

  it('Scoring is strictly deterministic across multiple runs with identical input', () => {
    const run1 = riskEngine.evaluateClaim({
      claim: cleanInpatientClaim,
      relatedClaims: [],
      documents: validDocuments
    });
    const run2 = riskEngine.evaluateClaim({
      claim: cleanInpatientClaim,
      relatedClaims: [],
      documents: validDocuments
    });

    assert.equal(run1.riskScore, run2.riskScore);
    assert.equal(run1.riskCategory, run2.riskCategory);
    assert.deepEqual(run1.ruleBreakdown, run2.ruleBreakdown);
    assert.deepEqual(run1.findings, run2.findings);
  });

  it('Repeated patient record number (RM) alone does NOT trigger duplicate billing', () => {
    // Another claim with same RM but different date and different diagnosis
    const relatedClaims = [
      {
        id: 'CLM-RELATED-PAST',
        noSep: 'SEP-PAST-99',
        noRm: 'RM-CLEAN-01', // same patient!
        serviceDate: '2026-08-15', // different date!
        primaryDiagnosis: { code: 'K29.7' },
        isDeleted: false
      }
    ];

    const result = riskEngine.evaluateClaim({
      claim: cleanInpatientClaim,
      relatedClaims,
      documents: validDocuments
    });

    // Check duplicate billing rule
    const dupRule = result.ruleBreakdown.find((r) => r.ruleId === 'DUPLICATE_BILLING_CHECK');
    assert.equal(dupRule.status, 'PASS');
    assert.equal(dupRule.scoreContribution, 0);
    assert.equal(result.findings.some((f) => f.findingType === 'DUPLICATE_BILLING_INDICATOR'), false);
  });

  it('Exact duplicate SEP triggers duplicate billing rule', () => {
    const relatedClaims = [
      {
        id: 'CLM-CONFLICTING-SEP',
        noSep: 'SEP-CLEAN-01', // same SEP!
        noRm: 'RM-OTHER-88',
        serviceDate: '2026-10-24',
        isDeleted: false
      }
    ];

    const result = riskEngine.evaluateClaim({
      claim: cleanInpatientClaim,
      relatedClaims,
      documents: validDocuments
    });

    const dupRule = result.ruleBreakdown.find((r) => r.ruleId === 'DUPLICATE_BILLING_CHECK');
    assert.equal(dupRule.status, 'FLAGGED');
    assert.equal(dupRule.scoreContribution, 30);
    assert.ok(result.findings.some((f) => f.findingType === 'DUPLICATE_BILLING_INDICATOR'));
  });

  it('Missing document is NOT flagged when document metadata is absent/unknown', () => {
    // Empty documents array (unknown documents status)
    const result = riskEngine.evaluateClaim({
      claim: cleanInpatientClaim,
      relatedClaims: [],
      documents: [] // No document metadata available
    });

    const docRule = result.ruleBreakdown.find((r) => r.ruleId === 'MISSING_REQUIRED_DOCUMENT_CHECK');
    assert.equal(docRule.status, 'NOT_EVALUATED');
    assert.equal(docRule.scoreContribution, 0);
    assert.equal(result.findings.some((f) => f.findingType === 'MISSING_REQUIRED_DOCUMENT'), false);
  });

  it('Missing document IS flagged when a required document is explicitly MISSING', () => {
    const docsWithMissing = [
      { documentType: 'sep', documentStatus: 'UPLOADED' },
      { documentType: 'patient_identity', documentStatus: 'UPLOADED' },
      { documentType: 'discharge_summary', documentStatus: 'MISSING', reviewNotes: 'Resume medis belum diunggah' },
      { documentType: 'hospital_bill', documentStatus: 'UPLOADED' },
      { documentType: 'inacbg_output', documentStatus: 'UPLOADED' }
    ];

    const result = riskEngine.evaluateClaim({
      claim: cleanInpatientClaim,
      relatedClaims: [],
      documents: docsWithMissing
    });

    const docRule = result.ruleBreakdown.find((r) => r.ruleId === 'MISSING_REQUIRED_DOCUMENT_CHECK');
    assert.equal(docRule.status, 'FLAGGED');
    assert.equal(docRule.scoreContribution, 20);
    assert.ok(result.findings.some((f) => f.findingType === 'MISSING_REQUIRED_DOCUMENT'));
  });

  it('Risk score is capped at 100 even with all indicators triggered', () => {
    const worstCaseClaim = {
      id: 'CLM-WORST-01',
      noSep: 'SEP-WORST-01',
      noRm: 'RM-WORST-01',
      facilityId: 'FASKES-001',
      serviceType: 'INPATIENT',
      serviceClass: 'ICU',
      serviceDate: '2026-10-24',
      admissionDate: '2026-10-28', // Inconsistency: admission after discharge!
      dischargeDate: '2026-10-24',
      lengthOfStayDays: 25, // LOS anomaly: 25 days in ICU (> 10)
      primaryDiagnosis: { code: 'A41.9', description: 'Sepsis' },
      procedures: [],
      claimAmount: 95000000,
      requiredDocumentTypes: ['sep', 'discharge_summary']
    };

    const related = [
      {
        id: 'CLM-CONFLICT',
        noSep: 'SEP-WORST-01', // Duplicate SEP (+30)
        isDeleted: false
      }
    ];

    const badDocs = [
      { documentType: 'discharge_summary', documentStatus: 'MISSING' } // Missing doc (+20)
    ];

    const result = riskEngine.evaluateClaim({
      claim: worstCaseClaim,
      relatedClaims: related,
      documents: badDocs
    });

    assert.ok(result.riskScore <= 100);
    assert.equal(result.riskCategory, 'HIGH');
  });
});
