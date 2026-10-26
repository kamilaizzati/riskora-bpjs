const express = require('express');
const cors = require('cors');
const path = require('path');

// Middleware
const errorHandler = require('./middleware/error-handler');
const notFoundHandler = require('./middleware/not-found');

// Routes
const healthRoutes = require('./routes/health.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const claimsRoutes = require('./routes/claims.routes');
const facilitiesRoutes = require('./routes/facilities.routes');
const documentsRoutes = require('./routes/documents.routes');
const findingsRoutes = require('./routes/findings.routes');
const reviewsRoutes = require('./routes/reviews.routes');
const batchesRoutes = require('./routes/batches.routes');
const verificationResultsRoutes = require('./routes/verification-results.routes');
const graphRoutes = require('./routes/graph.routes');

function createApp(options = {}) {
  const app = express();

  // Set data directory (supports override for test isolation)
  const dataDir = options.dataDir || process.env.DATA_DIR || path.join(__dirname, 'data');
  app.set('dataDir', dataDir);

  // Security & Body parsing
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, Postman)
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        return callback(null, true); // Permissive for local hackathon demo
      },
      credentials: true
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.text({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mount API Routes
  app.use('/api/health', healthRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/claims', claimsRoutes);
  app.use('/api/facilities', facilitiesRoutes);
  app.use('/api/documents', documentsRoutes);
  app.use('/api/findings', findingsRoutes);
  app.use('/api/reviews', reviewsRoutes);
  app.use('/api/batches', batchesRoutes);
  app.use('/api/verification-results', verificationResultsRoutes);
  app.use('/api/graph', graphRoutes);

  // Fallback 404 & Centralized Error Handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
