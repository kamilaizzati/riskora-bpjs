const { it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const BatchService = require('../src/services/batch.service');
it('corrections stay out of the original batch even before finalization', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'riskora-boundary-'));
  try {
    for (const file of ['submission-batches', 'claims', 'claim-documents', 'audit-logs']) fs.writeFileSync(path.join(dir, file + '.json'), '[]');
    const service = new BatchService(dir);
    await service.batchRepo.create({ id: 'original', period: '2026-10', claims: Array.from({ length: 20 }, (_, i) => ({ id: `claim-${1100+i}`, sepNumber: i < 17 ? `sep-${i}` : '', screeningStatus: 'not_screened' })) });
    await service.runBatchScreening('original');
    await service.updateClaimCorrection('original', 'claim-1117', { sepNumber: 'corrected', correctionNotes: 'Fixed SEP' });
    await service.rescreenClaim('original', 'claim-1117');
    assert.equal((await service.finalizeBatch('original')).finalizedClaimsCount, 17);
    await service.rolloverClaim('original', 'claim-1117');
    assert.equal((await service.markBatchForwarded('original')).forwardedClaimsCount, 17);
    assert.equal(service.getBatchById('BATCH-DEMO-202611').claims.length, 1);
    await assert.rejects(service.rolloverClaim('original', 'claim-1117'), { code: 'DUPLICATE_ROLLOVER' });
    await assert.rejects(service.rolloverClaim('original', 'claim-1118'), { code: 'ROLLOVER_VALIDATION_FAILED' });
    await service.batchRepo.update('BATCH-DEMO-202611', { screeningStatus: 'handed_off' });
    await service.updateClaimCorrection('original', 'claim-1118', { sepNumber: 'fixed', correctionNotes: 'Fixed SEP' });
    await service.rescreenClaim('original', 'claim-1118');
    await assert.rejects(service.rolloverClaim('original', 'claim-1118', { targetBatchId: 'BATCH-DEMO-202611' }), { code: 'TARGET_BATCH_CLOSED' });
    const moved = await service.rolloverClaim('original', 'claim-1118');
    assert.notEqual(moved.targetBatchId, 'BATCH-DEMO-202611');
    assert.equal(service.getBatchById('BATCH-DEMO-202611').claims.length, 1);
    const next = await service.finalizeBatch(moved.targetBatchId);
    assert.equal(next.finalizedClaimsCount, 1);
    assert.equal((await service.markBatchForwarded('original')).forwardedClaimsCount, 17);
    assert.equal((await service.runBatchScreening('original')).forwardedClaimsCount, 17);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
