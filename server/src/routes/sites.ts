import { Router, Request, Response } from 'express';
import type { SiteFilterParams } from '@vimsy/shared';
import { listSites, getSiteById, deleteSite, getAllSitesForExport, batchDeleteSites, batchUpdateSites } from '../db/queries/sites';
import { analyzeSites, analyzeSingleSite } from '../services/ai-analyzer';

export const sitesRoutes = Router();

// GET /api/sites - List sites with filters
sitesRoutes.get('/', (req: Request, res: Response) => {
  try {
    const filters: SiteFilterParams = {
      page: req.query.page ? Number(req.query.page) : 1,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : 50,
      search: req.query.search as string | undefined,
      is_wordpress: req.query.is_wordpress !== undefined ? req.query.is_wordpress === 'true' : undefined,
      discovery_source: req.query.discovery_source as any,
      status: req.query.status as any,
      pipeline_stage: req.query.pipeline_stage as any,
      job_id: req.query.job_id as string | undefined,
      priority: req.query.priority as any,
      country: req.query.country as string | undefined,
      english_markets_only: req.query.english_markets_only === 'true' ? true : undefined,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };

    const { sites, total } = listSites(filters);

    return res.json({
      success: true,
      data: sites,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sites/batch-delete - Delete multiple sites
sitesRoutes.post('/batch-delete', (req: Request, res: Response) => {
  try {
    const { siteIds } = req.body;
    if (!Array.isArray(siteIds) || siteIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Provide a non-empty siteIds array' });
    }
    const deleted = batchDeleteSites(siteIds);
    return res.json({ success: true, data: { deleted } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sites/batch-update - Update multiple sites
sitesRoutes.post('/batch-update', (req: Request, res: Response) => {
  try {
    const { siteIds, updates } = req.body;
    if (!Array.isArray(siteIds) || siteIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Provide a non-empty siteIds array' });
    }
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'Provide an updates object' });
    }
    const updated = batchUpdateSites(siteIds, updates);
    return res.json({ success: true, data: { updated } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/sites/:id - Get single site
sitesRoutes.get('/:id', (req: Request, res: Response) => {
  try {
    const site = getSiteById(Number(req.params.id));
    if (!site) {
      return res.status(404).json({ success: false, error: 'Site not found' });
    }
    return res.json({ success: true, data: site });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/sites/:id - Delete a site
sitesRoutes.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = deleteSite(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Site not found' });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sites/analyze - Batch AI analysis
sitesRoutes.post('/analyze', async (req: Request, res: Response) => {
  try {
    let siteIds: number[];

    if (req.body.siteIds && Array.isArray(req.body.siteIds)) {
      siteIds = req.body.siteIds;
    } else if (req.body.all) {
      const filters: Partial<SiteFilterParams> = {};
      if (req.body.filters?.is_wordpress !== undefined) {
        filters.is_wordpress = req.body.filters.is_wordpress;
      }
      if (req.body.filters?.priority) {
        filters.priority = req.body.filters.priority;
      }
      const sites = getAllSitesForExport(filters);
      siteIds = sites.map(s => s.id);
    } else {
      return res.status(400).json({ success: false, error: 'Provide siteIds array or { all: true }' });
    }

    if (siteIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No sites to analyze' });
    }

    // For small batches, run inline
    if (siteIds.length <= 10) {
      await analyzeSites(siteIds);
      return res.json({ success: true, data: { analyzed: siteIds.length } });
    }

    // For large batches, run async
    analyzeSites(siteIds).catch(err => {
      console.error('[AI] Background analysis failed:', err.message);
    });

    return res.json({
      success: true,
      data: { queued: siteIds.length, message: 'Analysis running in background' },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sites/:id/analyze - Single site AI analysis
sitesRoutes.post('/:id/analyze', async (req: Request, res: Response) => {
  try {
    const siteId = Number(req.params.id);
    const site = getSiteById(siteId);
    if (!site) {
      return res.status(404).json({ success: false, error: 'Site not found' });
    }

    await analyzeSingleSite(siteId);
    const updated = getSiteById(siteId);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
