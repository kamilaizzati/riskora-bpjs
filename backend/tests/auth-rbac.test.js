const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const createApp = require('../src/app');
const { getDemoUsers, findDemoUser } = require('../src/config/demo-users');

describe('Authentication & Role-Based Access Control (RBAC)', () => {
  let app;

  before(() => {
    app = createApp();
  });

  // 1. Login Verifikator berhasil
  it('1. Login using Verifikator credentials succeeds and returns user info with role VERIFICATOR', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'verifikator@riskora.id',
        password: 'password123'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.email, 'verifikator@riskora.id');
    assert.equal(res.body.data.role, 'VERIFICATOR');
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.password, undefined, 'Password must never be returned');

    // Verify session cookie was set
    const setCookie = res.headers['set-cookie'];
    assert.ok(setCookie && setCookie.length > 0, 'Set-Cookie header should be present');
    assert.ok(setCookie[0].includes('riskora.sid'), 'Cookie name should be riskora.sid');
  });

  // 2. Login Casemix berhasil
  it('2. Login using Admin Casemix credentials succeeds and returns user info with role CASEMIX_ADMIN', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'casemix@sardjito.co.id',
        password: 'password123'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.email, 'casemix@sardjito.co.id');
    assert.equal(res.body.data.role, 'CASEMIX_ADMIN');
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.password, undefined);
  });

  // 3. Password salah ditolak
  it('3. Wrong password or invalid email is rejected with HTTP 401', async () => {
    // Wrong password
    const resWrongPass = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'verifikator@riskora.id',
        password: 'wrong_password_xyz'
      });

    assert.equal(resWrongPass.status, 401);
    assert.equal(resWrongPass.body.success, false);
    assert.equal(resWrongPass.body.error.code, 'UNAUTHORIZED');

    // Unknown email
    const resUnknown = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'unknown@example.com',
        password: 'password123'
      });

    assert.equal(resUnknown.status, 401);
    assert.equal(resUnknown.body.success, false);

    // Empty payload
    const resEmpty = await request(app)
      .post('/api/auth/login')
      .send({});

    assert.equal(resEmpty.status, 401);
    assert.equal(resEmpty.body.success, false);
  });

  // 4. /api/auth/me mengembalikan identitas pengguna setelah login
  it('4. GET /api/auth/me returns current user identity when session cookie is present', async () => {
    const agent = request.agent(app);

    // Step 1: Login
    const loginRes = await agent
      .post('/api/auth/login')
      .send({
        email: 'verifikator@riskora.id',
        password: 'password123'
      });
    assert.equal(loginRes.status, 200);

    // Step 2: Query /me using the authenticated agent session
    const meRes = await agent.get('/api/auth/me');
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.success, true);
    assert.equal(meRes.body.data.email, 'verifikator@riskora.id');
    assert.equal(meRes.body.data.role, 'VERIFICATOR');
    assert.equal(meRes.body.data.password, undefined);
  });

  // 5. Endpoint terlindungi menolak request tanpa session
  it('5. Protected endpoints reject requests without a session with HTTP 401', async () => {
    // Check /api/auth/me without session
    const resMe = await request(app).get('/api/auth/me');
    assert.equal(resMe.status, 401);
    assert.equal(resMe.body.success, false);
    assert.equal(resMe.body.error.code, 'UNAUTHORIZED');

    // Check /api/verificator/dashboard without session
    const resVerificator = await request(app).get('/api/verificator/dashboard');
    assert.equal(resVerificator.status, 401);
    assert.equal(resVerificator.body.success, false);
    assert.equal(resVerificator.body.error.code, 'UNAUTHORIZED');

    // Check /api/casemix/dashboard without session
    const resCasemix = await request(app).get('/api/casemix/dashboard');
    assert.equal(resCasemix.status, 401);
    assert.equal(resCasemix.body.success, false);
    assert.equal(resCasemix.body.error.code, 'UNAUTHORIZED');
  });

  // 6. Verifikator tidak dapat mengakses endpoint khusus Admin Casemix
  it('6. Verifikator cannot access Casemix-only endpoint (HTTP 403 Forbidden)', async () => {
    const agent = request.agent(app);

    await agent
      .post('/api/auth/login')
      .send({
        email: 'verifikator@riskora.id',
        password: 'password123'
      });

    // Allowed: Verifikator dashboard
    const allowRes = await agent.get('/api/verificator/dashboard');
    assert.equal(allowRes.status, 200);
    assert.equal(allowRes.body.success, true);
    assert.equal(allowRes.body.data.role, 'VERIFICATOR');

    // Forbidden: Casemix dashboard
    const forbiddenRes = await agent.get('/api/casemix/dashboard');
    assert.equal(forbiddenRes.status, 403);
    assert.equal(forbiddenRes.body.success, false);
    assert.equal(forbiddenRes.body.error.code, 'FORBIDDEN');
  });

  // 7. Admin Casemix tidak dapat mengakses endpoint khusus Verifikator
  it('7. Admin Casemix cannot access Verifikator-only endpoint (HTTP 403 Forbidden)', async () => {
    const agent = request.agent(app);

    await agent
      .post('/api/auth/login')
      .send({
        email: 'casemix@sardjito.co.id',
        password: 'password123'
      });

    // Allowed: Casemix dashboard
    const allowRes = await agent.get('/api/casemix/dashboard');
    assert.equal(allowRes.status, 200);
    assert.equal(allowRes.body.success, true);
    assert.equal(allowRes.body.data.role, 'CASEMIX_ADMIN');

    // Forbidden: Verifikator dashboard
    const forbiddenRes = await agent.get('/api/verificator/dashboard');
    assert.equal(forbiddenRes.status, 403);
    assert.equal(forbiddenRes.body.success, false);
    assert.equal(forbiddenRes.body.error.code, 'FORBIDDEN');
  });

  // 8. Logout mengakhiri session
  it('8. POST /api/auth/logout ends the session and revokes subsequent access', async () => {
    const agent = request.agent(app);

    // Login
    await agent
      .post('/api/auth/login')
      .send({
        email: 'verifikator@riskora.id',
        password: 'password123'
      });

    // Verify access
    const check1 = await agent.get('/api/auth/me');
    assert.equal(check1.status, 200);

    // Logout
    const logoutRes = await agent.post('/api/auth/logout');
    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.success, true);

    // Subsequent access must now be rejected with 401
    const check2 = await agent.get('/api/auth/me');
    assert.equal(check2.status, 401);

    const check3 = await agent.get('/api/verificator/dashboard');
    assert.equal(check3.status, 401);
  });

  // 9. Session in-memory berfungsi dan tidak bergantung pada database
  it('9. In-memory session operates reliably without external database dependencies', async () => {
    const agent1 = request.agent(app);
    const agent2 = request.agent(app);

    // Session 1: Verifikator
    await agent1
      .post('/api/auth/login')
      .send({ email: 'verifikator@riskora.id', password: 'password123' });

    // Session 2: Casemix Admin
    await agent2
      .post('/api/auth/login')
      .send({ email: 'casemix@sardjito.co.id', password: 'password123' });

    // Independent isolation
    const res1 = await agent1.get('/api/auth/me');
    const res2 = await agent2.get('/api/auth/me');

    assert.equal(res1.body.data.role, 'VERIFICATOR');
    assert.equal(res2.body.data.role, 'CASEMIX_ADMIN');
  });

  // 10. Security: Role tampering attempts are strictly ignored
  it('10. Tampering with request headers, body, or query params cannot elevate role', async () => {
    const agent = request.agent(app);

    // Login as Verifikator
    await agent
      .post('/api/auth/login')
      .send({ email: 'verifikator@riskora.id', password: 'password123' });

    // Attempt to access Casemix route while sending fake role in headers and query
    const resTamper = await agent
      .get('/api/casemix/dashboard?role=CASEMIX_ADMIN')
      .set('X-User-Role', 'CASEMIX_ADMIN')
      .send({ role: 'CASEMIX_ADMIN' });

    assert.equal(resTamper.status, 403);
    assert.equal(resTamper.body.error.code, 'FORBIDDEN');
  });

  // 11. Production environment safety: demo accounts disabled in production
  it('11. Demo accounts are automatically disabled when NODE_ENV is production', () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const usersInProd = getDemoUsers();
      assert.equal(usersInProd.length, 0);

      const found = findDemoUser('verifikator@riskora.id', 'password123');
      assert.equal(found, null);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
