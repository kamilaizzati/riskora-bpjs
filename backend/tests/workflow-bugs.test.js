const { it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const BatchService = require('../src/services/batch.service');
const { createIsolatedTestApp } = require('./helpers/test-env');
const { getAnomalyTypes } = require('../src/utils/anomaly-types');

it('risk score alone does not fabricate a fraud category', () => {
  assert.deepEqual(getAnomalyTypes({ riskScore: 99 }, []), []);
  assert.deepEqual(getAnomalyTypes({}, [
    { findingType: 'DUPLICATE_BILLING_INDICATOR', title: 'Indikasi Nomor SEP Ganda' },
    { findingType: 'DUPLICATE_BILLING_INDICATOR', title: 'Repeat Billing' },
  ]), ['Repeat Billing']);
});

it('monthly trend totals match the claims returned by the backend, without inventing service dates', async () => {
  const { app, tempDir, cleanup } = createIsolatedTestApp();
  try {
    const service = new BatchService(tempDir);
    await service.claimsRepo.create({ id: 'undated-trend', anomalyTypes: ['Upcoding'], riskScore: 90 });
    const { body: claims } = await request(app).get('/api/verificator/claims').expect(200);
    assert.equal(claims.find((claim) => claim.id === 'undated-trend').serviceDate, null);
    const { buildAnomalyTrend } = await import('../../frontend/src/utils/anomalyTrend.js');
    const categories = ['Upcoding', 'Repeat Billing', 'Unbundling', 'Tariff Review', 'Incomplete Documents', 'Phantom Billing'];
    const rows = buildAnomalyTrend(claims, categories);
    const last = rows.at(-1);
    for (const category of categories) {
      assert.equal(last[category], claims.filter((claim) => claim.serviceDate?.startsWith('2026-10') && claim.anomalyTypes.includes(category)).length);
    }
  } finally { cleanup(); }
});

it('seed findings use the same anomaly categories in the queue and claim detail', async () => {
  const { app, cleanup } = createIsolatedTestApp();
  try {
    const response = await request(app).get('/api/verificator/claims').expect(200);
    const claims = response.body;
    const expected = ['Upcoding', 'Repeat Billing', 'Unbundling', 'Tariff Review', 'Incomplete Documents', 'Phantom Billing'];
    for (let i = 0; i < expected.length; i++) {
      const claim = claims.find((item) => item.id === `66a1f8b1c200000000001${String([1, 2, 3, 4, 5, 7][i]).padStart(3, '0')}`);
      assert.ok(claim, `seed claim ${i + 1} exists`);
      assert.deepEqual(claim.anomalyTypes, [expected[i]]);
      const detail = await request(app).get(`/api/claims/${claim.id}`).expect(200);
      assert.deepEqual(detail.body.data.anomalyTypes, [expected[i]]);
    }
  } finally { cleanup(); }
});

it('a fresh correction with a PDF succeeds on its first save and first rescreen', async () => {
  const { app, tempDir, cleanup } = createIsolatedTestApp({ cleanState: true });
  try {
    const service = new BatchService(tempDir);
    await service.batchRepo.create({ id: 'first-save', period: '2026-10', claims: [{ id: 'CLM-FKS-202610-0002', sepNumber: 'SEP-TEST', screeningStatus: 'needs_correction', admissionDate: '2026-10-10', dischargeDate: '2026-10-10', documents: [] }] });
    const payload = { dischargeDate: '2026-10-14', document: { name: 'first-save.pdf', documentType: 'discharge_summary', contentBase64: Buffer.from('%PDF-1.4\n%%EOF').toString('base64') } };
    const saved = await request(app).post('/api/faskes/claims/CLM-FKS-202610-0002/correction').send(payload).expect(200);
    assert.equal(saved.body.data.status, 'ready_for_rescreen');
    const screened = await request(app).post('/api/batches/claims/CLM-FKS-202610-0002/rescreen').send({}).expect(200);
    assert.equal(screened.body.data.claim.screeningStatus, 'passed');
    const queue = await request(app).get('/api/faskes/claims?submissionStatus=ready&period=all').expect(200);
    assert.equal(queue.body.data.length, 1);
  } finally { cleanup(); }
});

it('appendectomy accepts an operation-report upload regardless of filename, while invalid dates still fail', async () => {
  const { app, tempDir, cleanup } = createIsolatedTestApp({ cleanState: true });
  try {
    const service = new BatchService(tempDir);
    await service.docsRepo.writeAll([]);
    await service.batchRepo.create({ id: 'appendectomy', period: '2026-10', claims: [{ id: 'CLM-FKS-202610-0005', serviceType: 'INPATIENT', admissionDate: '2026-10-10', dischargeDate: '2026-10-10' }] });
    await service.runBatchScreening('appendectomy');
    const { createCorrectionDemoFile, getCorrectionDocument } = await import('../../frontend/src/utils/correctionDocument.js');
    const required = getCorrectionDocument(service.getBatchById('appendectomy').claims[0]);
    const demoFile = createCorrectionDemoFile(required);
    await request(app).post('/api/faskes/claims/CLM-FKS-202610-0005/correction').send({ dischargeDate: '2026-10-14', document: {
      ...demoFile, name: 'lampiran.pdf', documentType: required.type
    } }).expect(200);
    const result = await request(app).post('/api/batches/claims/CLM-FKS-202610-0005/rescreen').send({}).expect(200);
    assert.equal(result.body.data.claim.screeningStatus, 'passed');
    const queue = await request(app).get('/api/faskes/claims?submissionStatus=ready&period=all').expect(200);
    assert.equal(queue.body.data.length, 1);
    await request(app).post('/api/faskes/claims/CLM-FKS-202610-0005/correction').send({ dischargeDate: '2026-10-01' }).expect(200);
    const invalid = await request(app).post('/api/batches/claims/CLM-FKS-202610-0005/rescreen').send({}).expect(200);
    assert.equal(invalid.body.data.claim.screeningStatus, 'needs_correction');
    assert.ok(invalid.body.data.claim.screeningFindings.some((finding) => finding.code === 'invalid_discharge_date'));
  } finally { cleanup(); }
});
