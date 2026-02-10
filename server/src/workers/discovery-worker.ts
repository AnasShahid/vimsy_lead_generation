import { v4 as uuidv4 } from 'uuid';
import type { Job, DiscoveryProvider, ProviderConfig } from '@vimsy/shared';
import { getNextPendingJob, updateJobStatus, updateJobProgress } from '../db/queries/jobs';
import { saveSiteFromDetection } from '../db/queries/sites';
import { getProvider } from '../services/discovery';
import { detectWordPress } from '../services/wordpress-detector';

const POLL_INTERVAL_MS = 2000;
let pollTimer: NodeJS.Timeout | null = null;
const runningJobs = new Map<string, AbortController>();

export function startDiscoveryWorker(): void {
  pollTimer = setInterval(processNextJob, POLL_INTERVAL_MS);
}

export function stopDiscoveryWorker(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  // Cancel all running jobs
  for (const [id, controller] of runningJobs) {
    controller.abort();
    updateJobStatus(id, 'cancelled');
  }
  runningJobs.clear();
}

export function cancelJob(jobId: string): boolean {
  const controller = runningJobs.get(jobId);
  if (controller) {
    controller.abort();
    runningJobs.delete(jobId);
    return true;
  }
  return false;
}

async function processNextJob(): Promise<void> {
  // Only process one job at a time
  if (runningJobs.size > 0) return;

  const job = getNextPendingJob('discovery');
  if (!job) return;

  const controller = new AbortController();
  runningJobs.set(job.id, controller);

  try {
    await runDiscoveryJob(job, controller.signal);
  } catch (err: any) {
    if (controller.signal.aborted) {
      updateJobStatus(job.id, 'cancelled');
    } else {
      updateJobStatus(job.id, 'failed', err.message);
      console.error(`[Worker] Job ${job.id} failed: ${err.message}`);
    }
  } finally {
    runningJobs.delete(job.id);
  }
}

async function runDiscoveryJob(job: Job, signal: AbortSignal): Promise<void> {
  const provider = getProvider(job.provider as DiscoveryProvider);
  if (!provider) {
    updateJobStatus(job.id, 'failed', `Unknown provider: ${job.provider}`);
    return;
  }

  const config = job.config as unknown as ProviderConfig;
  const validation = provider.validate(config);
  if (!validation.valid) {
    updateJobStatus(job.id, 'failed', `Invalid config: ${validation.errors.join(', ')}`);
    return;
  }

  updateJobStatus(job.id, 'running');

  // Phase 1: URL Discovery
  console.log(`[Worker] Job ${job.id}: Starting URL discovery with ${provider.name}`);
  const discoveredUrls = await provider.discover(
    config,
    signal,
    (processed, total) => {
      // During discovery phase, show progress as 0-50%
      const scaledTotal = total * 2;
      updateJobProgress(job.id, processed, scaledTotal);
    }
  );

  if (signal.aborted) return;

  console.log(`[Worker] Job ${job.id}: Found ${discoveredUrls.length} URLs, starting WordPress detection`);

  // Phase 2: WordPress Detection
  const totalUrls = discoveredUrls.length;
  updateJobProgress(job.id, totalUrls, totalUrls * 2); // 50% mark

  const extraMeta = config as any;

  for (let i = 0; i < discoveredUrls.length; i++) {
    if (signal.aborted) return;

    const discovered = discoveredUrls[i];

    try {
      const detection = await detectWordPress(discovered.url);
      const meta = discovered.metadata || {};

      saveSiteFromDetection(
        detection,
        discovered.source,
        job.id,
        {
          country: extraMeta.country,
          industry_guess: extraMeta.industry || extraMeta.industry_guess,
          company_name: meta.company_name as string | undefined,
          emails_available_count: meta.emails_total as number | undefined,
        }
      );
    } catch (err: any) {
      console.error(`[Worker] Error detecting WP for ${discovered.url}: ${err.message}`);
    }

    // Progress: 50-100% during detection phase
    updateJobProgress(job.id, totalUrls + i + 1, totalUrls * 2);
  }

  updateJobStatus(job.id, 'completed');
  console.log(`[Worker] Job ${job.id}: Completed. Processed ${totalUrls} URLs.`);
}
