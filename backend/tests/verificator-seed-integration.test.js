const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const createApp = require('../src/app');
const { createIsolatedTestApp } = require('./helpers/test-env');
const { parseSeedClaimsMarkdown, loadSeedClaimsFile } = require('../src/utils/seed-claims-parser');
const VerificatorDataService = require('../src/services/verificator-data.service');

describe('Verificator Seed & Casemix Data Integration', () => {
  let app;
  let env;

  before(() => {
    env = createIsolatedTestApp();
    app = env.app;
  });

  after(() => {
    if (env && env.cleanup) env.cleanup();
  });

  describe('1. Markdown Seed Parser Unit Verification', () => {
    it('successfully loads and parses mock_claims_seed_data_20_cases.md', () => {
      const result = loadSeedClaimsFile();
      assert.ok(result.success, 'Parser must succeed on valid seed markdown file');
      assert.equal(result.totalParsed, 20, 'Parser must extract exactly 20 cases');
      assert.equal(result.claims.length, 20, 'Array of claims must have length 20');
      assert.equal(result.invalidCount, 0, 'No records should fail validation');
    });

    it('accurately parses currency, diagnosis, procedures, and dates for all 20 cases', () => {
      const result = loadSeedClaimsFile();
      const first = result.claims[0];

      assert.equal(first.id, '66a1f8b1c200000000001001');
      assert.equal(first.sepNumber, '0182R0011026V001');
      assert.equal(typeof first.claimAmount, 'number');
      assert.equal(first.claimAmount, 18450000);
      assert.equal(first.primaryDiagnosis.code, 'I63.9');
      assert.equal(first.facilityName, 'RSUP Dr. Sardjito');
      assert.equal(first.serviceType, 'INPATIENT');
      assert.ok(Array.isArray(first.procedures));
      assert.ok(first.billingBreakdown);
      assert.equal(first.billingBreakdown.total, first.claimAmount);
    });

    it('robustly handles custom markdown table string and edge whitespaces', () => {
      const sampleMd = `
# Sample Seed Data
| Claim ID | No SEP | Tanggal Pengajuan | Jenis Pelayanan | Kode ICD-10 | Nama Diagnosis | Nilai Klaim (Rp) | Faskes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 66a1f8b1c200000000009999 | 0182R0011026V999 | 2026-10-15 | Rawat Jalan | E11.9 | Diabetes Melitus Tipe 2 | Rp 1.500.000 | RSUD Sleman |
`;
      const parsed = parseSeedClaimsMarkdown(sampleMd);
      assert.equal(parsed.claims.length, 1);
      assert.equal(parsed.claims[0].id, '66a1f8b1c200000000009999');
      assert.equal(parsed.claims[0].claimAmount, 1500000);
      assert.equal(parsed.claims[0].facilityName, 'RSUD Sleman');
    });
  });

  describe('2. Verificator Data Aggregation Service', () => {
    it('aggregates Casemix claims and 20 seed claims deduplicating by ID and SEP', () => {
      const service = new VerificatorDataService(env.tempDir);
      const claims = service.getAggregatedClaims();

      // Seed has 20 cases with prefix 66a1f8b1c2000000000010
      const seedCases = claims.filter((c) => c.id.startsWith('66a1f8b1c2000000000010'));
      assert.equal(seedCases.length, 20, 'Must include the 20 seed cases');

      // Unique claim IDs and SEP numbers
      const ids = new Set(claims.map((c) => c.id));
      assert.equal(ids.size, claims.length, 'Claim IDs must be unique');

      const seps = new Set(claims.map((c) => c.sepNumber).filter(Boolean));
      assert.equal(seps.size, claims.length, 'SEP numbers must be unique');
    });

    it('injects 20 seed claims directly from markdown when claims.json has only Casemix data', () => {
      const mockEnv = createIsolatedTestApp();
      try {
        fs.writeFileSync(path.join(mockEnv.tempDir, 'claims.json'), JSON.stringify([
          { id: 'CLM-FKS-202610-0001', noSep: 'DEMO-SEP-0001', claimAmount: 500000, screeningStatus: 'passed' }
        ]), 'utf8');
        fs.writeFileSync(path.join(mockEnv.tempDir, 'submission-batches.json'), '[]', 'utf8');

        const mockService = new VerificatorDataService(mockEnv.tempDir);
        const claims = mockService.getAggregatedClaims();

        assert.equal(claims.length, 21, 'Must have 1 casemix claim + 20 markdown seed claims');
        const markdownSeedClaims = claims.filter((c) => c.isSeed);
        assert.equal(markdownSeedClaims.length, 20, 'Must load exactly 20 seed claims from markdown');
      } finally {
        mockEnv.cleanup();
      }
    });

    it('never includes Casemix claims with screeningStatus = needs_correction or unpassed', () => {
      const service = new VerificatorDataService(env.tempDir);
      const claims = service.getAggregatedClaims();

      for (const claim of claims) {
        assert.notEqual(claim.screeningStatus, 'needs_correction', 'Needs correction claims must never be in Verificator queue');
        assert.notEqual(claim.rolloverStatus, 'rolled_over', 'Rolled over claims must never be in Verificator queue');
      }
    });

    it('summary metrics match the exact status sums of aggregated queue', () => {
      const service = new VerificatorDataService(env.tempDir);
      const claims = service.getAggregatedClaims();
      const metrics = service.getSummaryMetrics();

      assert.equal(metrics.success, true);
      assert.equal(metrics.totalClaims, claims.length);
      assert.equal(
        metrics.pendingVerification + metrics.inReview + metrics.completed,
        metrics.totalClaims,
        'Sum of queue status categories must equal total claims'
      );
    });
  });

  describe('3. Verificator API Endpoints Verification', () => {
    it('GET /api/verificator/claims returns aggregated list including seed claims', async () => {
      const res = await request(app).get('/api/verificator/claims');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length >= 20, 'Queue must contain at least 20 claims');

      const hasSeed = res.body.some((c) => c.id === '66a1f8b1c200000000001001');
      assert.equal(hasSeed, true, 'Seed claim 66a1f8b1c200000000001001 must be present in queue');
    });

    it('GET /api/verificator/dashboard/summary returns consistent metrics', async () => {
      const summaryRes = await request(app).get('/api/verificator/dashboard/summary');
      const queueRes = await request(app).get('/api/verificator/claims');

      assert.equal(summaryRes.status, 200);
      assert.equal(summaryRes.body.success, true);
      assert.equal(summaryRes.body.totalClaims, queueRes.body.length);
      assert.equal(
        summaryRes.body.pendingVerification + summaryRes.body.inReview + summaryRes.body.completed,
        summaryRes.body.totalClaims
      );
    });

    it('GET /api/verificator/dashboard/priority-claims returns prioritized sorted list', async () => {
      const res = await request(app).get('/api/verificator/dashboard/priority-claims');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length > 0);

      // Verify descending sort by riskScore
      for (let i = 1; i < res.body.length; i++) {
        assert.ok(
          res.body[i - 1].riskScore >= res.body[i].riskScore,
          'Priority claims must be ordered in descending order of risk score'
        );
      }
    });

    it('GET /api/verificator/claims/:id returns enriched claim detail for seed case', async () => {
      const seedId = '66a1f8b1c200000000001001';
      const res = await request(app).get(`/api/verificator/claims/${seedId}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.id, seedId);
      assert.equal(res.body.sepNumber, '0182R0011026V001');
      assert.equal(res.body.claimAmount, 18450000);
      assert.ok(Array.isArray(res.body.documents), 'Documents must be an array');
      assert.ok(res.body.documents.length >= 3, 'Must contain required document tabs');
      assert.ok(Array.isArray(res.body.findings), 'Findings must be an array');
      assert.ok(res.body.billingBreakdown, 'Billing breakdown must be present');
    });

    it('GET /api/verificator/claims supports query filters (riskLevel, status, search)', async () => {
      const resHigh = await request(app).get('/api/verificator/claims?riskLevel=high');
      assert.equal(resHigh.status, 200);
      assert.ok(resHigh.body.every((c) => c.riskLevel === 'high'));

      const resSearch = await request(app).get('/api/verificator/claims?search=Stroke');
      assert.equal(resSearch.status, 200);
      assert.ok(resSearch.body.length > 0);
      assert.ok(
        resSearch.body.every((c) =>
          (c.primaryDiagnosis?.description || '').toLowerCase().includes('stroke') ||
          (c.primaryDiagnosis?.code || '').toLowerCase().includes('stroke') ||
          (c.sepNumber || '').toLowerCase().includes('stroke')
        )
      );
    });

    it('Multiple calls are idempotent and do not append or mutate file store', async () => {
      const res1 = await request(app).get('/api/verificator/claims');
      const res2 = await request(app).get('/api/verificator/claims');
      const res3 = await request(app).get('/api/verificator/claims');

      assert.equal(res1.body.length, res2.body.length);
      assert.equal(res2.body.length, res3.body.length);

      const summary1 = await request(app).get('/api/verificator/dashboard/summary');
      const summary2 = await request(app).get('/api/verificator/dashboard/summary');

      assert.deepEqual(summary1.body, summary2.body);
    });
  });

  describe('4. Lifecycle & Architecture Requirements (Section F Verification)', () => {
    it('F1 & F2: Normal mode displays 20 seed claims, and backend restart preserves seed', async () => {
      const isolatedEnv = createIsolatedTestApp();
      try {
        fs.writeFileSync(path.join(isolatedEnv.tempDir, 'claims.json'), '[]', 'utf8');
        fs.writeFileSync(path.join(isolatedEnv.tempDir, 'submission-batches.json'), '[]', 'utf8');

        // Startup 1
        const app1 = createApp({ dataDir: isolatedEnv.tempDir });
        const res1 = await request(app1).get('/api/verificator/claims');
        assert.equal(res1.status, 200);
        assert.equal(res1.body.length, 20, 'Normal mode must display 20 seed claims even if claims.json is empty');

        // Restart (Startup 2 with same dataDir)
        const app2 = createApp({ dataDir: isolatedEnv.tempDir });
        const res2 = await request(app2).get('/api/verificator/claims');
        assert.equal(res2.status, 200);
        assert.equal(res2.body.length, 20, 'Restarting backend does NOT lose seed claims');
      } finally {
        isolatedEnv.cleanup();
      }
    });

    it('F3 & F4: Successful Casemix upload adds new claims, and restart preserves transaction data', async () => {
      const isolatedEnv = createIsolatedTestApp();
      try {
        fs.writeFileSync(path.join(isolatedEnv.tempDir, 'claims.json'), '[]', 'utf8');
        fs.writeFileSync(path.join(isolatedEnv.tempDir, 'submission-batches.json'), '[]', 'utf8');

        const appInstance = createApp({ dataDir: isolatedEnv.tempDir });

        // Initial count: 20 seed claims
        const initialRes = await request(appInstance).get('/api/verificator/claims');
        assert.equal(initialRes.body.length, 20);

        // Upload Casemix batch
        const uploadRes = await request(appInstance)
          .post('/api/batches/upload')
          .send({
            period: '2026-10',
            batchName: 'Batch Lifecycle Test',
            fileName: 'demo_batch_sardjito_oktober_2026.txt',
            useDemoFile: true
          });
        assert.equal(uploadRes.status, 201);
        const batchId = uploadRes.body.data.id;

        // Run screening
        await request(appInstance).post(`/api/batches/${batchId}/screening`).send({});

        // Finalize valid claims
        const finalizeRes = await request(appInstance).post(`/api/batches/${batchId}/finalize`).send({});
        assert.equal(finalizeRes.status, 200);
        const finalizedCount = finalizeRes.body.data.finalizedClaimsCount;
        assert.ok(finalizedCount > 0, 'Must finalize valid claims');

        // Combined count on Verificator Dashboard: 20 Seed + Finalized Casemix claims
        const combinedRes = await request(appInstance).get('/api/verificator/claims');
        assert.equal(combinedRes.body.length, 20 + finalizedCount, 'Dashboard must show seed + casemix claims');

        // Restart application: transaction data must NOT be lost
        const restartedApp = createApp({ dataDir: isolatedEnv.tempDir });
        const postRestartRes = await request(restartedApp).get('/api/verificator/claims');
        assert.equal(postRestartRes.body.length, 20 + finalizedCount, 'Restarting backend preserves Casemix transaction data');
      } finally {
        isolatedEnv.cleanup();
      }
    });

    it('F5 & F6: Review action on claim persists and is NOT overwritten by static seed', async () => {
      const isolatedEnv = createIsolatedTestApp();
      try {
        const appInstance = createApp({ dataDir: isolatedEnv.tempDir });

        // Review seed claim 66a1f8b1c200000000001001
        const seedId = '66a1f8b1c200000000001001';
        const reviewRes = await request(appInstance)
          .post(`/api/claims/${seedId}/reviews`)
          .send({
            decision: 'NEEDS_INVESTIGATION',
            notes: 'Investigasi indikasi upcoding lanjutan.'
          });
        assert.equal(reviewRes.status, 201);

        // Check on verificator dashboard: workflowStatus must be INVESTIGATION, status = needs_investigation
        const detailRes = await request(appInstance).get(`/api/verificator/claims/${seedId}`);
        assert.equal(detailRes.status, 200);
        assert.equal(detailRes.body.workflowStatus, 'INVESTIGATION');
        assert.equal(detailRes.body.status, 'needs_investigation');

        // Verify across backend restart
        const restartedApp = createApp({ dataDir: isolatedEnv.tempDir });
        const afterRestart = await request(restartedApp).get(`/api/verificator/claims/${seedId}`);
        assert.equal(afterRestart.body.workflowStatus, 'INVESTIGATION');
        assert.equal(afterRestart.body.status, 'needs_investigation');
      } finally {
        isolatedEnv.cleanup();
      }
    });

    it('F7 & F8: Clean-state in automated tests remains strictly isolated', async () => {
      // Standard isolated test with cleanState: true
      const isolatedEnv = createIsolatedTestApp({ cleanState: true });
      try {
        const verifierRes = await request(isolatedEnv.app).get('/api/verificator/claims');
        assert.equal(verifierRes.status, 200);
        assert.deepEqual(verifierRes.body, [], 'In strict test clean-state, queue must be empty before upload');
      } finally {
        isolatedEnv.cleanup();
      }
    });
  });

  describe('5. Anomaly Network Graph Seed Integration', () => {
    it('Graph endpoint includes all 20 Markdown seed claims in normal mode', async () => {
      const isolatedEnv = createIsolatedTestApp();
      try {
        // Clear transaction claims and batches so only 20 seed claims exist
        fs.writeFileSync(path.join(isolatedEnv.tempDir, 'claims.json'), '[]', 'utf8');
        fs.writeFileSync(path.join(isolatedEnv.tempDir, 'submission-batches.json'), '[]', 'utf8');

        const appInstance = createApp({ dataDir: isolatedEnv.tempDir });
        const res = await request(appInstance).get('/api/verificator/anomaly-network');
        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.body.nodes));
        assert.ok(Array.isArray(res.body.edges));
        assert.ok(Array.isArray(res.body.clusters));
        assert.ok(Array.isArray(res.body.facilities));

        const claimNodes = res.body.nodes.filter((n) => n.entityType === 'claim');
        assert.equal(claimNodes.length, 20, 'Graph must include exactly 20 seed claim nodes');

        // Check ID ranges
        const seedIds = claimNodes.map((n) => n.id);
        assert.ok(seedIds.includes('66a1f8b1c200000000001001'));
        assert.ok(seedIds.includes('66a1f8b1c200000000001020'));

        // All edges must point to existing nodes
        const nodeIds = new Set(res.body.nodes.map((n) => n.id));
        for (const edge of res.body.edges) {
          assert.ok(nodeIds.has(edge.source), `Edge ${edge.id} source ${edge.source} must exist`);
          assert.ok(nodeIds.has(edge.target), `Edge ${edge.id} target ${edge.target} must exist`);
        }
      } finally {
        isolatedEnv.cleanup();
      }
    });

    it('Filtering by riskLevel, period, and facility works for seed data in graph', async () => {
      const isolatedEnv = createIsolatedTestApp();
      try {
        fs.writeFileSync(path.join(isolatedEnv.tempDir, 'claims.json'), '[]', 'utf8');
        fs.writeFileSync(path.join(isolatedEnv.tempDir, 'submission-batches.json'), '[]', 'utf8');

        const appInstance = createApp({ dataDir: isolatedEnv.tempDir });

        // Filter by high risk
        const resHigh = await request(appInstance).get('/api/verificator/anomaly-network?riskLevel=high');
        assert.equal(resHigh.status, 200);
        const highClaims = resHigh.body.nodes.filter((n) => n.entityType === 'claim');
        assert.ok(highClaims.length > 0, 'Should find high risk claims');
        for (const c of highClaims) {
          assert.equal(c.riskLevel, 'high');
        }

        // Filter by period
        const resPeriod = await request(appInstance).get('/api/verificator/anomaly-network?period=2026-10');
        assert.equal(resPeriod.status, 200);
        const periodClaims = resPeriod.body.nodes.filter((n) => n.entityType === 'claim');
        assert.ok(periodClaims.length > 0);
      } finally {
        isolatedEnv.cleanup();
      }
    });

    it('Seed claim node detail and relationship endpoints return valid data', async () => {
      const isolatedEnv = createIsolatedTestApp();
      try {
        fs.writeFileSync(path.join(isolatedEnv.tempDir, 'claims.json'), '[]', 'utf8');
        fs.writeFileSync(path.join(isolatedEnv.tempDir, 'submission-batches.json'), '[]', 'utf8');

        const appInstance = createApp({ dataDir: isolatedEnv.tempDir });
        const seedId = '66a1f8b1c200000000001001';

        // GET /api/verificator/anomaly-network/claims/:id
        const claimNodeRes = await request(appInstance).get(`/api/verificator/anomaly-network/claims/${seedId}`);
        assert.equal(claimNodeRes.status, 200);
        assert.equal(claimNodeRes.body.id, seedId);
        assert.equal(claimNodeRes.body.entityType, 'claim');

        // GET /api/verificator/anomaly-network/claims/:id/relationships
        const relRes = await request(appInstance).get(`/api/verificator/anomaly-network/claims/${seedId}/relationships`);
        assert.equal(relRes.status, 200);
        assert.ok(Array.isArray(relRes.body));
        assert.ok(relRes.body.length > 0, 'Must have incident edges');
        for (const edge of relRes.body) {
          assert.ok(edge.source === seedId || edge.target === seedId);
        }
      } finally {
        isolatedEnv.cleanup();
      }
    });

    it('Clean-state produces 0 claim nodes in graph before any upload', async () => {
      const isolatedEnv = createIsolatedTestApp({ cleanState: true });
      try {
        const res = await request(isolatedEnv.app).get('/api/verificator/anomaly-network');
        assert.equal(res.status, 200);
        const claimNodes = res.body.nodes.filter((n) => n.entityType === 'claim');
        assert.equal(claimNodes.length, 0, 'Clean state must yield 0 claim nodes in anomaly network');
      } finally {
        isolatedEnv.cleanup();
      }
    });
  });
});
