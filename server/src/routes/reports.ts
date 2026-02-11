import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createJob, listActiveAndRecentJobs } from '../db/queries/jobs';
import { listReports, getReportBySiteId, updateReport } from '../db/queries/reports';
import { getSiteById } from '../db/queries/sites';
import { getAnalysisBySiteId } from '../db/queries/analyses';
import { cancelReportJob } from '../workers/report-worker';
import { generateSignedUrl, generateDownloadSignedUrl, isSignedUrlExpired } from '../services/gcs';

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

// GET /api/reports/jobs — List active + recent report jobs (not full history)
reportRoutes.get('/jobs', (_req: Request, res: Response) => {
  try {
    const jobs = listActiveAndRecentJobs('report', 5);
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
// If GCS is available, redirects to a signed URL; otherwise serves local file
reportRoutes.get('/:siteId/pdf', async (req: Request, res: Response) => {
  try {
    const siteId = Number(req.params.siteId);
    if (isNaN(siteId)) {
      return res.status(400).json({ success: false, error: 'Invalid siteId' });
    }

    const report = getReportBySiteId(siteId);
    if (!report || report.status !== 'completed') {
      return res.status(404).json({ success: false, error: 'No completed report found' });
    }

    // Prefer GCS signed URL
    if (report.gcs_path) {
      let url = report.gcs_url;
      // Refresh signed URL if expired
      if (!url || isSignedUrlExpired(report.gcs_url_expires)) {
        const fresh = await generateSignedUrl(report.gcs_path);
        updateReport(report.id, { gcs_url: fresh.url, gcs_url_expires: fresh.expires });
        url = fresh.url;
      }
      return res.redirect(url);
    }

    // Fallback to local file
    if (!report.pdf_path) {
      return res.status(404).json({ success: false, error: 'No PDF found for this report' });
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
// If GCS is available, redirects to a signed download URL; otherwise serves local file
reportRoutes.get('/:siteId/download', async (req: Request, res: Response) => {
  try {
    const siteId = Number(req.params.siteId);
    if (isNaN(siteId)) {
      return res.status(400).json({ success: false, error: 'Invalid siteId' });
    }

    const report = getReportBySiteId(siteId);
    if (!report || report.status !== 'completed') {
      return res.status(404).json({ success: false, error: 'No completed report found' });
    }

    // Prefer GCS signed download URL (always generate fresh for attachment disposition)
    if (report.gcs_path && report.pdf_filename) {
      // For downloads we generate a fresh attachment-disposition URL each time,
      // but we also refresh the cached inline URL if it's expired
      const downloadUrl = await generateDownloadSignedUrl(report.gcs_path, report.pdf_filename);

      // Opportunistically refresh the cached inline URL if expired
      if (!report.gcs_url || isSignedUrlExpired(report.gcs_url_expires)) {
        const fresh = await generateSignedUrl(report.gcs_path);
        updateReport(report.id, { gcs_url: fresh.url, gcs_url_expires: fresh.expires });
      }

      return res.redirect(downloadUrl.url);
    }

    // Fallback to local file
    if (!report.pdf_path) {
      return res.status(404).json({ success: false, error: 'No PDF found for this report' });
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

// GET /api/reports/:siteId/signed-url — Get a fresh signed URL (for services/email)
reportRoutes.get('/:siteId/signed-url', async (req: Request, res: Response) => {
  try {
    const siteId = Number(req.params.siteId);
    if (isNaN(siteId)) {
      return res.status(400).json({ success: false, error: 'Invalid siteId' });
    }

    const report = getReportBySiteId(siteId);
    if (!report || report.status !== 'completed' || !report.gcs_path) {
      return res.status(404).json({ success: false, error: 'No completed report with GCS storage found' });
    }

    const disposition = req.query.disposition === 'attachment' ? 'attachment' : 'inline';
    let url: string;
    let expires: string;

    if (disposition === 'inline') {
      // Use cached inline URL if still valid
      if (report.gcs_url && !isSignedUrlExpired(report.gcs_url_expires)) {
        url = report.gcs_url;
        expires = report.gcs_url_expires!;
      } else {
        const fresh = await generateSignedUrl(report.gcs_path);
        updateReport(report.id, { gcs_url: fresh.url, gcs_url_expires: fresh.expires });
        url = fresh.url;
        expires = fresh.expires;
      }
    } else {
      // Attachment disposition — always generate fresh (different Content-Disposition header)
      const fresh = report.pdf_filename
        ? await generateDownloadSignedUrl(report.gcs_path, report.pdf_filename)
        : await generateSignedUrl(report.gcs_path);
      url = fresh.url;
      expires = fresh.expires;
    }

    return res.json({
      success: true,
      data: {
        url,
        expires,
        disposition,
      },
    });
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
