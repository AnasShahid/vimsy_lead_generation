import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { CreateDiscoveryJobRequest, DiscoveryProvider } from '@vimsy/shared';
import { createJob, getJobById, listJobs, updateJobStatus } from '../db/queries/jobs';
import { getProvider } from '../services/discovery';
import { cancelJob } from '../workers/discovery-worker';
import { detectWordPress } from '../services/wordpress-detector';

export const discoveryRoutes = Router();

const VALID_PROVIDERS: DiscoveryProvider[] = ['manual', 'builtwith', 'wappalyzer', 'hunter'];

// POST /api/discovery/jobs - Start a new discovery job
discoveryRoutes.post('/jobs', (req: Request, res: Response) => {
  try {
    const { provider, config } = req.body as CreateDiscoveryJobRequest;

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return res.status(400).json({
        success: false,
        error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`,
      });
    }

    const providerInstance = getProvider(provider);
    if (!providerInstance) {
      return res.status(400).json({ success: false, error: `Provider not found: ${provider}` });
    }

    const validation = providerInstance.validate(config);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `Invalid config: ${validation.errors.join(', ')}`,
      });
    }

    const job = createJob({
      id: uuidv4(),
      type: 'discovery',
      status: 'pending',
      provider,
      config: config as unknown as Record<string, unknown>,
      progress: 0,
      total_items: 0,
      processed_items: 0,
      error: null,
    });

    return res.status(201).json({ success: true, data: job });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/discovery/jobs - List discovery jobs
discoveryRoutes.get('/jobs', (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const jobs = listJobs({
      type: 'discovery',
      status: status as any,
    });
    return res.json({ success: true, data: jobs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/discovery/jobs/:id - Get job details
discoveryRoutes.get('/jobs/:id', (req: Request, res: Response) => {
  try {
    const job = getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    return res.json({ success: true, data: job });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/discovery/jobs/:id - Cancel a job
discoveryRoutes.delete('/jobs/:id', (req: Request, res: Response) => {
  try {
    const job = getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    if (job.status === 'running') {
      cancelJob(job.id);
    }

    updateJobStatus(job.id, 'cancelled');
    return res.json({ success: true, data: { id: job.id, status: 'cancelled' } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sites/detect - One-off WordPress detection
discoveryRoutes.post('/detect', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    const result = await detectWordPress(url);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
