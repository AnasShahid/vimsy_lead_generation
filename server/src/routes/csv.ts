import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { sitesToCsv, csvToUrls, parseEnrichedLeads, enrichedLeadToSite } from '../utils/csv';
import { getAllSitesForExport, upsertSite } from '../db/queries/sites';
import { createJob } from '../db/queries/jobs';
import { normalizeUrl, extractDomain } from '../utils/http';

export const csvRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// GET /api/csv/export - Export sites as CSV
csvRoutes.get('/export', (req: Request, res: Response) => {
  try {
    const filters = {
      is_wordpress: req.query.is_wordpress !== undefined ? req.query.is_wordpress === 'true' : undefined,
      discovery_source: req.query.discovery_source as any,
      status: req.query.status as any,
      job_id: req.query.job_id as string | undefined,
    };

    const sites = getAllSitesForExport(filters);
    const csv = sitesToCsv(sites);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=vimsy-sites-${new Date().toISOString().slice(0, 10)}.csv`);
    return res.send(csv);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/csv/import - Import CSV file with URLs
csvRoutes.post('/import', upload.single('file'), (req: Request, res: Response) => {
  try {
    let csvContent: string;

    if (req.file) {
      csvContent = req.file.buffer.toString('utf-8');
    } else if (req.body.csvText) {
      csvContent = req.body.csvText;
    } else {
      return res.status(400).json({ success: false, error: 'No CSV file or text provided' });
    }

    const urls = csvToUrls(csvContent);

    if (urls.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid URLs found in CSV' });
    }

    // Create a discovery job for these URLs
    const jobId = uuidv4();
    const job = createJob({
      id: jobId,
      type: 'discovery',
      status: 'pending',
      provider: 'manual',
      config: { urls } as Record<string, unknown>,
      progress: 0,
      total_items: urls.length,
      processed_items: 0,
      error: null,
    });

    return res.status(201).json({
      success: true,
      data: {
        job,
        urlCount: urls.length,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/csv/import-enriched - Import pre-analyzed leads (Excel or CSV)
csvRoutes.post('/import-enriched', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    const rows = parseEnrichedLeads(req.file.buffer, req.file.originalname);

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No leads found in file' });
    }

    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      try {
        const siteData = enrichedLeadToSite(row);
        if (siteData.domain && siteData.domain.length > 0) {
          upsertSite(siteData);
          imported++;
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        imported,
        skipped,
        total: rows.length,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
