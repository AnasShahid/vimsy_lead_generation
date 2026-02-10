import type { Job, EnrichmentJobConfig, HunterDomainSearchConfig } from '@vimsy/shared';
import { getNextPendingJob, updateJobStatus, updateJobProgress } from '../db/queries/jobs';
import { getSiteById } from '../db/queries/sites';
import { batchUpdateSites } from '../db/queries/sites';
import { runEnrichment } from '../services/enrichment';
import { HunterRateLimitError } from '../services/enrichment/hunter-domain-search';

const POLL_INTERVAL_MS = 2000;
const RATE_LIMIT_RETRY_DELAY_MS = 30000;
const MAX_RATE_LIMIT_RETRIES = 3;

let pollTimer: NodeJS.Timeout | null = null;
const runningJobs = new Map<string, AbortController>();

export function startEnrichmentWorker(): void {
  pollTimer = setInterval(processNextJob, POLL_INTERVAL_MS);
}

export function stopEnrichmentWorker(): void {
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

export function cancelEnrichmentJob(jobId: string): boolean {
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

  const job = getNextPendingJob('enrichment');
  if (!job) return;

  const controller = new AbortController();
  runningJobs.set(job.id, controller);

  try {
    await runEnrichmentJob(job, controller.signal);
  } catch (err: any) {
    if (controller.signal.aborted) {
      updateJobStatus(job.id, 'cancelled');
    } else {
      updateJobStatus(job.id, 'failed', err.message);
      console.error(`[Enrichment Worker] Job ${job.id} failed: ${err.message}`);
    }
  } finally {
    runningJobs.delete(job.id);
  }
}

async function runEnrichmentJob(job: Job, signal: AbortSignal): Promise<void> {
  const config = job.config as unknown as EnrichmentJobConfig;
  if (!config || !config.siteIds || config.siteIds.length === 0) {
    updateJobStatus(job.id, 'failed', 'No sites specified for enrichment');
    return;
  }

  updateJobStatus(job.id, 'running');

  const { siteIds, provider, apiKey, filters } = config;
  const totalSites = siteIds.length;

  // Mark all sites as enriching
  batchUpdateSites(siteIds, { enrichment_status: 'enriching' });

  let completedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < siteIds.length; i++) {
    if (signal.aborted) return;

    const siteId = siteIds[i];
    const site = getSiteById(siteId);
    if (!site) {
      console.error(`[Enrichment Worker] Site ${siteId} not found, skipping`);
      errorCount++;
      updateJobProgress(job.id, i + 1, totalSites);
      continue;
    }

    // Build per-site search config from shared filters
    const searchConfig: HunterDomainSearchConfig = {
      ...filters,
      domain: site.domain,
      company: filters.company || site.company_name || undefined,
    };

    let retries = 0;
    let success = false;

    while (!success && retries <= MAX_RATE_LIMIT_RETRIES) {
      if (signal.aborted) return;

      try {
        const result = await runEnrichment(siteId, provider, searchConfig, apiKey, job.id);

        if (result.error) {
          console.error(`[Enrichment Worker] Site ${siteId} (${site.domain}): ${result.error}`);
          batchUpdateSites([siteId], { enrichment_status: 'error' });
          errorCount++;
        } else {
          console.log(`[Enrichment Worker] Site ${siteId} (${site.domain}): ${result.contactsAdded} contacts found`);
          batchUpdateSites([siteId], {
            enrichment_status: 'enriched',
            pipeline_stage: 'enrichment',
          });
          completedCount++;
        }
        success = true;
      } catch (err: any) {
        if (err instanceof HunterRateLimitError) {
          retries++;
          if (retries <= MAX_RATE_LIMIT_RETRIES) {
            console.warn(`[Enrichment Worker] Rate limited, waiting ${RATE_LIMIT_RETRY_DELAY_MS / 1000}s (retry ${retries}/${MAX_RATE_LIMIT_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_RETRY_DELAY_MS));
          } else {
            console.error(`[Enrichment Worker] Rate limit retries exhausted for site ${siteId}`);
            batchUpdateSites([siteId], { enrichment_status: 'error' });
            errorCount++;
            success = true; // Move on to next site
          }
        } else {
          console.error(`[Enrichment Worker] Error enriching site ${siteId}: ${err.message}`);
          batchUpdateSites([siteId], { enrichment_status: 'error' });
          errorCount++;
          success = true; // Move on to next site
        }
      }
    }

    updateJobProgress(job.id, i + 1, totalSites);
  }

  if (errorCount === totalSites) {
    updateJobStatus(job.id, 'failed', `All ${totalSites} sites failed enrichment`);
  } else {
    updateJobStatus(job.id, 'completed');
  }

  console.log(`[Enrichment Worker] Job ${job.id}: Completed. ${completedCount} enriched, ${errorCount} errors out of ${totalSites} sites.`);
}
