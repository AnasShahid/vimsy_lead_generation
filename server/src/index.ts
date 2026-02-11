import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import { app } from './app';
import { getDb, closeDb } from './db';
import { cleanupStaleJobs } from './db/queries/jobs';
import { startDiscoveryWorker, stopDiscoveryWorker } from './workers/discovery-worker';
import { startEnrichmentWorker, stopEnrichmentWorker } from './workers/enrichment-worker';
import { startAnalysisWorker, stopAnalysisWorker } from './workers/analysis-worker';
import { startReportWorker, stopReportWorker } from './workers/report-worker';
import { initBrowser, closeBrowser } from './services/report/pdf-renderer';

const PORT = process.env.PORT || 3001;

// Initialize DB
getDb();
console.log('[DB] Database initialized');

// Clean up any jobs left running/pending from a previous server session
const staleCount = cleanupStaleJobs();
if (staleCount > 0) {
  console.log(`[DB] Cleaned up ${staleCount} stale job(s) from previous session`);
}

// Start background workers
startDiscoveryWorker();
console.log('[Worker] Discovery worker started');

startEnrichmentWorker();
console.log('[Worker] Enrichment worker started');

startAnalysisWorker();
console.log('[Worker] Analysis worker started');

startReportWorker();
console.log('[Worker] Report worker started');

// Initialize Puppeteer browser lazily (on first report render)
// initBrowser() is called automatically by pdf-renderer when needed

const server = app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});

// Graceful shutdown
async function shutdown() {
  console.log('\n[Server] Shutting down...');
  stopDiscoveryWorker();
  stopEnrichmentWorker();
  stopAnalysisWorker();
  stopReportWorker();
  await closeBrowser();
  closeDb();
  server.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
