import type { Job, AnalysisJobConfig } from '@vimsy/shared';
import { getNextPendingJob, updateJobStatus, updateJobProgress } from '../db/queries/jobs';
import { batchUpdateSites } from '../db/queries/sites';
import { createAnalysis, updateAnalysis } from '../db/queries/analyses';
import { addTag } from '../db/queries/tags';
import { analyzeSite } from '../services/analysis';

const POLL_INTERVAL_MS = 2000;
const MAX_CONCURRENT = 5;

let pollTimer: NodeJS.Timeout | null = null;
const runningJobs = new Map<string, AbortController>();

export function startAnalysisWorker(): void {
  pollTimer = setInterval(processNextJob, POLL_INTERVAL_MS);
}

export function stopAnalysisWorker(): void {
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

export function cancelAnalysisJob(jobId: string): boolean {
  const controller = runningJobs.get(jobId);
  if (controller) {
    controller.abort();
    runningJobs.delete(jobId);
    return true;
  }
  return false;
}

async function processNextJob(): Promise<void> {
  if (runningJobs.size > 0) return;

  const job = getNextPendingJob('analysis');
  if (!job) return;

  const controller = new AbortController();
  runningJobs.set(job.id, controller);

  try {
    await runAnalysisJob(job, controller.signal);
  } catch (err: any) {
    if (controller.signal.aborted) {
      updateJobStatus(job.id, 'cancelled');
    } else {
      updateJobStatus(job.id, 'failed', err.message);
      console.error(`[Analysis Worker] Job ${job.id} failed: ${err.message}`);
    }
  } finally {
    runningJobs.delete(job.id);
  }
}

async function runAnalysisJob(job: Job, signal: AbortSignal): Promise<void> {
  const config = job.config as unknown as AnalysisJobConfig;
  if (!config || !config.siteIds || config.siteIds.length === 0) {
    updateJobStatus(job.id, 'failed', 'No sites specified for analysis');
    return;
  }

  updateJobStatus(job.id, 'running');

  const { siteIds } = config;
  const totalSites = siteIds.length;

  // Mark all sites as analyzing
  batchUpdateSites(siteIds, { analysis_status: 'analyzing', pipeline_stage: 'analysis' });

  let completedCount = 0;
  let errorCount = 0;

  // Process in batches of MAX_CONCURRENT
  for (let batchStart = 0; batchStart < siteIds.length; batchStart += MAX_CONCURRENT) {
    if (signal.aborted) return;

    const batch = siteIds.slice(batchStart, batchStart + MAX_CONCURRENT);

    const results = await Promise.allSettled(
      batch.map(siteId => analyzeSingleSite(siteId, job.id, signal))
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const siteId = batch[i];

      if (result.status === 'fulfilled') {
        if (result.value.success) {
          completedCount++;
          batchUpdateSites([siteId], { analysis_status: 'analyzed' });
          addTag(siteId, 'analyzed');
        } else {
          errorCount++;
          batchUpdateSites([siteId], { analysis_status: 'error' });
          console.error(`[Analysis Worker] Site ${siteId}: ${result.value.error}`);
        }
      } else {
        errorCount++;
        batchUpdateSites([siteId], { analysis_status: 'error' });
        console.error(`[Analysis Worker] Site ${siteId} threw: ${result.reason?.message || result.reason}`);
      }
    }

    updateJobProgress(job.id, batchStart + batch.length, totalSites);
  }

  if (errorCount === totalSites) {
    updateJobStatus(job.id, 'failed', `All ${totalSites} sites failed analysis`);
  } else {
    updateJobStatus(job.id, 'completed');
  }

  console.log(`[Analysis Worker] Job ${job.id}: Completed. ${completedCount} analyzed, ${errorCount} errors out of ${totalSites} sites.`);
}

async function analyzeSingleSite(
  siteId: number,
  jobId: string,
  signal: AbortSignal
): Promise<{ success: boolean; error?: string }> {
  if (signal.aborted) return { success: false, error: 'Cancelled' };

  // Create analysis record
  const analysis = createAnalysis(siteId, jobId);

  try {
    const result = await analyzeSite(siteId, analysis.id);

    if (!result.success) {
      updateAnalysis(analysis.id, { status: 'error' });
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (err: any) {
    updateAnalysis(analysis.id, { status: 'error' });
    return { success: false, error: err.message };
  }
}
