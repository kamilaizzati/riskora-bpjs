const fs = require('fs');
const path = require('path');

function mergeSeedDocuments(dataDir) {
  const targetPath = path.join(dataDir, 'claim-documents.json');
  const seedPath = path.resolve(__dirname, '../../../riskora_seed_package_20_claims/riskora_seed_package/claim_documents.json');

  if (!fs.existsSync(seedPath)) {
    console.warn('Seed documents package not found at:', seedPath);
    return;
  }

  const existingDocs = fs.existsSync(targetPath) ? JSON.parse(fs.readFileSync(targetPath, 'utf8')) : [];
  const seedDocs = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  const docsById = new Map();
  for (const doc of existingDocs) {
    docsById.set(doc.id, doc);
  }

  for (const doc of seedDocs) {
    const normalizedDoc = {
      ...doc,
      status: doc.fileStatus || 'available',
      filePath: doc.fileName,
      mimeType: doc.mimeType || 'application/pdf',
      previewUrl: `/api/documents/${doc.id}/preview`
    };
    docsById.set(doc.id, normalizedDoc);

    // Also register an alias for CLM-FKS- claims so Faskes view links smoothly
    if (doc.claimId && doc.claimId.startsWith('CLM-DEMO-')) {
      const fksClaimId = doc.claimId.replace('CLM-DEMO-', 'CLM-FKS-');
      const fksDocId = doc.id.replace('DOC-DEMO-', 'DOC-FKS-');
      docsById.set(fksDocId, {
        ...normalizedDoc,
        id: fksDocId,
        claimId: fksClaimId,
        previewUrl: `/api/documents/${fksDocId}/preview`
      });
    }
  }

  const merged = Array.from(docsById.values());
  fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`Merged ${merged.length} documents into ${targetPath}`);
  return merged;
}

if (require.main === module) {
  const dataDir = path.resolve(__dirname, '../data');
  mergeSeedDocuments(dataDir);
}

module.exports = mergeSeedDocuments;
