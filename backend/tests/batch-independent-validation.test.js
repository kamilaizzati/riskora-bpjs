const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { createIsolatedTestApp } = require('./helpers/test-env');

describe('Batch Independent Validation & Partial Processing Verification', () => {
  let app;
  let cleanup;
  let tempDir;
  let demoTxtContent;
  let batchId;

  before(() => {
    const env = createIsolatedTestApp({ cleanState: true });
    app = env.app;
    cleanup = env.cleanup;
    tempDir = env.tempDir;
    // This scenario starts with three missing corrections. Uploaded documents
    // from a developer's demo session must not change that initial state.
    fs.writeFileSync(path.join(tempDir, 'claim-documents.json'), '[]\n', 'utf8');

    const demoTxtPath = path.resolve(__dirname, '../../demo_batch_sardjito_oktober_2026.txt');
    demoTxtContent = fs.readFileSync(demoTxtPath, 'utf8');
  });

  after(() => {
    if (cleanup) cleanup();
  });

  describe('Skenario A — Batch Campuran (17 Valid, 3 Bermasalah)', () => {
    it('1. Upload 20 klaim dalam satu batch dan jalankan screening', async () => {
      const uploadRes = await request(app)
        .post('/api/batches/upload')
        .send({
          content: demoTxtContent,
          period: '2026-10',
          batchName: 'Batch Sardjito Campuran 2026-10'
        });

      assert.equal(uploadRes.status, 201);
      batchId = uploadRes.body.data.id;
      assert.equal(uploadRes.body.data.claims.length, 20);

      // Run pre-screening
      const screenRes = await request(app)
        .post(`/api/batches/${batchId}/screening`)
        .send({});

      assert.equal(screenRes.status, 200);
      const claims = screenRes.body.data.claims;
      const valid = claims.filter((c) => c.screeningStatus === 'passed');
      const invalid = claims.filter((c) => c.screeningStatus === 'needs_correction');

      assert.equal(claims.length, 20);
      assert.equal(valid.length, 17, 'Harus ada 17 klaim valid lolos screening awal');
      assert.equal(invalid.length, 3, 'Harus ada 3 klaim bermasalah membutuhkan koreksi');

      // Verify individual claim status separation
      for (const c of valid) {
        assert.equal(c.workflowStatus, 'VALIDATED');
        assert.equal(c.isForwarded, false);
      }
      for (const c of invalid) {
        assert.equal(c.workflowStatus, 'NEEDS_CORRECTION');
        assert.ok(c.screeningFindings && c.screeningFindings.length > 0);
      }
    });

    it('2. Lanjutkan batch: 17 klaim valid langsung difinalisasi tanpa menunggu 3 klaim lainnya', async () => {
      // Finalize batch without waiting for the 3 problematic claims
      const finalizeRes = await request(app)
        .post(`/api/batches/${batchId}/finalize`)
        .send({});

      assert.equal(finalizeRes.status, 200);
      const batch = finalizeRes.body.data;
      assert.equal(batch.screeningStatus, 'ready_to_handoff');
      assert.equal(batch.handoffStatus, 'ready');
      assert.equal(batch.status, 'PARTIALLY_FINALIZED');
      assert.equal(batch.finalizedClaimsCount, 17);
      assert.equal(batch.pendingClaimsCount, 3);

      // Verify that ONLY 17 claims are activated in claims storage
      const activeClaimsRes = await request(app).get('/api/claims?limit=50');
      assert.equal(activeClaimsRes.status, 200);
      assert.equal(activeClaimsRes.body.data.length, 17, 'Hanya 17 klaim valid yang aktif di claims storage');

      // Verify none of the 3 problematic claims are in claims storage
      const activeIds = new Set(activeClaimsRes.body.data.map((c) => c.id));
      for (const pendingId of batch.pendingClaimIds) {
        assert.equal(activeIds.has(pendingId), false, `Klaim bermasalah ${pendingId} tidak boleh aktif`);
      }
    });

    it('3. Diteruskan ke VClaim: 17 klaim valid dapat diteruskan, 3 klaim tetap di antrean koreksi', async () => {
      // Forward valid claims to VClaim
      const handoffRes = await request(app)
        .post(`/api/batches/${batchId}/handoff`)
        .send({});

      assert.equal(handoffRes.status, 200);
      const batch = handoffRes.body.data;
      assert.equal(batch.screeningStatus, 'handed_off');
      assert.equal(batch.handoffStatus, 'partially_forwarded');
      assert.equal(batch.forwardedClaimsCount, 17);
      assert.equal(batch.pendingClaimsCount, 3);

      // Pastikan 3 klaim tetap dalam antrean koreksi
      const actionReqRes = await request(app).get('/api/faskes/claims/action-required?period=2026-10');
      assert.equal(actionReqRes.status, 200);
      assert.equal(actionReqRes.body.data.length, 3, 'Tepat 3 klaim harus tetap dalam antrean koreksi');

      // Pastikan 17 klaim valid berstatus forwarded/COMPLETED
      const forwardedClaims = batch.claims.filter((c) => c.isForwarded === true);
      assert.equal(forwardedClaims.length, 17);
      for (const c of forwardedClaims) {
        assert.equal(c.workflowStatus, 'COMPLETED');
        assert.equal(c.claimStatus, 'COMPLETED');
        assert.ok(c.forwardedAt);
      }

      // Pastikan 3 klaim yang belum dikoreksi tidak ikut diforward
      const unforwardedClaims = batch.claims.filter((c) => c.isForwarded === false);
      assert.equal(unforwardedClaims.length, 3);
      for (const c of unforwardedClaims) {
        assert.equal(c.screeningStatus, 'needs_correction');
        assert.equal(c.workflowStatus, 'NEEDS_CORRECTION');
      }
    });
  });

  describe('Skenario B — Koreksi Dilakukan Belakangan', () => {
    it('1. Perbaiki satu klaim dari antrean koreksi dengan data valid dan jalankan validasi ulang', async () => {
      // Ambil antrean koreksi
      const queueRes = await request(app).get('/api/faskes/claims/action-required?period=2026-10');
      assert.equal(queueRes.body.data.length, 3);
      const targetClaim = queueRes.body.data.find((c) => c.id.endsWith('0002') || c.claimId?.endsWith('0002'));
      assert.ok(targetClaim, 'Klaim 0002 harus ada di antrean koreksi');

      // Perbaiki klaim dengan unggah resume medis PDF dan catatan DPJP
      const mockPdfBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF').toString('base64');
      const correctRes = await request(app)
        .post(`/api/faskes/claims/${targetClaim.id}/correction`)
        .send({
          dischargeDate: '2026-10-14',
          correctionNotes: 'Resume medis dan hasil glukosa telah diverifikasi DPJP spesialis penyakit dalam',
          document: {
            fileName: 'resume_medis_0002.pdf',
            documentType: 'discharge_summary',
            contentBase64: mockPdfBytes
          }
        });

      assert.equal(correctRes.status, 200);

      // Jalankan validasi ulang (rescreen)
      const rescreenRes = await request(app)
        .post(`/api/faskes/claims/${targetClaim.id}/rescreen`)
        .send({});

      assert.equal(rescreenRes.status, 200);
      assert.equal(rescreenRes.body.data.claim.screeningStatus, 'passed');
      assert.equal(rescreenRes.body.data.claim.workflowStatus, 'VALIDATED');
      assert.equal(rescreenRes.body.data.claim.correctionStatus, 'completed');
    });

    it('2. Lolos validasi: klaim diteruskan pada siklus/batch berikutnya (rollover), 2 klaim lainnya tetap menunggu koreksi', async () => {
      const targetClaimId = 'CLM-FKS-202610-0002';

      // Rollover klaim yang sudah valid ke batch November (siklus berikutnya)
      const rolloverRes = await request(app)
        .post(`/api/faskes/claims/${targetClaimId}/rollover`)
        .send({
          targetPeriod: '2026-11',
          reason: 'Rollover perbaikan klaim ke siklus November 2026'
        });

      assert.equal(rolloverRes.status, 200);
      assert.equal(rolloverRes.body.data.claim.batchPeriod, '2026-11');
      assert.equal(rolloverRes.body.data.claim.isRolledOver, true);
      assert.ok(rolloverRes.body.data.claim.rolloverHistory.length > 0);

      // Periksa antrean koreksi Oktober: sekarang hanya tersisa 2 klaim bermasalah
      const remainingQueueRes = await request(app).get('/api/faskes/claims/action-required?period=2026-10');
      assert.equal(remainingQueueRes.status, 200);
      assert.equal(remainingQueueRes.body.data.length, 2, 'Dua klaim lainnya tetap menunggu koreksi');
      const remainingIds = remainingQueueRes.body.data.map((c) => c.id);
      assert.equal(remainingIds.includes(targetClaimId), false, 'Klaim yang sudah lolos dan di-rollover keluar dari antrean koreksi');

      // Klaim yang di-rollover dapat diproses di siklus November
      const novBatchRes = await request(app).get('/api/batches/BATCH-DEMO-202611');
      assert.equal(novBatchRes.status, 200);
      assert.equal(novBatchRes.body.data.claims.length, 1);
      assert.equal(novBatchRes.body.data.claims[0].id, targetClaimId);
      assert.equal(novBatchRes.body.data.claims[0].screeningStatus, 'passed');
    });
  });

  describe('Skenario C — Koreksi Gagal', () => {
    it('1. Perbaiki klaim dengan data masih tidak valid: klaim tetap di antrean koreksi dan tidak ikut diproses', async () => {
      const targetClaimId = 'CLM-FKS-202610-0005';

      // Submit koreksi dengan tanggal keluar tidak valid (discharge sebelum admission)
      const invalidCorrectionRes = await request(app)
        .post(`/api/faskes/claims/${targetClaimId}/correction`)
        .send({
          dischargeDate: '2026-09-01', // Admission adalah Oktober 2026 -> tidak valid!
          correctionNotes: 'Catatan koreksi belum lengkap'
        });

      assert.equal(invalidCorrectionRes.status, 200);

      // Validasi ulang
      const rescreenRes = await request(app)
        .post(`/api/faskes/claims/${targetClaimId}/rescreen`)
        .send({});

      assert.equal(rescreenRes.status, 200);
      assert.equal(rescreenRes.body.data.claim.screeningStatus, 'needs_correction');
      assert.equal(rescreenRes.body.data.claim.workflowStatus, 'NEEDS_CORRECTION');
      assert.ok(rescreenRes.body.data.claim.screeningFindings.length > 0);

      // Coba rollover klaim yang gagal: harus ditolak (HTTP 400)
      const failedRolloverRes = await request(app)
        .post(`/api/faskes/claims/${targetClaimId}/rollover`)
        .send({ targetPeriod: '2026-11' });

      assert.equal(failedRolloverRes.status, 400);
      assert.ok(failedRolloverRes.body.error && failedRolloverRes.body.error.message.includes('belum memenuhi aturan validasi'));

      // Klaim tetap berada di antrean koreksi
      const queueRes = await request(app).get('/api/faskes/claims/action-required?period=2026-10');
      const isStillInQueue = queueRes.body.data.some((c) => c.id === targetClaimId);
      assert.equal(isStillInQueue, true, 'Klaim gagal harus tetap berada di antrean koreksi');
    });
  });

  describe('Skenario D — Konsistensi Data & Pencegahan Pemrosesan Ganda', () => {
    it('1. Refresh data dan periksa kembali status batch serta klaim', async () => {
      // Query ulang batch Oktober
      const batchRes = await request(app).get(`/api/batches/${batchId}`);
      assert.equal(batchRes.status, 200);
      const batch = batchRes.body.data;

      // Jumlah klaim tetap 20 secara utuh (tidak ada yang hilang)
      assert.equal(batch.claims.length, 20);

      // 17 klaim tetap berstatus forwarded
      const forwardedClaims = batch.claims.filter((c) => c.isForwarded === true);
      assert.equal(forwardedClaims.length, 17);

      // 1 klaim telah di-rollover
      const rolledOverClaims = batch.claims.filter((c) => c.rolloverStatus === 'rolled_over');
      assert.equal(rolledOverClaims.length, 1);

      // 2 klaim tetap needs_correction
      const needsCorrectionClaims = batch.claims.filter(
        (c) => c.screeningStatus === 'needs_correction' && c.rolloverStatus !== 'rolled_over'
      );
      assert.equal(needsCorrectionClaims.length, 2);

      // Dashboard summary konsisten
      const dashRes = await request(app).get('/api/faskes/dashboard?period=2026-10');
      assert.equal(dashRes.status, 200);
      assert.equal(dashRes.body.data.summary.needsCorrection, 2);
    });

    it('2. Cegah pemrosesan ganda pada klaim yang sudah di-rollover', async () => {
      const targetClaimId = 'CLM-FKS-202610-0002';

      // Coba rollover ulang klaim yang sudah ada di target batch
      const duplicateRolloverRes = await request(app)
        .post(`/api/faskes/claims/${targetClaimId}/rollover`)
        .send({ targetPeriod: '2026-11' });

      assert.equal(duplicateRolloverRes.status, 400);
      assert.ok(
        duplicateRolloverRes.body.error &&
          duplicateRolloverRes.body.error.message.includes('Cegah proses ganda')
      );
    });

    it('3. Audit log mencatat riwayat pemrosesan secara kronologis dan transparan', async () => {
      const auditRes = await request(app).get('/api/batches');
      assert.equal(auditRes.status, 200);

      // Baca langsung audit store di tempDir untuk memverifikasi pencatatan
      const auditLogPath = path.join(tempDir, 'audit-logs.json');
      assert.ok(fs.existsSync(auditLogPath));
      const auditEntries = JSON.parse(fs.readFileSync(auditLogPath, 'utf8'));

      const actions = auditEntries.map((a) => a.action);
      assert.ok(actions.includes('BATCH_SCREENING_EXECUTED'));
      assert.ok(actions.includes('BATCH_PARTIALLY_FINALIZED') || actions.includes('BATCH_FINALIZED'));
      assert.ok(actions.includes('BATCH_PARTIALLY_FORWARDED_VCLAIM') || actions.includes('BATCH_FORWARDED_VCLAIM'));
      assert.ok(actions.includes('CLAIM_ROLLOVER'));
    });
  });
});
