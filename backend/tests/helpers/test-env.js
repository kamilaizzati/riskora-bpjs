const fs = require('fs');
const path = require('path');
const createApp = require('../../src/app');

function createIsolatedTestApp() {
  const sourceDir = path.resolve(__dirname, '../../src/data');
  const tempDir = path.resolve(__dirname, `../.tmp-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Copy all seed files and directories (like documents/) to temp test directory
  if (fs.existsSync(sourceDir)) {
    const files = fs.readdirSync(sourceDir);
    for (const file of files) {
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

  // Copy the demo TXT file to tempDir root so useDemoFile=true can find it via process.cwd()-relative paths
  const demoTxtSrc = path.resolve(__dirname, '../../../demo_batch_sardjito_oktober_2026.txt');
  const demoTxtDest = path.resolve(tempDir, 'demo_batch_sardjito_oktober_2026.txt');
  if (fs.existsSync(demoTxtSrc)) {
    fs.copyFileSync(demoTxtSrc, demoTxtDest);
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

