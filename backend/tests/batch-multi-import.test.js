const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { createIsolatedTestApp } = require('./helpers/test-env');
const { parseDemoClaimTxt } = require('../src/utils/txt-parser');

describe('Multi-batch TXT import (September then Oktober)', () => {
  let app;
  let cleanup;
  let septemberTxt;
  let oktoberTxt;

  before(() => {
    const env = createIsolatedTestApp({ emptySubmissionBatches: true });
    app = env.app;
    cleanup = env.cleanup;

    septemberTxt = fs.readFileSync(
      path.resolve(__dirname, '../../demo_batch_sardjito_september_2026.txt'),
      'utf8'
    );
    oktoberTxt = fs.readFileSync(
      path.resolve(__dirname, '../../demo_batch_sardjito_oktober_2026.txt'),
      'utf8'
    );
  });

  after(() => {
    if (cleanup) cleanup();
  });

  it('parses demo_batch_sardjito_september_2026.txt with 13-column header into 20 claims with batch_period 2026-09', () => {
    const rows = parseDemoClaimTxt(septemberTxt);
    assert.equal(rows.length, 20);
    assert.ok(rows.every((row) => row.batchPeriod === '2026-09'));
    assert.equal(rows[0].claimId, 'CLM-FKS-202609-0001');
  });

  it('imports September into empty batch storage, then Oktober; 40 unique claims via API', async () => {
    const emptyList = await request(app).get('/api/batches');
    assert.equal(emptyList.status, 200);
    assert.equal(emptyList.body.data.length, 0);

    const septRes = await request(app)
      .post('/api/batches/upload')
      .send({
        content: septemberTxt,
        fileName: 'demo_batch_sardjito_september_2026.txt',
        batchName: 'Batch Klaim September 2026'
      });

    assert.equal(septRes.status, 201);
    assert.equal(septRes.body.data.id, 'BATCH-DEMO-202609');
    assert.equal(septRes.body.data.claims.length, 20);
    assert.ok(
      septRes.body.data.claims.every((c) => c.batchPeriod === '2026-09'),
      'Semua klaim September harus batch_period 2026-09'
    );

    const octRes = await request(app)
      .post('/api/batches/upload')
      .send({
        content: oktoberTxt,
        period: '2026-10',
        fileName: 'demo_batch_sardjito_oktober_2026.txt',
        batchName: 'Batch Klaim Oktober 2026'
      });

    assert.equal(octRes.status, 201);
    assert.equal(octRes.body.data.id, 'BATCH-DEMO-202610');
    assert.equal(octRes.body.data.claims.length, 20);

    const batchesRes = await request(app).get('/api/batches');
    assert.equal(batchesRes.body.data.length, 2);

    const faskesClaims = await request(app).get('/api/faskes/claims?period=all');
    assert.equal(faskesClaims.status, 200);
    assert.equal(faskesClaims.body.data.length, 40);

    const claimIds = faskesClaims.body.data.map((c) => c.claimId || c.id);
    assert.equal(new Set(claimIds).size, 40);

    const summary = await request(app).get('/api/faskes/dashboard/summary?period=all');
    assert.equal(summary.body.data.totalSubmitted, 40);
    assert.equal(summary.body.data.totalClaims, 40);
  });

  it('rejects duplicate claim_id across a different billing batch', async () => {
    const header =
      'claim_id|sep_no|submission_date|service_type|diagnosis_code|diagnosis_name|procedure_code|procedure_name|ina_cbg_code|claim_value_idr|facility_code|facility_name|batch_period';
    const overlappingRow =
      'CLM-FKS-202609-0001|DEMO-SEP-202611-0001|2026-11-01|Rawat Jalan|I10|Hipertensi esensial|-|-|DEMO-RJ-11|100000|DEMO-SARDJITO|RSUP Dr. Sardjito|2026-11';

    const dupRes = await request(app)
      .post('/api/batches/upload')
      .send({
        content: `${header}\n${overlappingRow}`,
        fileName: 'overlap_claim.txt',
        batchName: 'Batch overlap test'
      });

    assert.equal(dupRes.status, 400);
    assert.equal(dupRes.body.error.code, 'DUPLICATE_CLAIM_ID');
  });
});
