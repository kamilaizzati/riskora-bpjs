const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { createIsolatedTestApp } = require('./helpers/test-env');
const createApp = require('../src/app');

describe('Casemix Correction Workflow & Redirect Validation', () => {
  let app;
  let tempDir;
  let cleanup;
  const batchId = 'BATCH-DEMO-202610';

  before(async () => {
    const env = createIsolatedTestApp();
    app = env.app;
    tempDir = env.tempDir;
    cleanup = env.cleanup;
  });

  after(() => {
    if (cleanup) cleanup();
  });

  it('1. CLM-FKS-202610-0002: tindak lanjut berhasil, screening lolos, dan penempatan akhirnya Siap Diajukan Ulang', async () => {
    // 1. Submit internal follow-up / correction
    const corrRes = await request(app)
      .post('/api/faskes/claims/CLM-FKS-202610-0002/correction')
      .send({
        dischargeDate: '2026-10-05',
        expectedDischargeDate: '2026-10-05',
        document: {
          name: 'resume_medis_0002.pdf',
          type: 'application/pdf',
          size: 1024,
          documentType: 'discharge_summary'
        }
      });
    assert.equal(corrRes.status, 200);
    assert.equal(corrRes.body.success, true);
    assert.equal(corrRes.body.data.status, 'ready_for_rescreen');

    // 2. Rescreen evaluates claim
    const rescreenRes = await request(app)
      .post('/api/batches/claims/CLM-FKS-202610-0002/rescreen')
      .send({});
    assert.equal(rescreenRes.status, 200);
    const claim = rescreenRes.body.data.claim;
    assert.equal(claim.screeningStatus, 'passed');
    assert.equal(claim.correctionStatus, 'completed');
    assert.equal(claim.resubmissionStatus, 'ready');
    assert.equal(claim.workflowStatus, 'VALIDATED');
    assert.equal(claim.screeningFindings.length, 0);

    // 3. Appears in Siap Diajukan Ulang tab
    const readyListRes = await request(app).get('/api/faskes/claims?period=all&submissionStatus=ready');
    assert.equal(readyListRes.status, 200);
    const readyItem = readyListRes.body.data.find((c) => c.id === 'CLM-FKS-202610-0002');
    assert.ok(readyItem, 'CLM-FKS-202610-0002 harus muncul di daftar Siap Diajukan Ulang');

    // 4. Does NOT appear in Perlu Koreksi tab
    const needsListRes = await request(app).get('/api/faskes/claims?period=all&screeningStatus=needs_correction');
    assert.equal(needsListRes.status, 200);
    const needsItem = needsListRes.body.data.find((c) => c.id === 'CLM-FKS-202610-0002');
    assert.ok(!needsItem, 'CLM-FKS-202610-0002 tidak boleh lagi muncul di tab Perlu Koreksi');
  });

  it('2. CLM-FKS-202610-0005: koreksi lolos dan menempatkan klaim ke Siap Diajukan Ulang', async () => {
    // 1. Submit internal follow-up with operation/surgical report document
    const corrRes = await request(app)
      .post('/api/faskes/claims/CLM-FKS-202610-0005/correction')
      .send({
        dischargeDate: '2026-10-07',
        expectedDischargeDate: '2026-10-07',
        document: {
          name: 'laporan_operasi_apendektomi_0005.pdf',
          type: 'application/pdf',
          size: 2048,
          documentType: 'discharge_summary'
        }
      });
    assert.equal(corrRes.status, 200);
    assert.equal(corrRes.body.success, true);

    // 2. Rescreen evaluates claim
    const rescreenRes = await request(app)
      .post('/api/batches/claims/CLM-FKS-202610-0005/rescreen')
      .send({});
    assert.equal(rescreenRes.status, 200);
    const claim = rescreenRes.body.data.claim;
    assert.equal(claim.screeningStatus, 'passed');
    assert.equal(claim.correctionStatus, 'completed');
    assert.equal(claim.resubmissionStatus, 'ready');
    assert.equal(claim.screeningFindings.length, 0);

    // 3. Appears in Siap Diajukan Ulang tab
    const readyListRes = await request(app).get('/api/faskes/claims?period=all&submissionStatus=ready');
    const readyItem = readyListRes.body.data.find((c) => c.id === 'CLM-FKS-202610-0005');
    assert.ok(readyItem, 'CLM-FKS-202610-0005 harus masuk ke tab Siap Diajukan Ulang');

    // 4. Does NOT appear in Perlu Koreksi tab
    const needsListRes = await request(app).get('/api/faskes/claims?period=all&screeningStatus=needs_correction');
    const needsItem = needsListRes.body.data.find((c) => c.id === 'CLM-FKS-202610-0005');
    assert.ok(!needsItem, 'CLM-FKS-202610-0005 tidak boleh lagi muncul di tab Perlu Koreksi');
  });

  it('3. CLM-FKS-202610-0012: tindak lanjut tersimpan, screening tetap membutuhkan koreksi, penempatan tetap Perlu Koreksi', async () => {
    // 1. Submit internal follow-up (document attached, dates set)
    const corrRes = await request(app)
      .post('/api/faskes/claims/CLM-FKS-202610-0012/correction')
      .send({
        dischargeDate: '2026-10-14',
        expectedDischargeDate: '2026-10-14',
        document: {
          name: 'resume_medis_0012.pdf',
          type: 'application/pdf',
          size: 1024,
          documentType: 'discharge_summary'
        }
      });
    assert.equal(corrRes.status, 200);
    assert.equal(corrRes.body.success, true);
    assert.ok(corrRes.body.data.claim.lastCorrection, 'Tindak lanjut harus tersimpan');

    // 2. Rescreen evaluates claim: care class review is still required
    const rescreenRes = await request(app)
      .post('/api/batches/claims/CLM-FKS-202610-0012/rescreen')
      .send({});
    assert.equal(rescreenRes.status, 200);
    const claim = rescreenRes.body.data.claim;
    assert.equal(claim.screeningStatus, 'needs_correction');
    assert.equal(claim.correctionStatus, 'pending');
    assert.equal(claim.resubmissionStatus, null);
    assert.ok(
      claim.screeningFindings.some((f) => f.code === 'care_class_review'),
      'Temuan care_class_review harus tetap ada karena belum direview secara administratif'
    );

    // 3. Must NOT appear in Siap Diajukan Ulang
    const readyListRes = await request(app).get('/api/faskes/claims?period=all&submissionStatus=ready');
    const readyItem = readyListRes.body.data.find((c) => c.id === 'CLM-FKS-202610-0012');
    assert.ok(!readyItem, 'CLM-FKS-202610-0012 TIDAK boleh masuk ke Siap Diajukan Ulang');

    // 4. MUST appear in Perlu Koreksi tab
    const needsListRes = await request(app).get('/api/faskes/claims?period=all&screeningStatus=needs_correction');
    const needsItem = needsListRes.body.data.find((c) => c.id === 'CLM-FKS-202610-0012');
    assert.ok(needsItem, 'CLM-FKS-202610-0012 harus tetap berada di tab Perlu Koreksi');
  });

  it('4 & 5. Decision matches final screening result and list reflects target tab', async () => {
    // Verified via tests 1, 2, and 3: 0002 and 0005 are ready, 0012 is needs_correction
    const readyRes = await request(app).get('/api/faskes/claims?period=all&submissionStatus=ready');
    const readyIds = readyRes.body.data.map((c) => c.id);
    assert.ok(readyIds.includes('CLM-FKS-202610-0002'));
    assert.ok(readyIds.includes('CLM-FKS-202610-0005'));
    assert.ok(!readyIds.includes('CLM-FKS-202610-0012'));

    const needsRes = await request(app).get('/api/faskes/claims?period=all&screeningStatus=needs_correction');
    const needsIds = needsRes.body.data.map((c) => c.id);
    assert.ok(needsIds.includes('CLM-FKS-202610-0012'));
    assert.ok(!needsIds.includes('CLM-FKS-202610-0002'));
    assert.ok(!needsIds.includes('CLM-FKS-202610-0005'));
  });

  it('6. Refreshing backend preserves persisted claim states and tab categorization', async () => {
    // Restart app with same data directory
    const restartedApp = createApp({ dataDir: tempDir });

    const readyRes = await request(restartedApp).get('/api/faskes/claims?period=all&submissionStatus=ready');
    assert.equal(readyRes.status, 200);
    const readyIds = readyRes.body.data.map((c) => c.id);
    assert.ok(readyIds.includes('CLM-FKS-202610-0002'), '0002 must remain in ready after restart');
    assert.ok(readyIds.includes('CLM-FKS-202610-0005'), '0005 must remain in ready after restart');
    assert.ok(!readyIds.includes('CLM-FKS-202610-0012'), '0012 must not be in ready after restart');

    const needsRes = await request(restartedApp).get('/api/faskes/claims?period=all&screeningStatus=needs_correction');
    assert.equal(needsRes.status, 200);
    const needsIds = needsRes.body.data.map((c) => c.id);
    assert.ok(needsIds.includes('CLM-FKS-202610-0012'), '0012 must remain in needs_correction after restart');
  });

  it('7. CLM-FKS-202610-0012 cannot be included into a resubmission batch', async () => {
    const res = await request(app)
      .post('/api/batches/resubmissions')
      .send({
        period: '2026-11',
        selections: [{ sourceBatchId: batchId, claimId: 'CLM-FKS-202610-0012' }]
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_RESUBMISSION');
  });

  it('8. Multiple follow-up submissions do not duplicate claims or batch entries', async () => {
    const initialList = await request(app).get('/api/faskes/claims?period=all');
    const initialCount = initialList.body.data.length;

    // Resubmit follow-up for 0005 multiple times
    await request(app)
      .post('/api/faskes/claims/CLM-FKS-202610-0005/correction')
      .send({
        dischargeDate: '2026-10-07',
        expectedDischargeDate: '2026-10-07'
      });
    await request(app)
      .post('/api/faskes/claims/CLM-FKS-202610-0005/correction')
      .send({
        dischargeDate: '2026-10-07',
        expectedDischargeDate: '2026-10-07'
      });

    const afterList = await request(app).get('/api/faskes/claims?period=all');
    assert.equal(afterList.body.data.length, initialCount, 'Total claims must remain unchanged without duplicates');

    const duplicates = afterList.body.data.filter((c) => c.id === 'CLM-FKS-202610-0005');
    assert.equal(duplicates.length, 1, 'Claim 0005 must appear exactly once');
  });

  it('9. Validation failure (e.g. invalid discharge date) preserves error and does not falsely pass', async () => {
    // Attempt correction with discharge before admission (2026-10-01 < 2026-10-04)
    await request(app)
      .post('/api/faskes/claims/CLM-FKS-202610-0005/correction')
      .send({
        dischargeDate: '2026-10-01'
      });

    const rescreenRes = await request(app)
      .post('/api/batches/claims/CLM-FKS-202610-0005/rescreen')
      .send({});
    assert.equal(rescreenRes.status, 200);
    const claim = rescreenRes.body.data.claim;
    assert.equal(claim.screeningStatus, 'needs_correction');
    assert.ok(claim.screeningFindings.some((f) => f.code === 'invalid_discharge_date'));
  });

  it('10. Audit logs correctly record BATCH_CLAIM_CORRECTED and CLAIM_RESCREENED', async () => {
    const auditLogsPath = path.join(tempDir, 'audit-logs.json');
    assert.ok(fs.existsSync(auditLogsPath));
    const logs = JSON.parse(fs.readFileSync(auditLogsPath, 'utf8'));

    const claimActions = logs.map((l) => l.action);
    assert.ok(claimActions.includes('BATCH_CLAIM_CORRECTED'), 'Audit log must record BATCH_CLAIM_CORRECTED');
    assert.ok(claimActions.includes('CLAIM_RESCREENED'), 'Audit log must record CLAIM_RESCREENED');
  });
});
