import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import * as XLSX from 'xlsx';
import type { Site, SiteCSVRow, EnrichedLeadRow } from '@vimsy/shared';
import { normalizeUrl, extractDomain } from './http';

const COLUMNS: (keyof SiteCSVRow)[] = [
  'url', 'domain', 'is_wordpress', 'wp_version', 'detected_theme',
  'detected_plugins', 'discovery_source', 'discovery_date', 'country',
  'industry_guess', 'has_contact_page', 'contact_page_url', 'status',
  'http_status_code', 'ssl_valid', 'response_time_ms', 'meta_description',
  'page_title', 'company_name', 'industry_segment', 'ai_fit_reasoning',
  'emails_available_count', 'priority', 'outreach_status', 'notes',
];

export function sitesToCsv(sites: Site[]): string {
  const rows: SiteCSVRow[] = sites.map(site => ({
    url: site.url,
    domain: site.domain,
    is_wordpress: String(site.is_wordpress),
    wp_version: site.wp_version || '',
    detected_theme: site.detected_theme || '',
    detected_plugins: site.detected_plugins || '',
    discovery_source: site.discovery_source || '',
    discovery_date: site.discovery_date || '',
    country: site.country || '',
    industry_guess: site.industry_guess || '',
    has_contact_page: String(site.has_contact_page),
    contact_page_url: site.contact_page_url || '',
    status: site.status || '',
    http_status_code: site.http_status_code ? String(site.http_status_code) : '',
    ssl_valid: site.ssl_valid !== null ? String(site.ssl_valid) : '',
    response_time_ms: site.response_time_ms ? String(site.response_time_ms) : '',
    meta_description: site.meta_description || '',
    page_title: site.page_title || '',
    company_name: site.company_name || '',
    industry_segment: site.industry_segment || '',
    ai_fit_reasoning: site.ai_fit_reasoning || '',
    emails_available_count: String(site.emails_available_count || 0),
    priority: site.priority || 'cold',
    outreach_status: site.outreach_status || 'not_started',
    notes: site.notes || '',
  }));

  return stringify(rows, {
    header: true,
    columns: COLUMNS,
  });
}

/**
 * Parse an enriched leads file (Excel or CSV) in the vimsy_cold_outreach_leads format.
 */
export function parseEnrichedLeads(buffer: Buffer, filename: string): EnrichedLeadRow[] {
  const ext = filename.toLowerCase().split('.').pop();

  if (ext === 'xlsx' || ext === 'xls') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json<EnrichedLeadRow>(sheet);
  }

  // CSV parsing
  const csvContent = buffer.toString('utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
  return records as EnrichedLeadRow[];
}

/**
 * Map an enriched lead row to a partial Site for database insertion.
 */
export function enrichedLeadToSite(row: EnrichedLeadRow): Partial<Site> & { url: string; domain: string } {
  const domain = (row['Domain'] || '').trim();
  const url = normalizeUrl(domain);
  const extractedDomain = extractDomain(url);

  const priorityRaw = (row['Priority'] || 'cold').trim().toLowerCase();
  const priority = (['hot', 'warm', 'cold'].includes(priorityRaw) ? priorityRaw : 'cold') as 'hot' | 'warm' | 'cold';

  const statusRaw = (row['Outreach Status'] || 'not_started').trim().toLowerCase().replace(/\s+/g, '_');
  const outreachStatus = (['not_started', 'in_progress', 'done'].includes(statusRaw) ? statusRaw : 'not_started') as 'not_started' | 'in_progress' | 'done';

  return {
    url,
    domain: extractedDomain,
    company_name: row['Company Name'] || null,
    industry_segment: row['Industry / Segment'] || null,
    ai_fit_reasoning: row["Why They're a Good Fit"] || null,
    emails_available_count: parseInt(row['Emails Available'] || '0', 10) || 0,
    priority,
    outreach_status: outreachStatus,
    notes: row['Notes'] || null,
    discovery_source: 'manual' as const,
    pipeline_stage: 'discovered' as const,
    status: 'pending' as const,
  };
}

export function csvToUrls(csvContent: string): string[] {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  // Try to find a URL column: url, URL, website, domain, site
  const urlKeys = ['url', 'URL', 'Url', 'website', 'Website', 'domain', 'Domain', 'site', 'Site'];

  if (records.length === 0) return [];

  const firstRecord = records[0];
  const urlKey = urlKeys.find(key => key in firstRecord);

  if (urlKey) {
    return records
      .map((r: any) => r[urlKey])
      .filter((u: string) => u && u.trim().length > 0);
  }

  // If no recognized column, treat first column as URLs
  const firstCol = Object.keys(firstRecord)[0];
  if (firstCol) {
    return records
      .map((r: any) => r[firstCol])
      .filter((u: string) => u && u.trim().length > 0);
  }

  return [];
}

export function csvToSiteImport(csvContent: string): Partial<SiteCSVRow>[] {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
  return records;
}
