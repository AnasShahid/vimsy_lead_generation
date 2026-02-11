import { Router } from 'express';
import { listLeads, getLeadStats } from '../db/queries/leads';
import { getSiteById } from '../db/queries/sites';
import { getContactsBySiteId } from '../db/queries/contacts';
import { getAnalysisBySiteId } from '../db/queries/analyses';
import { getReportBySiteId } from '../db/queries/reports';
import { getTagsForSites } from '../db/queries/tags';

const router = Router();

// GET /api/leads/stats — aggregate counts for filter tabs
// Must be defined BEFORE /:id to avoid matching "stats" as an id
router.get('/stats', (_req, res) => {
  try {
    const stats = getLeadStats();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/leads — list leads with filters
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;

    const result = listLeads({
      page,
      pageSize,
      search: req.query.search as string | undefined,
      enrichment_status: req.query.enrichment_status as string | undefined,
      analysis_status: req.query.analysis_status as string | undefined,
      report_status: req.query.report_status as string | undefined,
      outreach_status: req.query.outreach_status as string | undefined,
      priority: req.query.priority as string | undefined,
      priority_classification: req.query.priority_classification as string | undefined,
      tag: req.query.tag as string | undefined,
      country: req.query.country as string | undefined,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    });

    res.json({
      success: true,
      data: result.leads,
      total: result.total,
      page,
      pageSize,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/leads/:id — get single lead detail with contacts, analysis, report, tags
router.get('/:id', (req, res) => {
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
    const analysis = getAnalysisBySiteId(siteId);
    const report = getReportBySiteId(siteId);
    const tags = getTagsForSites([siteId]);

    res.json({
      success: true,
      data: {
        site,
        contacts,
        analysis,
        report,
        tags: tags[siteId] || [],
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export const leadsRoutes = router;
