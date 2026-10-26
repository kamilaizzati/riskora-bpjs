const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const createApp = require('../src/app');

describe('Frontend-Backend Integration Endpoints', () => {
  let app;

  before(() => {
    app = createApp();
  });

  it('1. Verificator login and session works for frontend auth flow', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'verifikator@riskora.id',
        password: 'password123'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.role, 'VERIFICATOR');
  });

  it('2. Verificator dashboard summary returns metrics expected by frontend', async () => {
    const res = await request(app).get('/api/verificator/dashboard/summary');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(typeof res.body.pendingVerification === 'number');
    assert.ok(typeof res.body.highRisk === 'number');
    assert.ok(typeof res.body.inReview === 'number');
    assert.ok(typeof res.body.completed === 'number');
  });

  it('3. Verificator priority claims returns mapped list with risk scores and anomaly types', async () => {
    const res = await request(app).get('/api/verificator/dashboard/priority-claims');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length > 0);

    const first = res.body[0];
    assert.ok(first.id);
    assert.ok(first.sepNumber);
    assert.ok(first.facilityName);
    assert.ok(first.careType);
    assert.ok(first.primaryDiagnosis);
    assert.ok(Array.isArray(first.anomalyTypes));
    assert.ok(first.riskLevel);
    assert.ok(typeof first.riskScore === 'number');
  });

  it('4. Verificator anomaly distribution and screening results charts return data', async () => {
    const resDist = await request(app).get('/api/verificator/dashboard/anomaly-distribution');
    assert.equal(resDist.status, 200);
    assert.ok(Array.isArray(resDist.body));

    const resScreen = await request(app).get('/api/verificator/dashboard/screening-results');
    assert.equal(resScreen.status, 200);
    assert.ok(Array.isArray(resScreen.body));
  });

  it('5. Verificator claims queue returns filtered claims list', async () => {
    const res = await request(app).get('/api/verificator/claims');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length > 0);
  });

  it('6. Verificator claim detail returns enriched claim with documents & findings', async () => {
    // Get first claim id
    const listRes = await request(app).get('/api/verificator/claims');
    const claimId = listRes.body[0].id;

    const res = await request(app).get(`/api/verificator/claims/${claimId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.id, claimId);
    assert.ok(Array.isArray(res.body.documents));
    assert.ok(Array.isArray(res.body.findings));
  });

  it('7. Faskes dashboard summary returns counts expected by Faskes UI', async () => {
    const res = await request(app).get('/api/faskes/dashboard/summary');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(typeof res.body.data.totalSubmitted === 'number');
    assert.ok(typeof res.body.data.needsCorrection === 'number');
    assert.ok(typeof res.body.data.screeningPassed === 'number');
  });

  it('8. Faskes dashboard returns full structure for Faskes dashboard overview', async () => {
    const res = await request(app).get('/api/faskes/dashboard');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.summary);
    assert.ok(Array.isArray(res.body.data.actionRequiredClaims));
    assert.ok(Array.isArray(res.body.data.statusDistribution));
    assert.ok(Array.isArray(res.body.data.recentActivities));
  });

  it('9. Faskes submissions periods returns active billing periods', async () => {
    const res = await request(app).get('/api/faskes/submissions/periods');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
  });

  it('10. Faskes batch workflow integrates with backend /api/batches', async () => {
    const res = await request(app).get('/api/batches');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  it('11. Faskes claim detail returns attached documents with status and preview URLs', async () => {
    const res = await request(app).get('/api/faskes/claims/CLM-FKS-202610-0001');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data);
    assert.ok(Array.isArray(res.body.data.documents));
    assert.ok(res.body.data.documents.length >= 6);

    const firstDoc = res.body.data.documents[0];
    assert.ok(firstDoc.id);
    assert.ok(firstDoc.documentType);
    assert.ok(firstDoc.label);
    assert.ok(['available', 'missing'].includes(firstDoc.status));
    assert.ok(firstDoc.previewUrl);
    assert.ok(firstDoc.downloadUrl || firstDoc.fileUrl);
  });

  it('12. Faskes claim documents subresource returns document checklist', async () => {
    const res = await request(app).get('/api/faskes/claims/CLM-FKS-202610-0001/documents');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 6);
  });

  it('13. Document preview stream serves PDF with Content-Type application/pdf', async () => {
    const res = await request(app).get('/api/documents/DOC-FKS-0001-01/preview');
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'application/pdf');
    assert.ok(res.headers['content-disposition'].includes('inline'));
  });

  it('14. Document file endpoint serves PDF with Content-Type application/pdf', async () => {
    const res = await request(app).get('/api/documents/DOC-FKS-0001-01/file');
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'application/pdf');
    assert.ok(res.headers['content-disposition'].includes('inline'));
  });

  it('15. Missing document returns 404 RESOURCE_NOT_FOUND', async () => {
    const res = await request(app).get('/api/documents/DOC-FKS-0004-07/preview');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'RESOURCE_NOT_FOUND');
  });
});
