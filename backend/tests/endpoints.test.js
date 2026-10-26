const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createIsolatedTestApp } = require('./helpers/test-env');

describe('Full REST Endpoints Suite', () => {
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

  describe('Dashboard Endpoints', () => {
    it('GET /api/dashboard/summary returns dynamic metrics', async () => {
      const res = await request(app).get('/api/dashboard/summary');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.totalClaims, 20);
      assert.equal(res.body.data.totalFacilities, 12);
      assert.ok(res.body.data.totalClaimAmount > 0);
      assert.ok(res.body.data.workflowDistribution);
    });

    it('GET /api/dashboard/risk-distribution returns categories', async () => {
      const res = await request(app).get('/api/dashboard/risk-distribution');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.categories.HIGH);
      assert.ok(res.body.data.categories.MEDIUM);
      assert.ok(res.body.data.categories.LOW);
    });

    it('GET /api/dashboard/finding-distribution returns distributions', async () => {
      const res = await request(app).get('/api/dashboard/finding-distribution');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.totalFindings >= 10);
      assert.ok(res.body.data.byType);
      assert.ok(res.body.data.bySeverity);
    });

    it('GET /api/dashboard/recent-activity returns audit logs', async () => {
      const res = await request(app).get('/api/dashboard/recent-activity?limit=5');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
    });
  });

  describe('Facilities Endpoints', () => {
    it('GET /api/facilities returns facility list', async () => {
      const res = await request(app).get('/api/facilities');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 12);
    });

    it('GET /api/facilities/:id returns facility detail', async () => {
      const res = await request(app).get('/api/facilities/FASKES-001');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, 'FASKES-001');
      assert.equal(res.body.data.name, 'RSUP Dr. Sardjito');
    });

    it('GET /api/facilities/:id/claims returns claims for facility', async () => {
      const res = await request(app).get('/api/facilities/FASKES-001/claims');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length > 0);
      assert.ok(res.body.data.every((c) => c.facilityId === 'FASKES-001'));
    });

    it('GET /api/facilities/:id/summary returns factual metrics', async () => {
      const res = await request(app).get('/api/facilities/FASKES-001/summary');
      assert.equal(res.status, 200);
      assert.ok(res.body.data.statistics.totalClaims > 0);
      assert.ok(res.body.data.statistics.averageClaimAmount > 0);
    });
  });

  describe('Documents Endpoints', () => {
    it('GET /api/documents returns documents list', async () => {
      const res = await request(app).get('/api/documents');
      assert.equal(res.status, 200);
      assert.ok(res.body.data.length >= 100);
    });

    it('GET /api/documents/:id returns document detail', async () => {
      const res = await request(app).get('/api/documents/DOC-0001');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, 'DOC-0001');
    });

    it('PATCH /api/documents/:id updates document metadata', async () => {
      const res = await request(app).patch('/api/documents/DOC-0001').send({
        documentStatus: 'VERIFIED',
        reviewNotes: 'Verified against bridging system'
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.documentStatus, 'VERIFIED');
      assert.ok(res.body.data.reviewedAt);
    });

    it('POST /api/claims/:id/documents creates metadata for claim', async () => {
      const claimId = '66a1f8b1c200000000001001';
      const res = await request(app).post(`/api/claims/${claimId}/documents`).send({
        documentType: 'supporting_test_result',
        fileName: 'lab_result.pdf',
        documentStatus: 'UPLOADED'
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.claimId, claimId);
      assert.equal(res.body.data.documentType, 'supporting_test_result');
    });
  });

  describe('Findings Endpoints', () => {
    it('GET /api/findings returns findings with filters', async () => {
      const res = await request(app).get('/api/findings?severity=HIGH');
      assert.equal(res.status, 200);
      assert.ok(res.body.data.every((f) => f.severity === 'HIGH'));
    });

    it('GET /api/findings/:id returns finding detail', async () => {
      const findingId = 'FND-66a1f8b1c200000000001001';
      const res = await request(app).get(`/api/findings/${findingId}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, findingId);
    });

    it('PATCH /api/findings/:id updates finding status', async () => {
      const findingId = 'FND-66a1f8b1c200000000001001';
      const res = await request(app).patch(`/api/findings/${findingId}`).send({
        status: 'UNDER_REVIEW'
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'UNDER_REVIEW');
    });

    it('POST /api/findings/:id/review submits a finding review', async () => {
      const findingId = 'FND-66a1f8b1c200000000001001';
      const res = await request(app).post(`/api/findings/${findingId}/review`).send({
        decision: 'NEEDS_INVESTIGATION',
        notes: 'Clinical complexity requires expert peer review'
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.review.decision, 'NEEDS_INVESTIGATION');
    });
  });

  describe('Reviews Router Endpoints', () => {
    it('GET /api/reviews/claim/:id returns reviews for claim', async () => {
      const claimId = '66a1f8b1c200000000001001';
      const res = await request(app).get(`/api/reviews/claim/${claimId}`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
    });

    it('POST /api/reviews/claim/:id creates claim review', async () => {
      const claimId = '66a1f8b1c200000000001001';
      const res = await request(app).post(`/api/reviews/claim/${claimId}`).send({
        decision: 'ESCALATE',
        notes: 'Escalating for verifier review committee'
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.decision, 'ESCALATE');
    });

    it('POST /api/reviews/finding/:id creates finding review', async () => {
      const findingId = 'FND-66a1f8b1c200000000001001';
      const res = await request(app).post(`/api/reviews/finding/${findingId}`).send({
        decision: 'NO_ISSUE_FOUND',
        notes: 'Clinical evidence verified as legitimate'
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.review.decision, 'NO_ISSUE_FOUND');
    });
  });

  describe('Batches Endpoints', () => {
    it('GET /api/batches returns batches list', async () => {
      const res = await request(app).get('/api/batches');
      assert.equal(res.status, 200);
      assert.ok(res.body.data.length >= 1);
    });

    it('GET /api/batches/:id returns batch detail', async () => {
      const res = await request(app).get('/api/batches/BATCH-202610-MONTHLY');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.id, 'BATCH-202610-MONTHLY');
      assert.ok(Array.isArray(res.body.data.claimIds));
    });

    it('POST /api/batches creates new mock batch via demo upload', async () => {
      const res = await request(app).post('/api/batches/demo').send({
        period: '2026-10',
        name: 'Batch 2026-10-W4'
      });
      assert.equal(res.status, 201);
      assert.ok(res.body.data.id);
      assert.equal(res.body.data.name, 'Batch 2026-10-W4');
    });
  });

  describe('Verification Results Endpoints', () => {
    it('GET /api/verification-results returns verification feedback list', async () => {
      const res = await request(app).get('/api/verification-results');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 20);
    });

    it('GET /api/verification-results/claim/:id returns feedback for claim via direct route', async () => {
      const claimId = '66a1f8b1c200000000001001';
      const res = await request(app).get(`/api/verification-results/claim/${claimId}`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
    });

    it('GET /api/claims/:id/verification-results returns feedback for claim', async () => {
      const claimId = '66a1f8b1c200000000001001';
      const res = await request(app).get(`/api/claims/${claimId}/verification-results`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
    });
  });

  describe('Graph Endpoints', () => {
    it('GET /api/graph returns complete graph structure', async () => {
      const res = await request(app).get('/api/graph');
      assert.equal(res.status, 200);
      assert.ok(res.body.data.nodes);
      assert.ok(res.body.data.edges);
      assert.equal(res.body.data.nodes.length, 113);
      assert.equal(res.body.data.edges.length, 105);
    });

    it('GET /api/graph/claims/:id returns localized ego network via direct route', async () => {
      const claimId = '66a1f8b1c200000000001001';
      const res = await request(app).get(`/api/graph/claims/${claimId}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.claimId, claimId);
      assert.ok(Array.isArray(res.body.data.nodes));
      assert.ok(Array.isArray(res.body.data.edges));
      assert.ok(res.body.data.nodes.length > 0);
    });

    it('GET /api/claims/:id/relationships returns localized ego network', async () => {
      const claimId = '66a1f8b1c200000000001001';
      const res = await request(app).get(`/api/claims/${claimId}/relationships`);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.claimId, claimId);
      assert.ok(Array.isArray(res.body.data.nodes));
      assert.ok(Array.isArray(res.body.data.edges));
      assert.ok(res.body.data.nodes.length > 0);
    });
  });
});
