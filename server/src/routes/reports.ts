import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createJob, listJobs } from '../db/queries/jobs';
import { listReports, getReportBySiteId } from '../db/queries/reports';
import { getSiteById } from '../db/queries/sites';
import { getAnalysisBySiteId } from '../db/queries/analyses';
import { cancelReportJob } from '../workers/report-worker';

export const reportRoutes = Router();

const DATA_DIR = path.resolve(__dirname, '../../../data');

// POST /api/reports/generate — Trigger report generation for selected sites
reportRoutes.post('/generate', (req: Request, res: Response) => {
  try {
    const { siteIds } = req.body;
    if (!Array.isArray(siteIds) || siteIds.length === 0) {
      return res.status(400).json({ success: false, error: 'siteIds must be a non-empty array' });
    }

    // Validate all sites exist and have completed analysis
    const invalidSites: number[] = [];
    for (const siteId of siteIds) {
      const site = getSiteById(siteId);
      if (!site) {
        invalidSites.push(siteId);
        continue;
      }
      const analysis = getAnalysisBySiteId(siteId);
      if (!analysis || analysis.status !== 'completed') {
        invalidSites.push(siteId);
      }
    }

    if (invalidSites.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Sites missing or without completed analysis: ${invalidSites.join(', ')}`,
      });
    }

    const jobId = uuidv4();
    createJob({
      id: jobId,
      type: 'report',
      status: 'pending',
      provider: null,
      config: { siteIds },
      progress: 0,
      total_items: siteIds.length,
      processed_items: 0,
      error: null,
    });

    return res.json({
      success: true,
      data: { jobId, sitesCount: siteIds.length },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reports — List all reports with site info
reportRoutes.get('/', (req: Request, res: Response) => {
  try {
    const { status, page, pageSize, sortBy, sortOrder } = req.query;
    const result = listReports({
      status: status as string | undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    });

    return res.json({
      success: true,
      data: {
        reports: result.reports,
        total: result.total,
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 50,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reports/jobs — List report jobs
reportRoutes.get('/jobs', (_req: Request, res: Response) => {
  try {
    const jobs = listJobs({ type: 'report' });
    return res.json({ success: true, data: jobs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/reports/jobs/:jobId — Cancel a report job
reportRoutes.delete('/jobs/:jobId', (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const cancelled = cancelReportJob(jobId);
    if (cancelled) {
      return res.json({ success: true, data: { cancelled: true } });
    }
    return res.status(404).json({ success: false, error: 'Job not found or not running' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reports/:siteId — Get latest report for a site
reportRoutes.get('/:siteId', (req: Request, res: Response) => {
  try {
    const siteId = Number(req.params.siteId);
    if (isNaN(siteId)) {
      return res.status(400).json({ success: false, error: 'Invalid siteId' });
    }

    const report = getReportBySiteId(siteId);
    if (!report) {
      return res.status(404).json({ success: false, error: 'No report found for this site' });
    }

    return res.json({ success: true, data: report });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reports/:siteId/pdf — Serve PDF inline for viewing
reportRoutes.get('/:siteId/pdf', (req: Request, res: Response) => {
  try {
    const siteId = Number(req.params.siteId);
    if (isNaN(siteId)) {
      return res.status(400).json({ success: false, error: 'Invalid siteId' });
    }

    const report = getReportBySiteId(siteId);
    if (!report || report.status !== 'completed' || !report.pdf_path) {
      return res.status(404).json({ success: false, error: 'No completed report with PDF found' });
    }

    const fullPath = path.resolve(DATA_DIR, report.pdf_path);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, error: 'PDF file not found on disk' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${report.pdf_filename}"`);
    return res.sendFile(fullPath);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reports/:siteId/download — Download PDF as attachment
reportRoutes.get('/:siteId/download', (req: Request, res: Response) => {
  try {
    const siteId = Number(req.params.siteId);
    if (isNaN(siteId)) {
      return res.status(400).json({ success: false, error: 'Invalid siteId' });
    }

    const report = getReportBySiteId(siteId);
    if (!report || report.status !== 'completed' || !report.pdf_path) {
      return res.status(404).json({ success: false, error: 'No completed report with PDF found' });
    }

    const fullPath = path.resolve(DATA_DIR, report.pdf_path);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, error: 'PDF file not found on disk' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.pdf_filename}"`);
    return res.sendFile(fullPath);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reports/:siteId/regenerate — Regenerate report for a single site
reportRoutes.post('/:siteId/regenerate', (req: Request, res: Response) => {
  try {
    const siteId = Number(req.params.siteId);
    if (isNaN(siteId)) {
      return res.status(400).json({ success: false, error: 'Invalid siteId' });
    }

    const site = getSiteById(siteId);
    if (!site) {
      return res.status(404).json({ success: false, error: 'Site not found' });
    }

    const analysis = getAnalysisBySiteId(siteId);
    if (!analysis || analysis.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Site has no completed analysis' });
    }

    const jobId = uuidv4();
    createJob({
      id: jobId,
      type: 'report',
      status: 'pending',
      provider: null,
      config: { siteIds: [siteId] },
      progress: 0,
      total_items: 1,
      processed_items: 0,
      error: null,
    });

    return res.json({ success: true, data: { jobId } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
