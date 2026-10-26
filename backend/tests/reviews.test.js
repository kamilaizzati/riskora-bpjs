const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createIsolatedTestApp } = require('./helpers/test-env');

describe('Reviews API', () => {
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

  it('POST /api/claims/:id/reviews with invalid decision returns 400', async () => {
    const claimId = '66a1f8b1c200000000001001';
    const res = await request(app).post(`/api/claims/${claimId}/reviews`).send({
      decision: 'INVALID_DECISION',
      notes: 'Some notes'
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'BAD_REQUEST');
  });

  it('POST /api/claims/:id/reviews with missing notes returns 400', async () => {
    const claimId = '66a1f8b1c200000000001001';
    const res = await request(app).post(`/api/claims/${claimId}/reviews`).send({
      decision: 'NEEDS_INVESTIGATION',
      notes: ''
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'BAD_REQUEST');
  });

  it('POST /api/claims/:id/reviews preserves history and allows multiple reviews', async () => {
    const claimId = '66a1f8b1c200000000001001';

    // First review
    const res1 = await request(app).post(`/api/claims/${claimId}/reviews`).send({
      decision: 'REQUEST_DOCUMENTS',
      notes: 'First triage review: Please upload detailed lab results.'
    });
    assert.equal(res1.status, 201);
    const rev1Id = res1.body.data.id;

    // Second review
    const res2 = await request(app).post(`/api/claims/${claimId}/reviews`).send({
      decision: 'NEEDS_INVESTIGATION',
      notes: 'Second review: Escalating to medical committee for review.'
    });
    assert.equal(res2.status, 201);
    const rev2Id = res2.body.data.id;

    // Verify both reviews exist in history
    const historyRes = await request(app).get(`/api/claims/${claimId}/reviews`);
    assert.equal(historyRes.status, 200);
    const reviewIds = historyRes.body.data.map((r) => r.id);

    assert.ok(reviewIds.includes(rev1Id));
    assert.ok(reviewIds.includes(rev2Id));
    assert.notEqual(rev1Id, rev2Id);
  });
});
