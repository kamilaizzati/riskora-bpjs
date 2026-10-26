const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createIsolatedTestApp } = require('./helpers/test-env');

describe('Claims API', () => {
  let app;
  let cleanup;

  before(() => {
    const env = createIsolatedTestApp();
    app = env.app;
    cleanup = env.cleanup;
  });

  after(() => {
    if (cleanup) cleanup();
  });

  it('GET /api/claims should return paginated list of claims with meta', async () => {
    const res = await request(app).get('/api/claims?page=1&limit=5');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 5);
    assert.equal(res.body.meta.page, 1);
    assert.equal(res.body.meta.limit, 5);
    assert.ok(res.body.meta.totalRecords >= 20);
    assert.ok(res.body.meta.totalPages >= 4);
    assert.equal(res.body.meta.hasNextPage, true);
  });

  it('GET /api/claims with invalid page returns 400', async () => {
    const res = await request(app).get('/api/claims?page=-1');

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'BAD_REQUEST');
  });

  it('GET /api/claims with invalid limit returns 400', async () => {
    const res = await request(app).get('/api/claims?limit=500');

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'BAD_REQUEST');
  });

  it('GET /api/claims filtering by serviceType should filter correctly', async () => {
    const res = await request(app).get('/api/claims?serviceType=INPATIENT');

    assert.equal(res.status, 200);
    assert.ok(res.body.data.every((c) => c.serviceType === 'INPATIENT'));
  });

  it('GET /api/claims filtering by riskCategory should return matching claims', async () => {
    const res = await request(app).get('/api/claims?riskCategory=HIGH');

    assert.equal(res.status, 200);
    assert.ok(res.body.data.every((c) => c.latestAnalysis && c.latestAnalysis.riskCategory === 'HIGH'));
  });

  it('GET /api/claims searching by SEP or facility name returns relevant claims', async () => {
    const res = await request(app).get('/api/claims?search=Sardjito');

    assert.equal(res.status, 200);
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.every((c) => c.facilityName.includes('Sardjito')));
  });

  it('GET /api/claims/:id returns claim detail by ID', async () => {
    const res = await request(app).get('/api/claims/66a1f8b1c200000000001001');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, '66a1f8b1c200000000001001');
    assert.equal(res.body.data.noSep, '0182R0011026V001');
    assert.ok(res.body.data.latestAnalysis);
  });

  it('GET /api/claims/:id for non-existent claim returns 404', async () => {
    const res = await request(app).get('/api/claims/non-existent-claim-999');

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'RESOURCE_NOT_FOUND');
  });

  it('POST /api/claims with missing fields returns 400 validation error', async () => {
    const res = await request(app).post('/api/claims').send({
      noSep: 'SEP-INVALID'
      // missing required fields
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('POST /api/claims with valid payload creates new claim with 201', async () => {
    const newClaim = {
      noSep: 'SEP-TEST-NEW-01',
      noRm: 'RM-TEST-NEW-01',
      facilityId: 'FASKES-001',
      serviceType: 'INPATIENT',
      serviceDate: '2026-10-24',
      claimAmount: 12500000,
      primaryDiagnosis: {
        code: 'J18.9',
        description: 'Pneumonia unspecified'
      },
      lengthOfStayDays: 3
    };

    const res = await request(app).post('/api/claims').send(newClaim);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.noSep, 'SEP-TEST-NEW-01');
    assert.equal(res.body.data.isDeleted, false);

    // Verify it is retrievable
    const getRes = await request(app).get(`/api/claims/${res.body.data.id}`);
    assert.equal(getRes.status, 200);
  });

  it('DELETE /api/claims/:id soft-deletes claim', async () => {
    // Create temporary claim to delete
    const createRes = await request(app).post('/api/claims').send({
      noSep: 'SEP-TO-DELETE',
      noRm: 'RM-TO-DELETE',
      facilityId: 'FASKES-001',
      serviceType: 'OUTPATIENT',
      serviceDate: '2026-10-24',
      claimAmount: 500000,
      primaryDiagnosis: { code: 'Z00.0', description: 'General examination' }
    });
    const claimId = createRes.body.data.id;

    // Delete it
    const delRes = await request(app).delete(`/api/claims/${claimId}`);
    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.success, true);

    // Should now return 404 via normal endpoints
    const getRes = await request(app).get(`/api/claims/${claimId}`);
    assert.equal(getRes.status, 404);
  });

  it('POST /api/claims/:id/analyze executes analysis pipeline and persists run and findings', async () => {
    const claimId = '66a1f8b1c200000000001001';

    const res = await request(app).post(`/api/claims/${claimId}/analyze`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.analysisRun);
    assert.equal(res.body.data.analysisRun.claimId, claimId);
    assert.equal(res.body.data.analysisRun.scoringMethod, 'DETERMINISTIC_RULE_ENGINE');
    assert.equal(res.body.data.analysisRun.isMockResult, false);
    assert.ok(res.body.data.analysisRun.riskScore >= 0 && res.body.data.analysisRun.riskScore <= 100);
    assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(res.body.data.analysisRun.riskCategory));

    // Verify analysis is in analysis history
    const historyRes = await request(app).get(`/api/claims/${claimId}/analysis`);
    assert.equal(historyRes.status, 200);
    assert.ok(historyRes.body.data.some((a) => a.id === res.body.data.analysisRun.id));
  });

  it('PATCH /api/claims/:id updates claim fields', async () => {
    const claimId = '66a1f8b1c200000000001001';
    const res = await request(app).patch(`/api/claims/${claimId}`).send({
      claimAmount: 19500000,
      serviceClass: 'Kls 1 VIP'
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.claimAmount, 19500000);
    assert.equal(res.body.data.serviceClass, 'Kls 1 VIP');
  });

  it('GET /api/claims/:id/documents returns claim document checklist', async () => {
    const claimId = '66a1f8b1c200000000001001';
    const res = await request(app).get(`/api/claims/${claimId}/documents`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.every((d) => d.claimId === claimId));
  });

  it('GET /api/claims/:id/findings returns claim findings', async () => {
    const claimId = '66a1f8b1c200000000001001';
    const res = await request(app).get(`/api/claims/${claimId}/findings`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.every((f) => f.claimId === claimId));
  });
});
