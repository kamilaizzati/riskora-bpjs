const { it } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

async function startAndStop(dataDir, reset) {
  const child = spawn(process.execPath, [path.resolve(__dirname, '../src/server.js')], {
    windowsHide: true, env: { ...process.env, DATA_DIR: dataDir, PORT: '0', RESET_CLAIMS_ON_START: reset ? 'true' : 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await new Promise((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(new Error('Server startup timed out')), 10000);
      child.on('error', (error) => { clearTimeout(timer); reject(error); });
      child.stdout.on('data', (chunk) => {
        output += chunk.toString();
        if (output.includes('Riskora Backend Server Running')) { clearTimeout(timer); resolve(); }
      });
      child.on('exit', (code) => { clearTimeout(timer); reject(new Error(`Server exited before ready: ${code}`)); });
    });
  } finally {
    const closed = once(child, 'close');
    child.kill();
    await closed;
  }
}

it('server restart preserves submitted batches and corrections by default', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'riskora-restart-'));
  try {
    const batch = [{ id: 'BATCH-DEMO-202609', claims: [{ id: 'CLM-FKS-202609-0002', correctionStatus: 'ready_for_rescreen' }] }];
    fs.writeFileSync(path.join(dir, 'submission-batches.json'), JSON.stringify(batch));
    fs.writeFileSync(path.join(dir, 'claims.json'), '[]');
    await startAndStop(dir, false);
    await startAndStop(dir, false);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'submission-batches.json'))), batch);
    await startAndStop(dir, true);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'submission-batches.json'))), []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
