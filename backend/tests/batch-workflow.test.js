const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { createIsolatedTestApp } = require('./helpers/test-env');

describe('Casemix 4-Stage Batch Workflow & PDF Preview', () => {
  let app;
  let cleanup;
  let demoTxtContent;

  before(() => {
    const env = createIsolatedTestApp();
    app = env.app;
    cleanup = env.cleanup;

    const demoFilePath = path.resolve(__dirname, '../../demo_batch_sardjito_oktober_2026.txt');
    demoTxtContent = fs.readFileSync(demoFilePath, 'utf8');
  });

  after(() => {
    if (cleanup) cleanup();
  });

  describe('Stage 1 — Upload Batch E-Claim', () => {
    it('rejects invalid TXT format with clear line error details', async () => {
      // Valid header but invalid data rows (bad date, negative amount)
      const invalidTxt = [
        'claim_id|sep_no|submission_date|service_type|diagnosis_code|diagnosis_name|procedure_code|procedure_name|ina_cbg_code|claim_value_idr|facility_code|facility_name|batch_period',
        'CLM-001|SEP-001|2026-13-99|Rawat Inap|I10|Hipertensi|-|-|CODE|-1000|FAC|RS Demo|2026-10'
      ].join('\n');

      const res = await request(app)
        .post('/api/batches/upload')
        .send({ content: invalidTxt, period: '2026-10' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error && res.body.error.details && res.body.error.details.errors);
      assert.ok(res.body.error.details.errors.length > 0);
    });

    it('uploads and parses demo TXT file successfully into draft batch', async () => {
      const res = await request(app)
        .post('/api/batches/upload')
        .send({
          content: demoTxtContent,
          period: '2026-10',
          batchName: 'Batch Klaim Sardjito Test'
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      const batch = res.body.data;
      assert.equal(batch.id, 'BATCH-DEMO-202610');
      assert.equal(batch.claims.length, 20);
      assert.equal(batch.screeningStatus, 'draft');
      assert.equal(batch.handoffStatus, 'not_ready');
      assert.equal(batch.claims[0].claimId, 'CLM-FKS-202610-0001');
      assert.equal(batch.claims[0].sepNumber, 'DEMO-SEP-202610-0001');
    });

    it('supports triggering demo batch upload via /api/batches/demo endpoint', async () => {
      const res = await request(app)
        .post('/api/batches/demo')
        .send({ period: '2026-10', name: 'Demo Batch Oktober' });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.claims.length, 20);
    });
  });

  describe('Stage 2 — Preview Data Batch', () => {
    it('returns preview summary without altering active claims database', async () => {
      const res = await request(app).get('/api/batches/BATCH-DEMO-202610/preview');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const preview = res.body.data;
      assert.equal(preview.totalRows, 20);
      assert.equal(preview.validCount, 20);
      assert.equal(preview.invalidCount, 0);
      assert.equal(preview.claims.length, 20);
    });
  });

  describe('Stage 3 — Pre-screening Rules & Findings', () => {
    it('evaluates claims in batch and identifies passed vs needs_correction', async () => {
      const res = await request(app)
        .post('/api/batches/BATCH-DEMO-202610/screening');

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const batch = res.body.data;
      assert.equal(batch.screeningStatus, 'needs_correction');

      const passedClaims = batch.claims.filter((c) => c.screeningStatus === 'passed');
      const correctionClaims = batch.claims.filter((c) => c.screeningStatus === 'needs_correction');

      assert.ok(passedClaims.length >= 16, 'Most claims should pass');
      assert.ok(correctionClaims.length > 0, 'Some claims should flag findings');
      assert.ok(correctionClaims[0].screeningFindings.length > 0);
    });

    it('allows updating claim correction follow-up and rescreening single claim', async () => {
      // Find a claim needing correction
      const batchRes = await request(app).get('/api/batches/BATCH-DEMO-202610');
      const targetClaim = batchRes.body.data.claims.find((c) => c.screeningStatus === 'needs_correction');
      assert.ok(targetClaim);

      // Save correction note
      const updateRes = await request(app)
        .patch(`/api/batches/BATCH-DEMO-202610/claims/${targetClaim.id}`)
        .send({
          correctionNotes: 'Bukti pendukung telah diverifikasi bersama DPJP',
          correctionStatus: 'ready_for_rescreen'
        });
      assert.equal(updateRes.status, 200);
      assert.equal(updateRes.body.data.correctionStatus, 'ready_for_rescreen');

      // Rescreen claim
      const rescreenRes = await request(app)
        .post(`/api/batches/BATCH-DEMO-202610/claims/${targetClaim.id}/rescreen`);
      assert.equal(rescreenRes.status, 200);
      assert.equal(rescreenRes.body.data.claim.screeningStatus, 'passed');
      assert.equal(rescreenRes.body.data.claim.correctionStatus, 'completed');
    });
  });

  describe('Stage 4 — Finalization & VClaim Handoff', () => {
    it('allows finalization of valid claims without waiting for claims requiring correction', async () => {
      // Ensure there are pending claims and valid claims
      const batchRes = await request(app).get('/api/batches/BATCH-DEMO-202610');
      const pending = batchRes.body.data.claims.filter((c) => c.screeningStatus === 'needs_correction' && c.correctionStatus !== 'completed');
      const valid = batchRes.body.data.claims.filter((c) => c.screeningStatus === 'passed');

      assert.ok(pending.length > 0, 'Should have pending claims requiring correction');
      assert.ok(valid.length > 0, 'Should have valid claims');

      const finalizeRes = await request(app).post('/api/batches/BATCH-DEMO-202610/finalize');
      assert.equal(finalizeRes.status, 200);
      assert.equal(finalizeRes.body.data.screeningStatus, 'ready_to_handoff');
      assert.equal(finalizeRes.body.data.handoffStatus, 'ready');
      assert.equal(finalizeRes.body.data.finalizedClaimsCount, valid.length);
      assert.equal(finalizeRes.body.data.pendingClaimsCount, pending.length);
    });

    it('finalizes batch and activates claims into claims storage once resolved', async () => {
      // Resolve all remaining claims needing correction
      const batchRes = await request(app).get('/api/batches/BATCH-DEMO-202610');
      const pending = batchRes.body.data.claims.filter((c) => c.screeningStatus === 'needs_correction' && c.correctionStatus !== 'completed');

      for (const claim of pending) {
        await request(app).post(`/api/batches/BATCH-DEMO-202610/claims/${claim.id}/rescreen`);
      }

      // Finalize batch
      const finalizeRes = await request(app).post('/api/batches/BATCH-DEMO-202610/finalize');
      assert.equal(finalizeRes.status, 200);
      assert.equal(finalizeRes.body.data.screeningStatus, 'ready_to_handoff');
      assert.equal(finalizeRes.body.data.handoffStatus, 'ready');
      assert.ok(finalizeRes.body.data.finalizedAt);

      // Verify the 20 claims are now queryable via /api/claims
      const claimsRes = await request(app).get('/api/claims?search=Sardjito&limit=50');
      assert.equal(claimsRes.status, 200);
      assert.ok(claimsRes.body.meta && claimsRes.body.meta.totalRecords >= 20);
    });

    it('marks batch as forwarded (recorded VClaim handoff)', async () => {
      const res = await request(app).post('/api/batches/BATCH-DEMO-202610/handoff');
      assert.equal(res.status, 200);
      assert.equal(res.body.data.screeningStatus, 'handed_off');
      assert.equal(res.body.data.handoffStatus, 'marked_forwarded');
      assert.ok(res.body.data.forwardedAt);
    });
  });

  describe('Document Checklist & PDF Preview Stream', () => {
    it('returns document checklist metadata for an imported claim', async () => {
      const res = await request(app).get('/api/claims/CLM-FKS-202610-0001/documents');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 6);
      assert.ok(res.body.data[0].fileName.endsWith('.pdf'));
      assert.equal(res.body.data[0].status, 'available');
    });

    it('streams PDF binary with application/pdf header and safe Content-Disposition', async () => {
      const res = await request(app).get('/api/documents/DOC-FKS-0001-02/preview');
      assert.equal(res.status, 200);
      assert.equal(res.headers['content-type'], 'application/pdf');
      assert.ok(res.headers['content-disposition'].includes('inline'));
      assert.ok(res.headers['content-disposition'].includes('.pdf'));
      assert.ok(res.body.length > 0 || res.text.length > 0);
    });

    it('strictly prevents path traversal attacks', async () => {
      const res = await request(app).get('/api/documents/..%2F..%2Fpackage.json/preview');
      assert.ok([400, 404].includes(res.status));
    });

    it('returns 404 for non-existent document file', async () => {
      const res = await request(app).get('/api/documents/non_existent_file.pdf/preview');
      assert.equal(res.status, 404);
    });
  });
});
