const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { createIsolatedTestApp } = require('./helpers/test-env');

describe('Casemix Remediation, Document Persistence & Rollover Verification', () => {
  let app;
  let tempDir;
  let cleanup;
  let demoTxtContent;
  const batchId = 'BATCH-DEMO-202610';

  before(async () => {
    const env = createIsolatedTestApp({ cleanState: true });
    app = env.app;
    tempDir = env.tempDir;
    cleanup = env.cleanup;

    const demoFilePath = path.resolve(__dirname, '../../demo_batch_sardjito_oktober_2026.txt');
    demoTxtContent = fs.readFileSync(demoFilePath, 'utf8');

    // Upload demo batch to populate claims
    const uploadRes = await request(app)
      .post('/api/batches/upload')
      .send({
        content: demoTxtContent,
        period: '2026-10',
        batchName: 'Batch Klaim Sardjito Oktober 2026'
      });
    assert.equal(uploadRes.status, 201);

    // Run screening to set initial screening findings
    const screenRes = await request(app).post(`/api/batches/${batchId}/screening`).send({});
    assert.equal(screenRes.status, 200);
  });

  after(() => {
    if (cleanup) cleanup();
  });

  it('1. Upload mock PDF and ensure file is saved on disk, metadata persisted, and can be opened/previewed', async () => {
    const targetClaimId = 'CLM-FKS-202610-0002';
    const mockPdfBase64 = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n193\n%%EOF\n'
    ).toString('base64');

    const correctionPayload = {
      dischargeDate: '2026-10-05',
      document: {
        name: 'resume_medis_0002_dpjp.pdf',
        type: 'application/pdf',
        size: 512,
        contentBase64: mockPdfBase64,
        documentType: 'discharge_summary'
      }
    };

    // Save correction via Faskes endpoint
    const saveRes = await request(app)
      .post(`/api/faskes/claims/${targetClaimId}/correction`)
      .send(correctionPayload);

    assert.equal(saveRes.status, 200);
    assert.equal(saveRes.body.success, true);
    assert.equal(saveRes.body.data.claimId, targetClaimId);
    assert.equal(saveRes.body.data.status, 'ready_for_rescreen');

    // Verify physical file was written to documents directory
    const expectedFilePath = path.join(tempDir, 'documents', 'resume_medis_0002_dpjp.pdf');
    assert.ok(fs.existsSync(expectedFilePath), 'Uploaded PDF must exist physically on server storage');

    // Verify document can be opened / previewed via API stream
    const docMetaRes = await request(app).get(`/api/faskes/claims/${targetClaimId}`);
    assert.equal(docMetaRes.status, 200);
    const resumeDoc = (docMetaRes.body.data.documents || []).find(
      (d) => d.documentType === 'discharge_summary'
    );
    assert.ok(resumeDoc, 'Claim must have attached discharge_summary document');
    assert.equal(resumeDoc.status, 'available');
    assert.ok(resumeDoc.previewUrl);

    // Stream preview
    const previewRes = await request(app).get(resumeDoc.previewUrl);
    assert.equal(previewRes.status, 200);
    assert.equal(previewRes.headers['content-type'], 'application/pdf');
    assert.ok(previewRes.body.length > 0, 'Document stream must return non-empty binary');
  });

  it('2. Edit date, save, and reload: ensure date does not revert to old value', async () => {
    const targetClaimId = 'CLM-FKS-202610-0002';
    const newDischargeDate = '2026-10-06';

    const updateRes = await request(app)
      .post(`/api/faskes/claims/${targetClaimId}/correction`)
      .send({
        dischargeDate: newDischargeDate
      });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.claim.dischargeDate, newDischargeDate);

    // Simulate page reload by querying claim detail from scratch
    const reloadRes = await request(app).get(`/api/faskes/claims/${targetClaimId}`);
    assert.equal(reloadRes.status, 200);
    assert.equal(
      reloadRes.body.data.dischargeDate,
      newDischargeDate,
      'Discharge date must persist and not revert to old value on reload'
    );
    assert.equal(reloadRes.body.data.lengthOfStayDays, 4);
    assert.equal(reloadRes.body.data.lastCorrection.dischargeDate, newDischargeDate);
  });

  it('3. Revalidate uses latest data and fails if date is invalid, maintains latest error', async () => {
    const targetClaimId = 'CLM-FKS-202610-0002';

    // Intentionally set an invalid discharge date (discharge before admission: 2026-09-28 < 2026-10-02)
    const invalidDateRes = await request(app)
      .post(`/api/faskes/claims/${targetClaimId}/correction`)
      .send({
        dischargeDate: '2026-09-28'
      });
    assert.equal(invalidDateRes.status, 200);

    // Run revalidation
    const rescreenRes = await request(app).post(`/api/faskes/claims/${targetClaimId}/rescreen`);
    assert.equal(rescreenRes.status, 200);

    const revalidatedClaim = rescreenRes.body.data.claim || rescreenRes.body.data;
    assert.equal(revalidatedClaim.screeningStatus, 'needs_correction');
    assert.ok(revalidatedClaim.screeningFindings.length > 0);
    assert.ok(
      revalidatedClaim.screeningFindings.some((f) => f.code === 'invalid_discharge_date'),
      'Must flag invalid discharge date finding'
    );
  });

  it('4. Revalidation passes when data is fixed, allows finalization and rollover', async () => {
    const targetClaimId = 'CLM-FKS-202610-0002';

    // Correct the date to a valid date matching stay
    await request(app)
      .post(`/api/faskes/claims/${targetClaimId}/correction`)
      .send({
        dischargeDate: '2026-10-05',
        correctionNotes: 'Discharge date corrected and verified with DPJP summary'
      });

    // Run revalidation
    const rescreenRes = await request(app).post(`/api/faskes/claims/${targetClaimId}/rescreen`);
    assert.equal(rescreenRes.status, 200);

    const claim = rescreenRes.body.data.claim || rescreenRes.body.data;
    assert.equal(claim.screeningStatus, 'passed');
    assert.equal(claim.correctionStatus, 'completed');
    assert.equal(claim.screeningFindings.length, 0);

    // Test rollover functionality: valid claim can be rolled over to next period
    const rolloverRes = await request(app)
      .post(`/api/batches/${batchId}/claims/${targetClaimId}/rollover`)
      .send({
        targetPeriod: '2026-11',
        reason: 'Pengajuan lanjutan periode November 2026'
      });

    assert.equal(rolloverRes.status, 200);
    assert.equal(rolloverRes.body.success, true);
    assert.equal(rolloverRes.body.data.targetBatchId, 'BATCH-DEMO-202611');
    assert.ok(rolloverRes.body.data.claim.isRolledOver);
    assert.ok(rolloverRes.body.data.claim.rolloverHistory.length > 0);
    assert.equal(rolloverRes.body.data.claim.originalBatchId, batchId);

    // Prevent duplicate rollover
    const duplicateRes = await request(app)
      .post(`/api/batches/${batchId}/claims/${targetClaimId}/rollover`)
      .send({ targetPeriod: '2026-11' });
    assert.equal(duplicateRes.status, 400);
    assert.ok(duplicateRes.body.error.message.includes('sudah ada'));
  });

  it('5. Ensure other claims and previous batches are isolated and unmodified', async () => {
    const otherClaimId = 'CLM-FKS-202610-0001';
    const otherRes = await request(app).get(`/api/faskes/claims/${otherClaimId}`);
    assert.equal(otherRes.status, 200);
    assert.equal(otherRes.body.data.dischargeDate, '2026-10-01');
    assert.equal(otherRes.body.data.screeningStatus, 'passed');
    assert.equal(otherRes.body.data.lastCorrection, undefined);

    // Upload September batch into isolated period
    const septDemoFilePath = path.resolve(__dirname, '../../demo_batch_sardjito_september_2026.txt');
    const septTxt = fs.readFileSync(septDemoFilePath, 'utf8');

    const septRes = await request(app)
      .post('/api/batches/upload')
      .send({
        content: septTxt,
        period: '2026-09',
        batchName: 'Batch Klaim September 2026'
      });
    assert.equal(septRes.status, 201);

    // Verify October batch claim count and state remained intact
    const octBatchRes = await request(app).get(`/api/batches/${batchId}`);
    assert.equal(octBatchRes.status, 200);
    assert.equal(octBatchRes.body.data.claims.length, 20);
  });
});
