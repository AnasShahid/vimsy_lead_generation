import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { EnrichmentProvider } from '@vimsy/shared';
import { createJob, getJobById, listJobs, deleteJob } from '../db/queries/jobs';
import { getSiteById, batchUpdateSites, listSites } from '../db/queries/sites';
import { getContactsBySiteId, getContactCountsForSites } from '../db/queries/contacts';
import { cancelEnrichmentJob } from '../workers/enrichment-worker';

const router = Router();

// POST /api/enrichment/jobs — create enrichment job
router.post('/jobs', (req, res) => {
  try {
    const { siteIds, provider, apiKey, filters } = req.body;

    if (!siteIds || !Array.isArray(siteIds) || siteIds.length === 0) {
      return res.status(400).json({ success: false, error: 'siteIds array is required and must not be empty' });
    }

    if (!provider || !['hunter', 'snov'].includes(provider)) {
      return res.status(400).json({ success: false, error: 'provider must be "hunter" or "snov"' });
    }

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'apiKey is required' });
    }

    if (provider === 'snov') {
      return res.status(400).json({ success: false, error: 'Snov.io enrichment is not yet implemented' });
    }

    // Validate all sites exist
    const validSiteIds: number[] = [];
    for (const id of siteIds) {
      const site = getSiteById(id);
      if (site) {
        validSiteIds.push(id);
      }
    }

    if (validSiteIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid sites found' });
    }

    // Update sites to enrichment stage with pending status
    batchUpdateSites(validSiteIds, {
      pipeline_stage: 'enrichment',
      enrichment_status: 'pending',
    });

    // Create enrichment job
    const jobId = uuidv4();
    const job = createJob({
      id: jobId,
      type: 'enrichment',
      status: 'pending',
      provider: provider as EnrichmentProvider,
      config: {
        siteIds: validSiteIds,
        provider,
        apiKey,
        filters: filters || {},
      },
      progress: 0,
      total_items: validSiteIds.length,
      processed_items: 0,
      error: null,
    });

    res.json({ success: true, data: { jobId: job.id, sitesCount: validSiteIds.length } });
  } catch (err: any) {
    console.error('[Enrichment] Error creating job:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/enrichment/jobs — list enrichment jobs
router.get('/jobs', (_req, res) => {
  try {
    const jobs = listJobs({ type: 'enrichment' });
    res.json({ success: true, data: jobs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/enrichment/jobs/:id — get job status
router.get('/jobs/:id', (req, res) => {
  try {
    const job = getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    res.json({ success: true, data: job });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/enrichment/jobs/:id — cancel job
router.delete('/jobs/:id', (req, res) => {
  try {
    const job = getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    if (job.status === 'running' || job.status === 'pending') {
      cancelEnrichmentJob(req.params.id);
    }

    deleteJob(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/enrichment/sites — list sites in enrichment stage
router.get('/sites', (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const search = req.query.search as string | undefined;
    const enrichmentStatus = req.query.enrichment_status as string | undefined;

    const result = listSites({
      pipeline_stage: 'enrichment',
      page,
      pageSize,
      search,
      sortBy: req.query.sortBy as string || 'updated_at',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    });

    // Filter by enrichment_status if provided
    let sites = result.sites;
    if (enrichmentStatus) {
      sites = sites.filter(s => s.enrichment_status === enrichmentStatus);
    }

    // Get contact counts for all sites
    const siteIds = sites.map(s => s.id);
    const contactCounts = getContactCountsForSites(siteIds);

    const enrichedSites = sites.map(site => ({
      ...site,
      contact_count: contactCounts[site.id] || 0,
    }));

    res.json({
      success: true,
      data: enrichedSites,
      total: result.total,
      page,
      pageSize,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/enrichment/sites/:id/contacts — get contacts for a site
router.get('/sites/:id/contacts', (req, res) => {
  try {
    const siteId = parseInt(req.params.id);
    if (isNaN(siteId)) {
      return res.status(400).json({ success: false, error: 'Invalid site ID' });
    }

    const site = getSiteById(siteId);
    if (!site) {
      return res.status(404).json({ success: false, error: 'Site not found' });
    }

    const contacts = getContactsBySiteId(siteId);
    res.json({ success: true, data: contacts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/enrichment/move — move sites to enrichment stage
router.post('/move', (req, res) => {
  try {
    const { siteIds } = req.body;

    if (!siteIds || !Array.isArray(siteIds) || siteIds.length === 0) {
      return res.status(400).json({ success: false, error: 'siteIds array is required' });
    }

    const updated = batchUpdateSites(siteIds, {
      pipeline_stage: 'enrichment',
      enrichment_status: 'pending',
    });

    res.json({ success: true, data: { updated } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export const enrichmentRoutes = router;
