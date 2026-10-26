const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const createApp = require('../src/app');
const { createIsolatedTestApp } = require('./helpers/test-env');
const { resetClaimStores } = require('../src/services/clean-state.service');

describe('Strict Clean-State Behavior & Manual TXT Upload', () => {
  it('1. Database berisi seed lama -> backend restart -> daftar claim kosong', async () => {
    // Start with seeded environment
    const env = createIsolatedTestApp();
    try {
      // Confirm seeded claims exist before restart
      const initialClaimsRes = await request(env.app).get('/api/claims');
      assert.equal(initialClaimsRes.status, 200);
      assert.ok(initialClaimsRes.body.data.length > 0, 'Seeded claims exist before restart');

      // Simulate backend restart by invoking clean-state reset on the dataDir
      resetClaimStores(env.tempDir);
      const restartedApp = createApp({ dataDir: env.tempDir });

      // Verificator claims must be strictly empty
      const verifierRes = await request(restartedApp).get('/api/verificator/claims');
      assert.equal(verifierRes.status, 200);
      assert.deepEqual(verifierRes.body, [], 'Verificator claims must be empty on startup');

      // Faskes claims must be strictly empty
      const faskesRes = await request(restartedApp).get('/api/faskes/claims');
      assert.equal(faskesRes.status, 200);
      assert.deepEqual(faskesRes.body.data, [], 'Faskes claims must be empty on startup');

      // Public claims must be empty
      const claimsRes = await request(restartedApp).get('/api/claims');
      assert.equal(claimsRes.status, 200);
      assert.equal(claimsRes.body.data.length, 0, 'Public claims must be empty on startup');
      assert.equal(claimsRes.body.meta.totalRecords, 0);

      // Anomaly network must have 0 claim nodes
      const networkRes = await request(restartedApp).get('/api/verificator/anomaly-network');
      assert.equal(networkRes.status, 200);
      const claimNodes = networkRes.body.nodes.filter((n) => n.entityType === 'claim');
      assert.equal(claimNodes.length, 0, 'Anomaly network must have 0 claim nodes before upload');
    } finally {
      env.cleanup();
    }
  });

  it('2. Upload TXT valid -> claim muncul', async () => {
    // Start with clean state
    const env = createIsolatedTestApp({ cleanState: true });
    try {
      // 1. Initial state: strictly empty
      const checkEmpty = await request(env.app).get('/api/faskes/claims');
      assert.deepEqual(checkEmpty.body.data, []);

      // 2. Perform valid manual TXT upload
      const uploadRes = await request(env.app)
        .post('/api/batches/upload')
        .send({
          period: '2026-10',
          batchName: 'Batch Sardjito Oktober 2026',
          fileName: 'demo_batch_sardjito_oktober_2026.txt',
          useDemoFile: true
        });
      assert.equal(uploadRes.status, 201);
      const batch = uploadRes.body.data;
      assert.ok(batch.id);
      assert.equal(batch.claims.length, 20);

      // Claims appear in Faskes batch claims queue
      const faskesClaimsRes = await request(env.app).get('/api/faskes/claims?period=2026-10');
      assert.equal(faskesClaimsRes.status, 200);
      assert.equal(faskesClaimsRes.body.data.length, 20, 'Faskes claims must appear after upload');

      // 3. Run screening and resolve corrections before finalization
      const screenRes = await request(env.app).post(`/api/batches/${batch.id}/screening`).send({});
      assert.equal(screenRes.status, 200);

      const pending = screenRes.body.data.claims.filter(
        (c) => c.screeningStatus === 'needs_correction' && c.correctionStatus !== 'completed'
      );
      for (const claim of pending) {
        await request(env.app).post(`/api/batches/${batch.id}/claims/${claim.id}/rescreen`).send({});
      }

      // Finalize batch to push into Verificator queue
      const finalizeRes = await request(env.app).post(`/api/batches/${batch.id}/finalize`).send({});
      assert.equal(finalizeRes.status, 200);

      // Verificator queue now reflects the 20 uploaded claims
      const verifierRes = await request(env.app).get('/api/verificator/claims');
      assert.equal(verifierRes.status, 200);
      assert.equal(verifierRes.body.length, 20, 'Verificator claims must reflect finalized upload');

      // Anomaly network now has 20 Claim Nodes
      const networkRes = await request(env.app).get('/api/verificator/anomaly-network');
      assert.equal(networkRes.status, 200);
      const claimNodes = networkRes.body.nodes.filter((n) => n.entityType === 'claim');
      assert.equal(claimNodes.length, 20, 'Anomaly network must contain 20 claim nodes from upload');
    } finally {
      env.cleanup();
    }
  });

  it('3. Backend restart kembali -> claim hasil upload sebelumnya hilang', async () => {
    const env = createIsolatedTestApp({ cleanState: true });
    try {
      // Upload batch
      const uploadRes = await request(env.app)
        .post('/api/batches/upload')
        .send({
          period: '2026-10',
          batchName: 'Batch Test Oktober',
          fileName: 'demo_batch_sardjito_oktober_2026.txt',
          useDemoFile: true
        });
      assert.equal(uploadRes.status, 201);
      const batch = uploadRes.body.data;
      const screenRes = await request(env.app).post(`/api/batches/${batch.id}/screening`).send({});
      const pending = screenRes.body.data.claims.filter(
        (c) => c.screeningStatus === 'needs_correction' && c.correctionStatus !== 'completed'
      );
      for (const claim of pending) {
        await request(env.app).post(`/api/batches/${batch.id}/claims/${claim.id}/rescreen`).send({});
      }
      await request(env.app).post(`/api/batches/${batch.id}/finalize`).send({});

      // Confirm claims are present
      const preRestartClaims = await request(env.app).get('/api/verificator/claims');
      assert.equal(preRestartClaims.body.length, 20);

      // Simulate backend restart by invoking clean-state startup hook
      resetClaimStores(env.tempDir);
      const restartedApp = createApp({ dataDir: env.tempDir });

      // After restart, claims must be completely gone
      const postRestartFaskes = await request(restartedApp).get('/api/faskes/claims');
      assert.deepEqual(postRestartFaskes.body.data, [], 'Faskes claims must be 0 after restart');

      const postRestartVerifier = await request(restartedApp).get('/api/verificator/claims');
      assert.deepEqual(postRestartVerifier.body, [], 'Verificator claims must be 0 after restart');

      const postRestartBatches = await request(restartedApp).get('/api/batches');
      assert.deepEqual(postRestartBatches.body.data, [], 'Batches must be 0 after restart');
    } finally {
      env.cleanup();
    }
  });

  it('4. Belum upload TXT -> tidak ada claim dummy dari API maupun frontend', async () => {
    const env = createIsolatedTestApp({ cleanState: true });
    try {
      const verifierRes = await request(env.app).get('/api/verificator/claims');
      assert.equal(verifierRes.status, 200);
      assert.equal(verifierRes.body.length, 0);

      const faskesRes = await request(env.app).get('/api/faskes/claims');
      assert.equal(faskesRes.status, 200);
      assert.equal(faskesRes.body.data.length, 0);

      const dashboardSummary = await request(env.app).get('/api/faskes/dashboard/summary?period=2026-10');
      assert.equal(dashboardSummary.status, 200);
      assert.equal(dashboardSummary.body.data.totalSubmitted, 0);
      assert.equal(dashboardSummary.body.data.screeningPassed, 0);
      assert.equal(dashboardSummary.body.data.needsCorrection, 0);
    } finally {
      env.cleanup();
    }
  });

  it('5. Upload gagal -> tidak ada claim palsu yang ditampilkan', async () => {
    const env = createIsolatedTestApp({ cleanState: true });
    try {
      // Upload invalid TXT content
      const invalidRes = await request(env.app)
        .post('/api/batches/upload')
        .send({
          content: 'INVALID_HEADER_DATA_NOT_TXT\nROW_DATA_INVALID',
          period: '2026-10',
          batchName: 'Batch Corrupted'
        });
      assert.equal(invalidRes.status, 400);

      // Verify no claims were created
      const faskesClaims = await request(env.app).get('/api/faskes/claims');
      assert.deepEqual(faskesClaims.body.data, []);

      const verifierClaims = await request(env.app).get('/api/verificator/claims');
      assert.deepEqual(verifierClaims.body, []);
    } finally {
      env.cleanup();
    }
  });

  it('6. Halaman / Endpoint Daftar Claim tidak mengalami rendering error atau duplikasi', async () => {
    const env = createIsolatedTestApp({ cleanState: true });
    try {
      // 1. Upload September batch
      await request(env.app)
        .post('/api/batches/upload')
        .send({
          period: '2026-09',
          batchName: 'Batch September',
          fileName: 'demo_batch_sardjito_september_2026.txt',
          useDemoFile: true
        });

      // 2. Query with search and filters
      const res = await request(env.app).get('/api/faskes/claims?period=2026-09');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 20);

      // Check unique IDs - NO duplicate keys
      const ids = res.body.data.map((c) => c.id);
      assert.equal(new Set(ids).size, ids.length, 'Every claim in list must have a unique ID');

      // Check unique SEPs
      const seps = res.body.data.map((c) => c.sepNumber);
      assert.equal(new Set(seps).size, seps.length, 'Every claim in list must have a unique SEP');
    } finally {
      env.cleanup();
    }
  });

  it('7. Fitur dan data lain yang tidak terkait tetap berfungsi', async () => {
    const env = createIsolatedTestApp({ cleanState: true });
    try {
      // Auth still works
      const authRes = await request(env.app)
        .post('/api/auth/login')
        .send({ email: 'verifikator@riskora.id', password: 'password123' });
      assert.equal(authRes.status, 200);

      // Facilities configuration still intact
      const facRes = await request(env.app).get('/api/facilities');
      assert.equal(facRes.status, 200);
      assert.ok(facRes.body.data.length > 0, 'Facilities are not deleted by clean-state');

      // Health endpoint reports UP and cleanState: true
      const healthRes = await request(env.app).get('/api/health');
      assert.equal(healthRes.status, 200);
      assert.equal(healthRes.body.data.status, 'UP');
      assert.equal(healthRes.body.data.cleanState, true);
    } finally {
      env.cleanup();
    }
  });
});
