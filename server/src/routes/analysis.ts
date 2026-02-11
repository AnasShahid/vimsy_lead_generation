import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createJob, getJobById, listJobs, deleteJob } from '../db/queries/jobs';
import { getSiteById, batchUpdateSites, listSites } from '../db/queries/sites';
import { getAnalysisBySiteId, getAnalysesByJobId } from '../db/queries/analyses';
import { getTagsForSites } from '../db/queries/tags';
import { cancelAnalysisJob } from '../workers/analysis-worker';

const router = Router();

// POST /api/analysis/jobs — create analysis job
router.post('/jobs', (req, res) => {
  try {
    const { siteIds } = req.body;

    if (!siteIds || !Array.isArray(siteIds) || siteIds.length === 0) {
      return res.status(400).json({ success: false, error: 'siteIds array is required and must not be empty' });
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

    // Update sites to analysis stage with pending status
    batchUpdateSites(validSiteIds, {
      pipeline_stage: 'analysis',
      analysis_status: 'pending',
    });

    // Create analysis job
    const jobId = uuidv4();
    const job = createJob({
      id: jobId,
      type: 'analysis',
      status: 'pending',
      provider: null,
      config: {
        siteIds: validSiteIds,
      },
      progress: 0,
      total_items: validSiteIds.length,
      processed_items: 0,
      error: null,
    });

    res.json({ success: true, data: { jobId: job.id, sitesCount: validSiteIds.length } });
  } catch (err: any) {
    console.error('[Analysis] Error creating job:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analysis/jobs — list analysis jobs
router.get('/jobs', (_req, res) => {
  try {
    const jobs = listJobs({ type: 'analysis' });
    res.json({ success: true, data: jobs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analysis/jobs/:id — get job status
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

// DELETE /api/analysis/jobs/:id — cancel job
router.delete('/jobs/:id', (req, res) => {
  try {
    const job = getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    if (job.status === 'running' || job.status === 'pending') {
      cancelAnalysisJob(req.params.id);
    }

    deleteJob(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analysis/sites — list sites in analysis stage
router.get('/sites', (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const search = req.query.search as string | undefined;
    const analysisStatus = req.query.analysis_status as string | undefined;
    const priorityClassification = req.query.priority_classification as string | undefined;

    const result = listSites({
      pipeline_stage: 'analysis',
      page,
      pageSize,
      search,
      sortBy: req.query.sortBy as string || 'updated_at',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    });

    // Filter by analysis_status if provided
    let sites = result.sites;
    if (analysisStatus) {
      sites = sites.filter(s => s.analysis_status === analysisStatus);
    }

    // Get analysis data and tags for all sites
    const siteIds = sites.map(s => s.id);
    const tags = getTagsForSites(siteIds);

    const enrichedSites = sites.map(site => {
      const analysis = getAnalysisBySiteId(site.id);
      return {
        ...site,
        analysis: analysis ? {
          health_score: analysis.health_score,
          priority_classification: analysis.priority_classification,
          security_score: analysis.security_score,
          performance_score: analysis.performance_score,
          wp_health_score: analysis.wp_health_score,
          seo_score: analysis.seo_score,
          availability_score: analysis.availability_score,
          analyzed_at: analysis.analyzed_at,
        } : null,
        tags: tags[site.id] || [],
      };
    });

    // Filter by priority_classification if provided
    let finalSites = enrichedSites;
    if (priorityClassification) {
      finalSites = enrichedSites.filter(s => s.analysis?.priority_classification === priorityClassification);
    }

    res.json({
      success: true,
      data: finalSites,
      total: result.total,
      page,
      pageSize,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analysis/sites/:id — get full analysis detail for a site
router.get('/sites/:id', (req, res) => {
  try {
    const siteId = parseInt(req.params.id);
    if (isNaN(siteId)) {
      return res.status(400).json({ success: false, error: 'Invalid site ID' });
    }

    const site = getSiteById(siteId);
    if (!site) {
      return res.status(404).json({ success: false, error: 'Site not found' });
    }

    const analysis = getAnalysisBySiteId(siteId);
    const tags = getTagsForSites([siteId]);

    res.json({
      success: true,
      data: {
        site,
        analysis,
        tags: tags[siteId] || [],
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/analysis/move — move sites to analysis stage
router.post('/move', (req, res) => {
  try {
    const { siteIds } = req.body;

    if (!siteIds || !Array.isArray(siteIds) || siteIds.length === 0) {
      return res.status(400).json({ success: false, error: 'siteIds array is required' });
    }

    const updated = batchUpdateSites(siteIds, {
      pipeline_stage: 'analysis',
      analysis_status: 'pending',
    });

    res.json({ success: true, data: { updated } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/analysis/reanalyze — re-run analysis on sites
router.post('/reanalyze', (req, res) => {
  try {
    const { siteIds } = req.body;

    if (!siteIds || !Array.isArray(siteIds) || siteIds.length === 0) {
      return res.status(400).json({ success: false, error: 'siteIds array is required' });
    }

    // Validate sites exist
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

    // Reset analysis status
    batchUpdateSites(validSiteIds, {
      analysis_status: 'pending',
    });

    // Create new analysis job
    const jobId = uuidv4();
    const job = createJob({
      id: jobId,
      type: 'analysis',
      status: 'pending',
      provider: null,
      config: {
        siteIds: validSiteIds,
      },
      progress: 0,
      total_items: validSiteIds.length,
      processed_items: 0,
      error: null,
    });

    res.json({ success: true, data: { jobId: job.id, sitesCount: validSiteIds.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export const analysisRoutes = router;
