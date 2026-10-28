const { it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const BatchService = require('../src/services/batch.service');
const { createIsolatedTestApp } = require('./helpers/test-env');

it('save and rescreen both complete on their first request despite a temporary audit-log lock', async (t) => {
  const { app, tempDir, cleanup } = createIsolatedTestApp({ cleanState: true });
  try {
    const service = new BatchService(tempDir);
    await service.batchRepo.create({ id: 'test', period: '2026-09', claims: [{ id: 'CLM-FKS-202609-0002', screeningStatus: 'needs_correction', initialScreeningStatus: 'needs_correction', documents: [] }] });
    const rename = fs.promises.rename.bind(fs.promises);
    let locksLeft = 2;
    t.mock.method(fs.promises, 'rename', async (source, destination) => {
      if (path.basename(destination) === 'audit-logs.json' && locksLeft-- > 0) {
        throw Object.assign(new Error('Audit file in use'), { code: 'EACCES' });
      }
      return rename(source, destination);
    });
    const saved = await request(app).post('/api/faskes/claims/CLM-FKS-202609-0002/correction').send({
      dischargeDate: '2026-09-14', document: { name: 'resume.pdf', documentType: 'discharge_summary', contentBase64: Buffer.from('%PDF-1.4\n%%EOF').toString('base64') }
    }).expect(200);
    assert.equal(saved.body.data.status, 'ready_for_rescreen');
    locksLeft = 2;
    const screened = await request(app).post('/api/batches/claims/CLM-FKS-202609-0002/rescreen').send({}).expect(200);
    assert.equal(screened.body.data.claim.screeningStatus, 'passed');
    const ready = await request(app).get('/api/faskes/claims?submissionStatus=ready&period=all').expect(200);
    assert.equal(ready.body.data.length, 1);
    const logs = service.auditRepo.readAll().filter((log) => log.entityId === 'CLM-FKS-202609-0002' && log.details?.batchId === 'test');
    assert.equal(logs.filter((log) => log.action === 'BATCH_CLAIM_CORRECTED').length, 1);
    assert.equal(logs.filter((log) => log.action === 'CLAIM_RESCREENED').length, 1);
    assert.equal(logs.find((log) => log.action === 'BATCH_CLAIM_CORRECTED').details.updates.document.contentBase64, undefined);
  } finally { cleanup(); }
});
