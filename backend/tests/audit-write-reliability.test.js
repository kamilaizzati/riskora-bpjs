const { it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const JsonRepository = require('../src/repositories/json.repository');

async function scenario(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'riskora-audit-'));
  try {
    fs.writeFileSync(path.join(dir, 'audit-logs.json'), '[]');
    await run(new JsonRepository('audit-logs.json', dir));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

it('one save survives a temporary Windows lock without asking the user to retry', (t) => scenario(async (repo) => {
  const rename = fs.promises.rename.bind(fs.promises);
  let attempts = 0;
  t.mock.method(fs.promises, 'rename', async (...args) => {
    if (++attempts < 3) throw Object.assign(new Error('temporarily locked'), { code: 'EPERM' });
    return rename(...args);
  });
  // Copying over the destination is also denied while the file is locked.
  t.mock.method(fs.promises, 'copyFile', async () => { throw Object.assign(new Error('locked'), { code: 'EACCES' }); });
  await repo.create({ id: 'saved-once' });
  assert.deepEqual(repo.readAll(), [{ id: 'saved-once' }]);
  assert.equal(attempts, 3);
}));

it('simultaneous audit entries from different repository instances are not lost', () => scenario(async (repo) => {
  const other = new JsonRepository('audit-logs.json', repo.dataDir);
  await Promise.all(Array.from({ length: 12 }, (_, i) => (i % 2 ? repo : other).create({ id: `audit-${i}` })));
  assert.equal(repo.readAll().length, 12);
}));

it('one failed write does not poison the next queued request or erase existing data', (t) => scenario(async (repo) => {
  const rename = fs.promises.rename.bind(fs.promises);
  let attempts = 0;
  t.mock.method(fs.promises, 'rename', async (...args) => {
    if (++attempts === 1) throw Object.assign(new Error('disk failure'), { code: 'EIO' });
    return rename(...args);
  });
  const results = await Promise.allSettled([repo.create({ id: 'failed' }), repo.create({ id: 'next-request' })]);
  assert.equal(results[0].status, 'rejected');
  assert.equal(results[1].status, 'fulfilled');
  assert.deepEqual(repo.readAll(), [{ id: 'next-request' }]);
}));
