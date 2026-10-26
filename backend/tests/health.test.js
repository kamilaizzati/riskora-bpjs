const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const createApp = require('../src/app');

describe('Health API', () => {
  const app = createApp();

  it('GET /api/health should return 200 and healthy status', async () => {
    const res = await request(app).get('/api/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'UP');
    assert.equal(res.body.data.service, 'riskora-backend');
    assert.ok(res.body.data.uptimeSeconds !== undefined);
    assert.ok(res.body.data.timestamp);
  });

  it('GET /api/non-existent-route should return 404 ROUTE_NOT_FOUND', async () => {
    const res = await request(app).get('/api/non-existent-route');

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'ROUTE_NOT_FOUND');
  });
});
