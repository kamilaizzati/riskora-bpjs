require('dotenv').config();
const path = require('path');
const createApp = require('./app');
const { resetClaimStores } = require('./services/clean-state.service');

// Strict clean-state behavior: on server start/restart, clear all previous claims and staged batches
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
resetClaimStores(dataDir);

const PORT = process.env.PORT || 5000;
const app = createApp({ dataDir });

const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  Riskora Backend Server Running on Port ${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Clean State: Active (Claims: 0, Batches: 0)`);
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
