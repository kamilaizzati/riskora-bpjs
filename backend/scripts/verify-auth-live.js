/**
 * Standalone Verification Script for Authentication and RBAC
 * Can be run via: node backend/scripts/verify-auth-live.js
 */
const request = require('supertest');
const createApp = require('../src/app');

async function runVerification() {
  console.log('--- Memulai Verifikasi Manual Auth & RBAC Riskora ---');
  const app = createApp();

  // Test 1: Login Verifikator
  const vAgent = request.agent(app);
  const vLogin = await vAgent
    .post('/api/auth/login')
    .send({ email: 'verifikator@riskora.id', password: 'password123' });
  console.log('1. Login Verifikator:', vLogin.status === 200 ? 'BERHASIL' : 'GAGAL', vLogin.body);

  // Test 2: Login Admin Casemix
  const cAgent = request.agent(app);
  const cLogin = await cAgent
    .post('/api/auth/login')
    .send({ email: 'casemix@sardjito.co.id', password: 'password123' });
  console.log('2. Login Casemix:', cLogin.status === 200 ? 'BERHASIL' : 'GAGAL', cLogin.body);

  // Test 3: Password salah
  const badLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'verifikator@riskora.id', password: 'wrong' });
  console.log('3. Password Salah Ditolak:', badLogin.status === 401 ? 'BERHASIL (401)' : 'GAGAL', badLogin.body);

  // Test 4: /api/auth/me setelah login
  const vMe = await vAgent.get('/api/auth/me');
  console.log('4. /api/auth/me Verifikator:', vMe.status === 200 ? 'BERHASIL' : 'GAGAL', vMe.body);

  // Test 5: Endpoint terlindungi tanpa session
  const unauthRes = await request(app).get('/api/verificator/dashboard');
  console.log('5. Proteksi Tanpa Session:', unauthRes.status === 401 ? 'BERHASIL (401)' : 'GAGAL', unauthRes.body);

  // Test 6: Verifikator akses Casemix
  const vToCasemix = await vAgent.get('/api/casemix/dashboard');
  console.log('6. Verifikator ke Casemix Ditolak:', vToCasemix.status === 403 ? 'BERHASIL (403)' : 'GAGAL', vToCasemix.body);

  // Test 7: Casemix akses Verifikator
  const cToVerifikator = await cAgent.get('/api/verificator/dashboard');
  console.log('7. Casemix ke Verifikator Ditolak:', cToVerifikator.status === 403 ? 'BERHASIL (403)' : 'GAGAL', cToVerifikator.body);

  // Test 8: Logout
  const vLogout = await vAgent.post('/api/auth/logout');
  const vMeAfter = await vAgent.get('/api/auth/me');
  console.log('8. Logout Berhasil:', vLogout.status === 200 && vMeAfter.status === 401 ? 'BERHASIL' : 'GAGAL');

  console.log('--- Semua Verifikasi Selesai ---');
}

runVerification().catch(console.error);
