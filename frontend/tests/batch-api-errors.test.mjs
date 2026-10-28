import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Bundle the real browser service with the same API-mode settings as Vite.
const compiled = await build({ entryPoints: [fileURLToPath(new URL('../src/services/faskesBatchService.js', import.meta.url))],
  bundle: true, write: false, format: 'esm', platform: 'node', define: {
    'import.meta.env.VITE_USE_MOCK_API': '"false"', 'import.meta.env.VITE_API_BASE_URL': '""',
  } });
const service = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const originals = { fetch: globalThis.fetch, localStorage: globalThis.localStorage, window: globalThis.window };
let saved;
let writes;
beforeEach(() => {
  saved = JSON.stringify([{ id: 'cached-batch', claims: [{ id: 'cached-claim', screeningStatus: 'passed', correctionStatus: 'ready_for_rescreen' }] }]);
  writes = 0;
  globalThis.localStorage = { getItem: () => saved, setItem: (_, value) => { writes++; saved = value; } };
  globalThis.window = { setTimeout, dispatchEvent() {} };
  globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({ error: { message: 'Backend batch not found' } }) });
});
after(() => { Object.assign(globalThis, originals); });

for (const [name, action] of [
  ['create demo', () => service.createDemoBatch({ period: '2026-09' })],
  ['screen', () => service.runBatchPrescreening('cached-batch')],
  ['finalize', () => service.finalizeBatchScreening('cached-batch')],
  ['handoff', () => service.markBatchForwarded('cached-batch')],
  ['save correction', () => service.updateClaimCorrection('cached-claim', {})],
  ['rescreen', () => service.rescreenCorrectedClaim('cached-claim')],
]) {
  test(`${name}: an API error cannot succeed through cached demo data`, async () => {
    await assert.rejects(action(), /Backend batch not found/);
    assert.equal(writes, 0, 'failed API requests must not mutate local batches');
  });
}
