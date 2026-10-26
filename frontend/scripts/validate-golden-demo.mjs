import assert from 'node:assert/strict';
import { goldenDemo, goldenFaskesClaims, goldenVerificatorClaims } from '../src/mocks/goldenDemoScenario.js';
import { mockFaskesClaims } from '../src/mocks/faskesWorkflow.js';
import { mockAnomalyNetwork } from '../src/mocks/investigationNetwork.js';
import { mockVerificatorClaims } from '../src/mocks/verificatorClaims.js';
import { mockVerificatorDashboard } from '../src/mocks/verificatorDashboard.js';

const byId = (items) => Object.fromEntries(items.map((item) => [item.id, item]));
const faskesById = byId(mockFaskesClaims);
const verifierById = byId(mockVerificatorClaims);
const networkById = byId(mockAnomalyNetwork.nodes);
const dashboardById = byId(mockVerificatorDashboard.priorityClaims);

assert.equal(goldenDemo.handoffStatus, 'marked_forwarded', 'Golden Demo hanya boleh muncul lintas role setelah handoff dicatat.');
assert.equal(new Set(goldenDemo.claims.map((claim) => claim.id)).size, goldenDemo.claims.length, 'Claim ID Golden Demo harus unik.');
assert.equal(new Set(goldenDemo.claims.map((claim) => claim.sepNumber)).size, goldenDemo.claims.length, 'SEP Golden Demo harus unik.');

for (const source of goldenDemo.claims) {
  const faskes = faskesById[source.id];
  const verifier = verifierById[source.id];
  assert.ok(faskes, `${source.id} harus tersedia pada data Faskes.`);
  assert.ok(verifier, `${source.id} harus tersedia pada antrean Verifikator.`);
  for (const key of ['sepNumber', 'claimAmount', 'patientId', 'episodeId']) {
    assert.equal(faskes[key], source[key], `${key} Faskes untuk ${source.id} harus konsisten.`);
    assert.equal(verifier[key], source[key], `${key} Verifikator untuk ${source.id} harus konsisten.`);
  }
  assert.equal(faskes.primaryDiagnosis.code, verifier.primaryDiagnosis.code, `Diagnosis ${source.id} harus konsisten.`);
  assert.equal(faskes.billingPeriod, goldenDemo.billingPeriod, `Periode ${source.id} harus konsisten dengan batch.`);
  assert.equal(verifier.sourceBatchId, goldenDemo.batchId, `Referensi batch ${source.id} harus tersedia di Verifikator.`);
}

for (const source of goldenDemo.claims.slice(0, 2)) {
  assert.ok(networkById[source.id], `${source.id} harus dapat ditelusuri pada jaringan investigasi.`);
  assert.ok(dashboardById[source.id], `${source.id} harus tampil pada prioritas dashboard Verifikator.`);
}

const duplicateEdge = mockAnomalyNetwork.edges.find((edge) => edge.id === 'review-duplicate');
assert.deepEqual(new Set([duplicateEdge?.source, duplicateEdge?.target]), new Set(['demo-claim-001', 'demo-claim-002']), 'Relasi duplikasi harus menggunakan claim ID Golden Demo.');
assert.equal(goldenFaskesClaims.length, goldenVerificatorClaims.length, 'Jumlah klaim adapter lintas role harus sama.');

console.log(`Golden Demo valid: ${goldenDemo.claims.length} klaim konsisten dari batch ${goldenDemo.batchId} hingga Verifikator dan jaringan investigasi.`);
