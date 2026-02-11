import { getSiteById } from '../../db/queries/sites';
import { getAnalysisBySiteId } from '../../db/queries/analyses';
import { updateReport } from '../../db/queries/reports';
import { getReportSettings } from '../../db/queries/settings';
import { batchUpdateSites } from '../../db/queries/sites';
import { addTag } from '../../db/queries/tags';
import { generateReportContent } from './ai-report-generator';
import { renderReportPdf } from './pdf-renderer';
import { uploadReportToGCS } from '../gcs';

export interface ReportResult {
  success: boolean;
  reportId: number;
  pdfPath?: string;
  gcsUrl?: string;
  error?: string;
}

/**
 * Generate a complete report for a single site:
 * 1. Fetch site + analysis data
 * 2. Generate AI content (executive summary, recommendations, pitch)
 * 3. Render PDF via Puppeteer
 * 4. Update report record with results
 */
export async function generateSiteReport(
  siteId: number,
  reportId: number
): Promise<ReportResult> {
  try {
    // 1. Fetch site
    const site = getSiteById(siteId);
    if (!site) {
      const error = `Site ${siteId} not found`;
      updateReport(reportId, { status: 'error', error });
      batchUpdateSites([siteId], { report_status: 'error' });
      return { success: false, reportId, error };
    }

    // 2. Fetch latest analysis
    const analysis = getAnalysisBySiteId(siteId);
    if (!analysis || analysis.status !== 'completed') {
      const error = `No completed analysis found for site ${siteId}`;
      updateReport(reportId, { status: 'error', error });
      batchUpdateSites([siteId], { report_status: 'error' });
      return { success: false, reportId, error };
    }

    // 3. Update status to generating
    updateReport(reportId, { status: 'generating' });
    batchUpdateSites([siteId], { report_status: 'generating' });

    console.log(`[Report] Generating report for site ${siteId} (${site.domain})`);

    // 4. Fetch branding settings
    const branding = getReportSettings();

    // 5. Generate AI content
    let aiContent;
    try {
      aiContent = await generateReportContent(siteId);
      // Save AI content immediately (even if PDF fails later)
      updateReport(reportId, {
        ai_executive_summary: aiContent.executive_summary,
        ai_recommendations: aiContent.recommendations,
        ai_pitch: aiContent.pitch,
      });
    } catch (err: any) {
      const error = `AI generation failed: ${err.message}`;
      console.error(`[Report] ${error}`);
      updateReport(reportId, { status: 'error', error });
      batchUpdateSites([siteId], { report_status: 'error' });
      return { success: false, reportId, error };
    }

    // 6. Render PDF
    let pdfResult;
    try {
      pdfResult = await renderReportPdf({ site, analysis, aiContent, branding });
    } catch (err: any) {
      const error = `PDF rendering failed: ${err.message}`;
      console.error(`[Report] ${error}`);
      updateReport(reportId, { status: 'error', error });
      batchUpdateSites([siteId], { report_status: 'error' });
      return { success: false, reportId, error };
    }

    // 7. Upload to Google Cloud Storage
    let gcsResult;
    try {
      gcsResult = await uploadReportToGCS(pdfResult.fullPath, pdfResult.pdfFilename);
    } catch (err: any) {
      console.warn(`[Report] GCS upload failed (keeping local file): ${err.message}`);
      // GCS upload is non-fatal — report still completes with local file
    }

    // 8. Update report as completed
    updateReport(reportId, {
      status: 'completed',
      pdf_path: pdfResult.pdfPath,
      pdf_filename: pdfResult.pdfFilename,
      health_score: analysis.health_score,
      priority_classification: analysis.priority_classification,
      generated_at: new Date().toISOString(),
      ...(gcsResult ? {
        gcs_path: gcsResult.gcsPath,
        gcs_url: gcsResult.gcsUrl,
        gcs_url_expires: gcsResult.gcsUrlExpires,
      } : {}),
    });

    // 9. Update site status
    batchUpdateSites([siteId], { report_status: 'completed' });
    addTag(siteId, 'reported');

    console.log(`[Report] Report completed for site ${siteId} (${site.domain}) → ${pdfResult.pdfFilename}${gcsResult ? ' [GCS ✓]' : ' [local only]'}`);

    return { success: true, reportId, pdfPath: pdfResult.pdfPath, gcsUrl: gcsResult?.gcsUrl };
  } catch (err: any) {
    const error = `Unexpected error: ${err.message}`;
    console.error(`[Report] ${error}`);
    try {
      updateReport(reportId, { status: 'error', error });
      batchUpdateSites([siteId], { report_status: 'error' });
    } catch { /* ignore cleanup errors */ }
    return { success: false, reportId, error };
  }
}
