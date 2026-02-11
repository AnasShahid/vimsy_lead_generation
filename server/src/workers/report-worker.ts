import type { Job, ReportJobConfig } from '@vimsy/shared';
import { getNextPendingJob, updateJobStatus, updateJobProgress } from '../db/queries/jobs';
import { batchUpdateSites } from '../db/queries/sites';
import { createReport } from '../db/queries/reports';
import { generateSiteReport } from '../services/report';

const POLL_INTERVAL_MS = 2000;
/** Number of reports to generate concurrently within a job */
const REPORT_CONCURRENCY = 3;

let pollTimer: NodeJS.Timeout | null = null;
const runningJobs = new Map<string, AbortController>();

export function startReportWorker(): void {
  pollTimer = setInterval(processNextJob, POLL_INTERVAL_MS);
}

export function stopReportWorker(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  for (const [id, controller] of runningJobs) {
    controller.abort();
    updateJobStatus(id, 'cancelled');
  }
  runningJobs.clear();
}

export function cancelReportJob(jobId: string): boolean {
  const controller = runningJobs.get(jobId);
  if (controller) {
    controller.abort();
    runningJobs.delete(jobId);
    return true;
  }
  return false;
}

async function processNextJob(): Promise<void> {
  // Only one report job at a time
  if (runningJobs.size > 0) return;

  const job = getNextPendingJob('report');
  if (!job) return;

  const controller = new AbortController();
  runningJobs.set(job.id, controller);

  try {
    await runReportJob(job, controller.signal);
  } catch (err: any) {
    if (controller.signal.aborted) {
      updateJobStatus(job.id, 'cancelled');
    } else {
      updateJobStatus(job.id, 'failed', err.message);
      console.error(`[Report Worker] Job ${job.id} failed: ${err.message}`);
    }
  } finally {
    runningJobs.delete(job.id);
  }
}

/**
 * Process a single site report. Returns success/failure.
 */
async function processSingleSite(siteId: number, jobId: string): Promise<boolean> {
  const report = createReport(siteId, jobId);
  try {
    const result = await generateSiteReport(siteId, report.id);
    if (!result.success) {
      console.error(`[Report Worker] Site ${siteId}: ${result.error}`);
    }
    return result.success;
  } catch (err: any) {
    console.error(`[Report Worker] Site ${siteId} threw: ${err.message}`);
    return false;
  }
}

async function runReportJob(job: Job, signal: AbortSignal): Promise<void> {
  const config = job.config as unknown as ReportJobConfig;
  if (!config || !config.siteIds || config.siteIds.length === 0) {
    updateJobStatus(job.id, 'failed', 'No sites specified for report generation');
    return;
  }

  updateJobStatus(job.id, 'running');

  const { siteIds } = config;
  const totalSites = siteIds.length;

  // Mark all sites as pending report
  batchUpdateSites(siteIds, { report_status: 'pending' });

  let completedCount = 0;
  let errorCount = 0;
  let processedCount = 0;

  // Process sites in parallel batches
  for (let i = 0; i < siteIds.length; i += REPORT_CONCURRENCY) {
    if (signal.aborted) return;

    const batch = siteIds.slice(i, i + REPORT_CONCURRENCY);

    console.log(`[Report Worker] Job ${job.id}: Processing batch ${Math.floor(i / REPORT_CONCURRENCY) + 1} (${batch.length} sites)`);

    const results = await Promise.allSettled(
      batch.map(siteId => processSingleSite(siteId, job.id))
    );

    for (const result of results) {
      processedCount++;
      if (result.status === 'fulfilled' && result.value) {
        completedCount++;
      } else {
        errorCount++;
      }
    }

    updateJobProgress(job.id, processedCount, totalSites);

    // Check abort after each batch
    if (signal.aborted) return;
  }

  if (errorCount === totalSites) {
    updateJobStatus(job.id, 'failed', `All ${totalSites} sites failed report generation`);
  } else {
    updateJobStatus(job.id, 'completed');
  }

  console.log(`[Report Worker] Job ${job.id}: Completed. ${completedCount} reports generated, ${errorCount} errors out of ${totalSites} sites.`);
}
