import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import { app } from './app';
import { getDb, closeDb } from './db';
import { startDiscoveryWorker, stopDiscoveryWorker } from './workers/discovery-worker';
import { startEnrichmentWorker, stopEnrichmentWorker } from './workers/enrichment-worker';
import { startAnalysisWorker, stopAnalysisWorker } from './workers/analysis-worker';

const PORT = process.env.PORT || 3001;

// Initialize DB
getDb();
console.log('[DB] Database initialized');

// Start background workers
startDiscoveryWorker();
console.log('[Worker] Discovery worker started');

startEnrichmentWorker();
console.log('[Worker] Enrichment worker started');

startAnalysisWorker();
console.log('[Worker] Analysis worker started');

const server = app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});

// Graceful shutdown
function shutdown() {
  console.log('\n[Server] Shutting down...');
  stopDiscoveryWorker();
  stopEnrichmentWorker();
  stopAnalysisWorker();
  closeDb();
  server.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
