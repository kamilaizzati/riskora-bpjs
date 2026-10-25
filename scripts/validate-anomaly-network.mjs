import assert from 'node:assert/strict';
import { mockAnomalyEdges, mockAnomalyNodes, mockAnomalyNetwork } from '../src/mocks/anomalyNetworkRules.js';

const edgeBetween = (a, b) => mockAnomalyEdges.find((edge) => [edge.source, edge.target].includes(a) && [edge.source, edge.target].includes(b));
const nodeById = Object.fromEntries(mockAnomalyNodes.map((node) => [node.id, node]));

assert.equal(edgeBetween('syn-amount-stroke', 'syn-amount-ckd'), undefined, 'Nominal serupa pada diagnosis berbeda tidak boleh membuat edge.');
assert.equal(edgeBetween('syn-stroke-01', 'syn-stroke-02'), undefined, 'Diagnosis sama pada pasien berbeda tidak boleh membuat edge.');
assert.equal(edgeBetween('syn-separate-01', 'syn-separate-02'), undefined, 'Episode pasien yang terpisah jelas tidak boleh membuat edge.');

for (const edge of mockAnomalyEdges) {
  assert.ok(nodeById[edge.source] && nodeById[edge.target], `Edge ${edge.id} harus merujuk node yang valid.`);
  assert.ok(edge.relationshipType && edge.explanation && edge.reviewStatus, `Edge ${edge.id} harus dapat dijelaskan.`);
  assert.ok(Object.keys(edge.supportingEvidence || {}).length, `Edge ${edge.id} harus memiliki bukti pendukung.`);
  assert.ok(['Informational', 'Requires Review'].includes(edge.reviewStatus), `Status edge ${edge.id} tidak valid.`);
  assert.equal(nodeById[edge.source].patientId, nodeById[edge.target].patientId, `Edge ${edge.id} harus mempunyai konteks pasien yang sama.`);
}

const hemodialysisEdges = mockAnomalyEdges.filter((edge) => edge.supportingEvidence?.procedureCodes?.includes('39.95'));
assert.ok(hemodialysisEdges.length > 0, 'Skenario hemodialisis harus tampil sebagai relasi.');
assert.ok(hemodialysisEdges.every((edge) => edge.reviewStatus === 'Informational'), 'Hemodialisis tidak boleh otomatis memerlukan review.');

const overlappingReview = mockAnomalyEdges.find((edge) => edge.relationshipType === 'overlapping_episode');
assert.equal(overlappingReview?.reviewStatus, 'Requires Review', 'Episode rawat inap tumpang tindih harus dapat memicu review.');
const legitimateTransition = mockAnomalyEdges.find((edge) => edge.relationshipType === 'informational');
assert.equal(legitimateTransition?.reviewStatus, 'Informational', 'Transisi pelayanan yang sah tidak boleh otomatis memerlukan review.');
assert.equal(mockAnomalyNetwork.nodes.length, mockAnomalyNodes.length, 'Jumlah node graph harus cocok.');
assert.equal(mockAnomalyNetwork.edges.length, mockAnomalyEdges.length, 'Jumlah edge graph harus cocok.');

console.log(`Validasi jaringan berhasil: ${mockAnomalyNodes.length} klaim sintetis, ${mockAnomalyEdges.length} relasi berbasis aturan.`);
