const fs = require('fs');
const path = require('path');
const createApp = require('../../src/app');

function createIsolatedTestApp(options = {}) {
  const { emptySubmissionBatches = false, cleanState = false } = options;
  const sourceDir = path.resolve(__dirname, '../../src/data');
  const seedDir = path.resolve(__dirname, '../../src/data/seed');
  const tempDir = path.resolve(__dirname, `../.tmp-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Copy all files from sourceDir
  if (fs.existsSync(sourceDir)) {
    const files = fs.readdirSync(sourceDir);
    for (const file of files) {
      if (file === 'seed' || file === '.strict_clean_state') continue;
      const srcPath = path.join(sourceDir, file);
      const destPath = path.join(tempDir, file);
      const stat = fs.statSync(srcPath);
      if (stat.isDirectory()) {
        fs.cpSync(srcPath, destPath, { recursive: true });
      } else if (stat.isFile()) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  // Copy demo TXT files to tempDir root so useDemoFile=true can find them via process.cwd()-relative paths
  const demoTxtSrc = path.resolve(__dirname, '../../../demo_batch_sardjito_oktober_2026.txt');
  const demoTxtDest = path.resolve(tempDir, 'demo_batch_sardjito_oktober_2026.txt');
  if (fs.existsSync(demoTxtSrc)) {
    fs.copyFileSync(demoTxtSrc, demoTxtDest);
  }

  const demoSeptTxtSrc = path.resolve(__dirname, '../../../demo_batch_sardjito_september_2026.txt');
  const demoSeptTxtDest = path.resolve(tempDir, 'demo_batch_sardjito_september_2026.txt');
  if (fs.existsSync(demoSeptTxtSrc)) {
    fs.copyFileSync(demoSeptTxtSrc, demoSeptTxtDest);
  }

  if (cleanState) {
    fs.writeFileSync(path.join(tempDir, '.strict_clean_state'), 'true\n', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'claims.json'), '[]\n', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'submission-batches.json'), '[]\n', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'fraud-findings.json'), '[]\n', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'analysis-runs.json'), '[]\n', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'claim-reviews.json'), '[]\n', 'utf8');
  } else if (fs.existsSync(seedDir)) {
    // Explicitly load seed fixtures for test suites that verify processing of seed records
    const seedFiles = fs.readdirSync(seedDir);
    for (const file of seedFiles) {
      fs.copyFileSync(path.join(seedDir, file), path.join(tempDir, file));
    }
  }

  if (emptySubmissionBatches) {
    fs.writeFileSync(path.join(tempDir, 'submission-batches.json'), '[]\n', 'utf8');
  }

  const app = createApp({ dataDir: tempDir });

  const cleanup = () => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (_) {}
  };

  return { app, tempDir, cleanup };
}

module.exports = {
  createIsolatedTestApp
};
