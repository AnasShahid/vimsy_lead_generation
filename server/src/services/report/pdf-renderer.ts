import Handlebars from 'handlebars';
import puppeteer, { Browser } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import type { Site, SiteAnalysis } from '@vimsy/shared';
import type { ReportAIContent } from './ai-report-generator';

// --- Types ---

export interface RenderReportInput {
  site: Site;
  analysis: SiteAnalysis;
  aiContent: ReportAIContent;
  branding: Record<string, string>;
}

export interface RenderReportOutput {
  pdfPath: string;
  pdfFilename: string;
  fullPath: string;
}

// --- Browser Lifecycle ---

let browser: Browser | null = null;

export async function initBrowser(): Promise<void> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    console.log('[Report] Puppeteer browser initialized');
  }
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    console.log('[Report] Puppeteer browser closed');
  }
}

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    await initBrowser();
  }
  return browser!;
}

// --- Template ---

const TEMPLATE_PATH = path.join(__dirname, '../../templates/report.hbs');
let compiledTemplate: Handlebars.TemplateDelegate | null = null;

function getTemplate(): Handlebars.TemplateDelegate {
  if (!compiledTemplate || process.env.NODE_ENV !== 'production') {
    const templateSource = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
    compiledTemplate = Handlebars.compile(templateSource);
  }
  return compiledTemplate;
}

// --- Handlebars Helpers ---

Handlebars.registerHelper('if_eq', function (this: any, a: any, b: any, options: any) {
  return a === b ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('if_lt', function (this: any, a: any, b: any, options: any) {
  return (Number(a) || 0) < (Number(b) || 0) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('or', function (a: any, b: any) {
  return a || b;
});

Handlebars.registerHelper('score_color', function (score: any) {
  const s = Number(score) || 0;
  if (s < 40) return '#dc2626';
  if (s < 60) return '#ea580c';
  if (s < 76) return '#ca8a04';
  return '#16a34a';
});

Handlebars.registerHelper('score_color_100', function (score: any) {
  const s = Number(score) || 0;
  if (s < 40) return '#dc2626';
  if (s < 60) return '#ea580c';
  if (s < 76) return '#ca8a04';
  return '#16a34a';
});

Handlebars.registerHelper('score_color_pct', function (score: any, max: any) {
  const s = Number(score) || 0;
  const m = Number(max) || 100;
  const pct = (s / m) * 100;
  if (pct < 40) return '#dc2626';
  if (pct < 60) return '#ea580c';
  if (pct < 76) return '#ca8a04';
  return '#16a34a';
});

Handlebars.registerHelper('score_bar', function (score: any, max: any) {
  const s = Number(score) || 0;
  const m = Number(max) || 100;
  return Math.round((s / m) * 100);
});

Handlebars.registerHelper('format_date', function (date: any) {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return date;
  }
});

Handlebars.registerHelper('format_number', function (num: any) {
  const n = Number(num);
  if (isNaN(n)) return 'N/A';
  return Math.round(n);
});

// --- Markdown to HTML ---

function markdownToHtml(md: string): string {
  if (!md) return '';

  let html = md;

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Bullet points
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs (double newlines)
  html = html.replace(/\n\n/g, '</p><p>');
  html = `<p>${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>\s*(<h[34]>)/g, '$1');
  html = html.replace(/(<\/h[34]>)\s*<\/p>/g, '$1');
  html = html.replace(/<p>\s*(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)\s*<\/p>/g, '$1');

  return html;
}

// --- Template Context Builder ---

function buildTemplateContext(input: RenderReportInput): Record<string, any> {
  const { site, analysis, aiContent, branding } = input;

  // Parse JSON fields
  let plugins: any[] = [];
  let users: any[] = [];
  let configBackups: any[] = [];
  let dbExports: any[] = [];

  if (analysis.wpscan_plugins) {
    try { plugins = JSON.parse(analysis.wpscan_plugins); } catch { /* ignore */ }
  }
  if (analysis.wpscan_users) {
    try { users = JSON.parse(analysis.wpscan_users); } catch { /* ignore */ }
  }
  if (analysis.wpscan_config_backups) {
    try { configBackups = JSON.parse(analysis.wpscan_config_backups); } catch { /* ignore */ }
  }
  if (analysis.wpscan_db_exports) {
    try { dbExports = JSON.parse(analysis.wpscan_db_exports); } catch { /* ignore */ }
  }

  return {
    // Site info
    domain: site.domain,
    company_name: site.company_name,
    is_wordpress: site.is_wordpress,
    page_title: site.page_title,
    meta_description: site.meta_description,

    // Scores
    health_score: analysis.health_score ?? 0,
    priority_classification: analysis.priority_classification || 'N/A',
    performance_score: analysis.performance_score ?? 0,
    security_score: analysis.security_score ?? 0,
    seo_score: analysis.seo_score ?? 0,
    availability_score: analysis.availability_score ?? 0,

    // PSI
    psi_performance_score: analysis.psi_performance_score,
    psi_accessibility_score: analysis.psi_accessibility_score,
    psi_seo_score: analysis.psi_seo_score,
    psi_best_practices_score: analysis.psi_best_practices_score,

    // SSL
    ssl_valid: analysis.ssl_valid,
    ssl_issuer: analysis.ssl_issuer,
    ssl_expiry_date: analysis.ssl_expiry_date,
    ssl_days_until_expiry: analysis.ssl_days_until_expiry,
    ssl_protocol_version: analysis.ssl_protocol_version,

    // Vulnerabilities
    vulnerabilities_found: analysis.vulnerabilities_found,

    // WordPress
    wpscan_wp_version: analysis.wpscan_wp_version,
    wpscan_wp_version_status: analysis.wpscan_wp_version_status,
    wpscan_theme: analysis.wpscan_theme,
    wpscan_theme_version: analysis.wpscan_theme_version,
    plugins,
    users,
    config_backups: configBackups,
    db_exports: dbExports,

    // AI content (converted from markdown to HTML)
    ai_executive_summary: markdownToHtml(aiContent.executive_summary),
    ai_recommendations: markdownToHtml(aiContent.recommendations),
    ai_pitch: markdownToHtml(aiContent.pitch),

    // Branding
    branding: {
      company_name: branding.report_company_name || 'Vimsy',
      logo_url: branding.report_logo_url || '',
      primary_color: branding.report_primary_color || '#4F46E5',
      disclaimer: branding.report_disclaimer || '',
      cta_text: branding.report_cta_text || '',
      contact_email: branding.report_contact_email || '',
      contact_phone: branding.report_contact_phone || '',
      contact_website: branding.report_contact_website || '',
    },

    // Meta
    generated_date: new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    }),
  };
}

// --- PDF Output ---

const REPORTS_DIR = path.resolve(__dirname, '../../../../data/reports');

function sanitizeDomain(domain: string): string {
  return domain.replace(/[^a-zA-Z0-9.-]/g, '_');
}

/**
 * Render a PDF report from site data, analysis data, AI content, and branding settings.
 */
export async function renderReportPdf(input: RenderReportInput): Promise<RenderReportOutput> {
  // Ensure output directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  // Build template context
  const context = buildTemplateContext(input);

  // Compile and render HTML
  const template = getTemplate();
  const html = template(context);

  // Generate filename
  const dateStr = new Date().toISOString().split('T')[0];
  const pdfFilename = `vimsy-report-${sanitizeDomain(input.site.domain)}-${dateStr}.pdf`;
  const fullPath = path.join(REPORTS_DIR, pdfFilename);
  const relativePath = `reports/${pdfFilename}`;

  // Render PDF with Puppeteer
  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.pdf({
      path: fullPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
  } finally {
    await page.close();
  }

  console.log(`[Report] PDF saved: ${fullPath}`);

  return {
    pdfPath: relativePath,
    pdfFilename,
    fullPath,
  };
}
