require('dotenv').config();
const path = require('path');
const fs = require('fs');
const createApp = require('./app');
const { resetClaimStores } = require('./services/clean-state.service');

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');

// Clean-state is ONLY activated if explicitly requested via environment variable,
// NEVER on normal application startup.
const resetOnStart = process.env.RESET_CLAIMS_ON_START === 'true' || process.env.STRICT_CLEAN_STATE === 'true';
if (resetOnStart) {
  resetClaimStores(dataDir);
} else {
  // If a stale .strict_clean_state marker was left by test runs in the application directory, remove it
  const marker = path.join(dataDir, '.strict_clean_state');
  if (fs.existsSync(marker)) {
    try {
      fs.unlinkSync(marker);
    } catch (_) {}
  }
}

const PORT = process.env.PORT || 5000;
const app = createApp({ dataDir });

const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  Riskora Backend Server Running on Port ${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Data Directory: ${dataDir}`);
  console.log(`  Claim Storage: ${resetOnStart ? 'Explicit reset requested' : 'Preserved across restarts'}`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`  Auth API:     http://localhost:${PORT}/api/auth/login`);
  console.log(`  Verificator:  http://localhost:${PORT}/api/verificator/dashboard`);
  console.log(`  Casemix:      http://localhost:${PORT}/api/casemix/dashboard`);
  console.log(`  Claims API:   http://localhost:${PORT}/api/claims`);
  console.log(`===============================================`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Received SIGINT. Shutting down gracefully...');
  server.close(() => {
    console.log('[Server] Closed out remaining connections.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n[Server] Received SIGTERM. Shutting down gracefully...');
  server.close(() => {
    console.log('[Server] Closed out remaining connections.');
    process.exit(0);
  });
});

module.exports = server;
