const { it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const BatchService = require('../src/services/batch.service');
const request = require('supertest');
const createApp = require('../src/app');

async function scenario(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'riskora-resubmission-'));
  try {
    for (const file of ['submission-batches', 'claims', 'claim-documents', 'audit-logs']) fs.writeFileSync(path.join(dir, `${file}.json`), '[]');
    const service = new BatchService(dir);
    await service.batchRepo.create({ id: 'original', name: 'Batch Awal', period: '2026-10', claims: Array.from({ length: 20 }, (_, i) => ({ id: `claim-${1100 + i}`, sepNumber: i < 17 ? `sep-${i}` : '', screeningStatus: 'not_screened' })) });
    await service.runBatchScreening('original');
    await service.finalizeBatch('original');
    await service.markBatchForwarded('original');
    await service.updateClaimCorrection('original', 'claim-1117', { sepNumber: 'corrected', correctionNotes: 'Fixed SEP' });
    await service.rescreenClaim('original', 'claim-1117');
    await run(service);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

it('successful correction waits in a durable queue without creating a batch', () => scenario(async (service) => {
  assert.equal(service.getBatches().length, 1);
  const restarted = new BatchService(service.customDataDir);
  const queue = restarted.getReadyResubmissions();
  assert.equal(queue.length, 1);
  assert.equal(queue[0].id, 'claim-1117');
  assert.equal(queue[0].sourceBatchId, 'original');
  assert.equal(queue[0].resubmissionStatus, 'ready');
  const original = restarted.getBatchById('original');
  assert.equal(original.forwardedClaimsCount, 17);
  assert.equal(original.claims.filter((claim) => claim.isForwarded).length, 17);
  assert.equal(original.claims.filter((claim) => claim.screeningStatus === 'needs_correction').length, 2);
}));

it('explicit selection creates a same-period draft and leaves a link in batch history', () => scenario(async (service) => {
  const selections = [{ sourceBatchId: 'original', claimId: 'claim-1117' }];
  const target = await service.includeResubmissions({ selections, period: '2026-10' });
  assert.notEqual(target.id, 'original');
  assert.equal(target.period, '2026-10');
  assert.equal(target.screeningStatus, 'draft');
  assert.equal(target.claims.length, 1);
  assert.equal(service.getReadyResubmissions().length, 0);
  const history = service.getBatchById('original').claims.find((claim) => claim.id === 'claim-1117');
  assert.equal(history.targetBatchId, target.id);
  assert.equal(history.resubmissionStatus, 'submitted');
  assert.equal(history.rolloverStatus, 'rolled_over');
  assert.equal(service.getBatchById('original').forwardedClaimsCount, 17);
  await assert.rejects(service.includeResubmissions({ selections, period: '2026-10' }), { code: 'INVALID_RESUBMISSION' });
  assert.equal(service.getBatches().length, 2);
  await service.runBatchScreening(target.id);
  assert.equal((await service.finalizeBatch(target.id)).finalizedClaimsCount, 1);
}));

it('selection can join an uploaded draft; invalid or closed selections make no changes', () => scenario(async (service) => {
  const selections = [{ sourceBatchId: 'original', claimId: 'claim-1117' }];
  await service.batchRepo.create({ id: 'uploaded', period: '2026-10', screeningStatus: 'draft', claims: [{ id: 'new-claim', sepNumber: 'new' }] });
  await assert.rejects(service.includeResubmissions({ targetBatchId: 'original', selections }), { code: 'TARGET_BATCH_CLOSED' });
  await assert.rejects(service.includeResubmissions({ targetBatchId: 'uploaded', selections: [...selections, { sourceBatchId: 'original', claimId: 'claim-1118' }] }), { code: 'INVALID_RESUBMISSION' });
  assert.equal(service.getReadyResubmissions().length, 1);
  assert.equal(service.getBatchById('uploaded').claims.length, 1);
  const target = await service.includeResubmissions({ targetBatchId: 'uploaded', selections });
  assert.equal(target.claims.length, 2);
  assert.equal(service.getReadyResubmissions().length, 0);
}));

it('API includes corrected claims in all claims, supports ready filtering, and retains batch history', () => scenario(async (service) => {
  const app = createApp({ dataDir: service.customDataDir });
  const queue = await request(app).get('/api/batches/resubmissions').expect(200);
  assert.equal(queue.body.data.length, 1);
  const active = await request(app).get('/api/faskes/claims?period=all').expect(200);
  assert.equal(active.body.data.filter((claim) => claim.id === 'claim-1117').length, 1);
  const ready = await request(app).get('/api/faskes/claims?submissionStatus=ready&period=all').expect(200);
  assert.deepEqual(ready.body.data.map((claim) => claim.id), ['claim-1117']);
  const pending = await request(app).get('/api/faskes/claims?screeningStatus=needs_correction&period=all').expect(200);
  assert.equal(pending.body.data.length, 2);
  assert.equal(pending.body.data.some((claim) => claim.id === 'claim-1117'), false);
  const history = await request(app).get('/api/faskes/claims?batchId=original&period=all').expect(200);
  assert.equal(history.body.data.some((claim) => claim.id === 'claim-1117'), true);
  const included = await request(app).post('/api/batches/resubmissions').send({ period: '2026-10', selections: [{ sourceBatchId: 'original', claimId: 'claim-1117' }] }).expect(200);
  const next = await request(app).get('/api/faskes/claims?period=all').expect(200);
  assert.equal(next.body.data.filter((claim) => claim.id === 'claim-1117').length, 1);
  assert.equal(next.body.data.find((claim) => claim.id === 'claim-1117').batchId, included.body.data.id);
  assert.equal((await request(app).get('/api/batches/resubmissions').expect(200)).body.data.length, 0);
  assert.equal((await request(app).get('/api/faskes/claims?submissionStatus=ready&period=all').expect(200)).body.data.length, 0);
}));
