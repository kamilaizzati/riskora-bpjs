import assert from 'node:assert/strict';
import { clusters, mockAnomalyEdges, mockAnomalyNodes, mockAnomalyNetwork } from '../src/mocks/investigationNetwork.js';

const nodeById = Object.fromEntries(mockAnomalyNodes.map((node) => [node.id, node]));
assert.equal(new Set(mockAnomalyNodes.map((node) => node.id)).size, mockAnomalyNodes.length, 'ID node harus unik.');
assert.equal(new Set(mockAnomalyEdges.map((edge) => edge.id)).size, mockAnomalyEdges.length, 'ID edge harus unik.');

for (const node of mockAnomalyNodes) {
  assert.ok(['claim', 'patient', 'facility', 'episode', 'procedure', 'document'].includes(node.entityType), `Tipe node ${node.id} tidak valid.`);
  assert.ok(node.label && node.clusterId && node.provenance, `Node ${node.id} harus memiliki label, klaster, dan provenance.`);
}
for (const edge of mockAnomalyEdges) {
  assert.ok(nodeById[edge.source] && nodeById[edge.target], `Edge ${edge.id} harus merujuk node valid.`);
  assert.ok(edge.relationshipType && edge.explanation && edge.reviewStatus, `Edge ${edge.id} harus dapat dijelaskan.`);
  assert.ok(Object.keys(edge.supportingEvidence || {}).length, `Edge ${edge.id} harus memiliki bukti pendukung.`);
  assert.ok(['Informational', 'Requires Review'].includes(edge.reviewStatus), `Status ${edge.id} tidak valid.`);
}

const duplicate = mockAnomalyEdges.find((edge) => edge.relationshipType === 'potential_duplicate');
assert.equal(duplicate?.reviewStatus, 'Requires Review', 'Duplikasi episode harus memerlukan review.');
assert.equal(duplicate?.supportingEvidence.sharedPatientId, 'PSN-DEMO-001', 'Duplikasi harus didukung pasien Golden Demo yang sama.');
const overlap = mockAnomalyEdges.find((edge) => edge.relationshipType === 'overlapping_episode');
assert.equal(overlap?.reviewStatus, 'Requires Review', 'Episode tumpang tindih harus memerlukan review.');
const dialysis = mockAnomalyEdges.filter((edge) => edge.relationshipType === 'repeated_procedure');
assert.ok(dialysis.length > 0 && dialysis.every((edge) => edge.reviewStatus === 'Informational'), 'Hemodialisis berulang harus tetap informasional.');
const comparable = mockAnomalyEdges.find((edge) => edge.id === 'info-compare');
assert.equal(comparable?.reviewStatus, 'Informational', 'Kelompok pembanding tidak boleh otomatis mencurigakan.');
assert.equal(mockAnomalyEdges.some((edge) => edge.supportingEvidence?.amountSimilarity), false, 'Kesamaan nominal tidak boleh menjadi dasar relasi.');
for (const requiredType of ['repeat_procedure_review','split_care_episode','early_readmission','administrative_conflict','missing_supporting_document','clinical_context_review','coding_version_change','identity_mismatch','reused_document']) {
  assert.ok(mockAnomalyEdges.some((edge) => edge.relationshipType === requiredType), `Skenario ${requiredType} harus tersedia.`);
}
assert.equal(clusters.length, new Set(mockAnomalyNodes.map((node) => node.clusterId)).size, 'Jumlah klaster harus cocok dengan dataset.');
assert.equal(mockAnomalyNetwork.nodes.length, mockAnomalyNodes.length, 'Jumlah node graph harus cocok.');
assert.equal(mockAnomalyNetwork.edges.length, mockAnomalyEdges.length, 'Jumlah edge graph harus cocok.');

console.log(`Validasi jaringan berhasil: ${mockAnomalyNodes.filter((node) => node.entityType === 'claim').length} klaim, ${mockAnomalyNodes.length} entitas, ${clusters.length} klaster, ${mockAnomalyEdges.length} relasi.`);
