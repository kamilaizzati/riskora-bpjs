const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createIsolatedTestApp } = require('./helpers/test-env');
const createApp = require('../src/app');

describe('Risk Engine & Analysis Workflow Verification', () => {
  let app;
  let tempDir;
  let cleanup;

  before(() => {
    const env = createIsolatedTestApp();
    app = env.app;
    tempDir = env.tempDir;
    cleanup = env.cleanup;
  });

  after(() => {
    if (cleanup) cleanup();
  });

  it('3 & 4. POST /api/claims/:id/analyze with synthetic claim calculates 0-100 score, rule breakdown, evidence, and limitations', async () => {
    const claimId = '66a1f8b1c200000000001001';

    const res = await request(app).post(`/api/claims/${claimId}/analyze`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const { analysisRun } = res.body.data;
    assert.ok(analysisRun);
    assert.equal(analysisRun.claimId, claimId);

    // Score validation
    assert.equal(typeof analysisRun.riskScore, 'number');
    assert.ok(analysisRun.riskScore >= 0 && analysisRun.riskScore <= 100);
    assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(analysisRun.riskCategory));

    // Rule engine metadata
    assert.equal(analysisRun.scoringMethod, 'DETERMINISTIC_RULE_ENGINE');
    assert.equal(analysisRun.isMockResult, false);

    // Rule breakdown with evidence
    assert.ok(Array.isArray(analysisRun.ruleBreakdown));
    assert.ok(analysisRun.ruleBreakdown.length >= 5);
    for (const rule of analysisRun.ruleBreakdown) {
      assert.ok(rule.ruleId, 'Rule must have ruleId');
      assert.ok(rule.name, 'Rule must have name');
      assert.ok(['PASS', 'FLAGGED', 'NOT_EVALUATED'].includes(rule.status));
      assert.ok(typeof rule.scoreContribution === 'number');
      assert.ok(rule.evidence, 'Rule must provide verifiable evidence text');
    }

    // Limitations array
    assert.ok(Array.isArray(analysisRun.limitations));
    assert.ok(analysisRun.limitations.length > 0);
  });

  it('5. Analysis creates persisted analysis-run record and distinguishes newly calculated from mock seed', async () => {
    const claimId = '66a1f8b1c200000000001002';

    // Step 1: Check initial history (only has historical mock seed run)
    const initialHistoryRes = await request(app).get(`/api/claims/${claimId}/analysis`);
    assert.equal(initialHistoryRes.status, 200);
    const mockRuns = initialHistoryRes.body.data.filter((r) => r.isMockResult === true);
    assert.ok(mockRuns.length >= 1, 'Initial claim should have historical mock seed');
    assert.equal(mockRuns[0].scoringMethod, 'HISTORICAL_MOCK_BASELINE');

    // Step 2: Trigger fresh analysis
    const analyzeRes = await request(app).post(`/api/claims/${claimId}/analyze`);
    assert.equal(analyzeRes.status, 200);
    const newRunId = analyzeRes.body.data.analysisRun.id;
    assert.equal(analyzeRes.body.data.analysisRun.isMockResult, false);
    assert.equal(analyzeRes.body.data.analysisRun.scoringMethod, 'DETERMINISTIC_RULE_ENGINE');

    // Step 3: Fetch updated history and verify both exist and are distinguished
    const updatedHistoryRes = await request(app).get(`/api/claims/${claimId}/analysis`);
    assert.equal(updatedHistoryRes.status, 200);

    const persistedNewRun = updatedHistoryRes.body.data.find((r) => r.id === newRunId);
    assert.ok(persistedNewRun, 'New analysis run must be persisted in analysis history');
    assert.equal(persistedNewRun.isMockResult, false);
    assert.equal(persistedNewRun.scoringMethod, 'DETERMINISTIC_RULE_ENGINE');

    const preservedMockRun = updatedHistoryRes.body.data.find((r) => r.isMockResult === true);
    assert.ok(preservedMockRun, 'Historical mock seed run must remain preserved');
    assert.equal(preservedMockRun.scoringMethod, 'HISTORICAL_MOCK_BASELINE');
  });

  it('6. Missing data / unknown document status does NOT automatically trigger a missing-document finding', async () => {
    // Create a new claim that has NO document metadata records at all in the database
    const newClaimRes = await request(app).post('/api/claims').send({
      noSep: '0182R0011026V888',
      noRm: 'RM-2026-888-001',
      facilityId: 'FASKES-001',
      serviceType: 'INPATIENT',
      serviceDate: '2026-10-24',
      claimAmount: 8500000,
      primaryDiagnosis: { code: 'I10', description: 'Hypertension' },
      lengthOfStayDays: 2
    });
    assert.equal(newClaimRes.status, 201);
    const claimId = newClaimRes.body.data.id;

    // Verify no documents exist for this new claim
    const docsRes = await request(app).get(`/api/claims/${claimId}/documents`);
    assert.equal(docsRes.status, 200);
    assert.equal(docsRes.body.data.length, 0);

    // Trigger analysis
    const analyzeRes = await request(app).post(`/api/claims/${claimId}/analyze`);
    assert.equal(analyzeRes.status, 200);

    // Verify MISSING_REQUIRED_DOCUMENT_CHECK returned NOT_EVALUATED, not FLAGGED
    const docRule = analyzeRes.body.data.analysisRun.ruleBreakdown.find(
      (r) => r.ruleId === 'MISSING_REQUIRED_DOCUMENT_CHECK'
    );
    assert.ok(docRule);
    assert.equal(docRule.status, 'NOT_EVALUATED');
    assert.equal(docRule.scoreContribution, 0);

    // Verify findings list does NOT contain MISSING_REQUIRED_DOCUMENT
    const hasMissingDocFinding = analyzeRes.body.data.findings.some(
      (f) => f.findingType === 'MISSING_REQUIRED_DOCUMENT'
    );
    assert.equal(hasMissingDocFinding, false, 'Unknown documents must not trigger missing-document finding');
  });

  it('7. Repeated patient record numbers (noRm) alone do NOT establish duplicate billing', async () => {
    // Existing claim RM-2026-889-321 is on 2026-10-23
    // Create claim for the same patient RM on a DIFFERENT date (2026-10-24) with a different diagnosis
    const patientClaimRes = await request(app).post('/api/claims').send({
      noSep: '0182R0011026V777',
      noRm: 'RM-2026-889-321', // Same patient RM as 66a1f8b1c200000000001001
      facilityId: 'FASKES-001',
      serviceType: 'OUTPATIENT',
      serviceDate: '2026-10-24', // Different date
      claimAmount: 750000,
      primaryDiagnosis: { code: 'K29.7', description: 'Gastritis' }
    });
    assert.equal(patientClaimRes.status, 201);
    const claimId = patientClaimRes.body.data.id;

    // Run analysis
    const analyzeRes = await request(app).post(`/api/claims/${claimId}/analyze`);
    assert.equal(analyzeRes.status, 200);

    // Check duplicate billing rule
    const dupRule = analyzeRes.body.data.analysisRun.ruleBreakdown.find(
      (r) => r.ruleId === 'DUPLICATE_BILLING_CHECK'
    );
    assert.ok(dupRule);
    assert.equal(dupRule.status, 'PASS');
    assert.equal(dupRule.scoreContribution, 0);

    const hasDuplicateFinding = analyzeRes.body.data.findings.some(
      (f) => f.findingType === 'DUPLICATE_BILLING_INDICATOR'
    );
    assert.equal(hasDuplicateFinding, false, 'Repeated patient RM alone must not trigger duplicate billing');
  });

  it('8. Test invalid claim IDs and invalid payloads', async () => {
    // Invalid claim ID on analyze returns 404
    const notFoundRes = await request(app).post('/api/claims/non-existent-claim-id-999/analyze');
    assert.equal(notFoundRes.status, 404);
    assert.equal(notFoundRes.body.success, false);
    assert.equal(notFoundRes.body.error.code, 'RESOURCE_NOT_FOUND');

    // Invalid claim ID on get claim returns 404
    const getNotFoundRes = await request(app).get('/api/claims/non-existent-claim-id-999');
    assert.equal(getNotFoundRes.status, 404);

    // Invalid payload on claim create (missing required fields) returns 400
    const badCreateRes = await request(app).post('/api/claims').send({
      claimAmount: 'invalid-string'
    });
    assert.equal(badCreateRes.status, 400);
    assert.equal(badCreateRes.body.success, false);

    // Invalid payload on claim update (invalid serviceType) returns 400
    const badUpdateRes = await request(app).patch('/api/claims/66a1f8b1c200000000001001').send({
      serviceType: 'INVALID_TYPE'
    });
    assert.equal(badUpdateRes.status, 400);
    assert.equal(badUpdateRes.body.success, false);
  });

  it('8b. JSON persistence after restarting the server instance', async () => {
    // 1. Create a claim and analyze it using the first app instance
    const createRes = await request(app).post('/api/claims').send({
      noSep: '0182R0011026V555',
      noRm: 'RM-2026-555-001',
      facilityId: 'FASKES-001',
      serviceType: 'OUTPATIENT',
      serviceDate: '2026-10-24',
      claimAmount: 650000,
      primaryDiagnosis: { code: 'J00', description: 'Acute nasopharyngitis' }
    });
    assert.equal(createRes.status, 201);
    const newClaimId = createRes.body.data.id;

    // Analyze it
    const analyzeRes = await request(app).post(`/api/claims/${newClaimId}/analyze`);
    assert.equal(analyzeRes.status, 200);
    const runId = analyzeRes.body.data.analysisRun.id;

    // 2. SIMULATE SERVER RESTART: Create a completely new Express application instance pointing to the same dataDir
    const restartedApp = createApp({ dataDir: tempDir });

    // 3. Verify that the new application instance successfully reads the persisted claim and analysis run from disk
    const getClaimRes = await request(restartedApp).get(`/api/claims/${newClaimId}`);
    assert.equal(getClaimRes.status, 200);
    assert.equal(getClaimRes.body.data.id, newClaimId);
    assert.equal(getClaimRes.body.data.noSep, '0182R0011026V555');

    const getAnalysisRes = await request(restartedApp).get(`/api/claims/${newClaimId}/analysis`);
    assert.equal(getAnalysisRes.status, 200);
    assert.ok(getAnalysisRes.body.data.some((r) => r.id === runId));
  });
});
