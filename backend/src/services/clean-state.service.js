const fs = require('fs');
const path = require('path');

/**
 * Clean State Service
 * Enforces strict clean-state behavior on application startup.
 * Claims only exist after a manual TXT upload is processed.
 */

const CLAIM_STORE_FILES = [
  'claims.json',
  'submission-batches.json',
  'fraud-findings.json',
  'analysis-runs.json',
  'claim-reviews.json'
];

function resetClaimStores(dataDir) {
  if (!dataDir || !fs.existsSync(dataDir)) return;

  for (const filename of CLAIM_STORE_FILES) {
    const filePath = path.join(dataDir, filename);
    try {
      fs.writeFileSync(filePath, '[]\n', 'utf8');
    } catch (err) {
      console.error(`[CleanState] Failed to reset ${filename}:`, err.message);
    }
  }
}

function seedClaimsForTesting(dataDir) {
  if (!dataDir || !fs.existsSync(dataDir)) return;
  const seedDir = path.join(dataDir, 'seed');
  if (!fs.existsSync(seedDir)) return;

  for (const filename of CLAIM_STORE_FILES) {
    const seedPath = path.join(seedDir, filename);
    const destPath = path.join(dataDir, filename);
    if (fs.existsSync(seedPath)) {
      try {
        fs.copyFileSync(seedPath, destPath);
      } catch (err) {
        console.error(`[CleanState] Failed to seed ${filename}:`, err.message);
      }
    }
  }
}

function isCleanState(dataDir) {
  if (!dataDir || !fs.existsSync(dataDir)) return true;
  try {
    const claimsPath = path.join(dataDir, 'claims.json');
    const batchesPath = path.join(dataDir, 'submission-batches.json');
    const claims = fs.existsSync(claimsPath) ? JSON.parse(fs.readFileSync(claimsPath, 'utf8')) : [];
    const batches = fs.existsSync(batchesPath) ? JSON.parse(fs.readFileSync(batchesPath, 'utf8')) : [];
    const hasBatchClaims = batches.some((b) => Array.isArray(b.claims) && b.claims.length > 0);
    return claims.length === 0 && !hasBatchClaims;
  } catch {
    return true;
  }
}

module.exports = {
  resetClaimStores,
  seedClaimsForTesting,
  isCleanState,
  CLAIM_STORE_FILES
};
