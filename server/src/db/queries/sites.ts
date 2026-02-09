import { getDb } from '../index';
import type { Site, SiteFilterParams, WPDetectionResult, DiscoveryProvider } from '@vimsy/shared';

export function upsertSite(site: Partial<Site> & { url: string; domain: string }): Site {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM sites WHERE url = ?').get(site.url) as any;

  if (existing) {
    const fields: string[] = [];
    const values: any[] = [];

    const updatable = [
      'is_wordpress', 'wp_version', 'detected_theme', 'detected_plugins',
      'discovery_source', 'discovery_job_id', 'country', 'industry_guess',
      'has_contact_page', 'contact_page_url', 'status', 'http_status_code',
      'ssl_valid', 'response_time_ms', 'meta_description', 'page_title',
      'pipeline_stage', 'company_name', 'industry_segment', 'ai_fit_reasoning',
      'emails_available_count', 'priority', 'outreach_status', 'notes',
    ] as const;

    for (const key of updatable) {
      if (site[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(site[key]);
      }
    }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(existing.id);
      db.prepare(`UPDATE sites SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return getSiteById(existing.id)!;
  }

  const stmt = db.prepare(`
    INSERT INTO sites (
      url, domain, is_wordpress, wp_version, detected_theme, detected_plugins,
      discovery_source, discovery_job_id, country, industry_guess,
      has_contact_page, contact_page_url, status, http_status_code,
      ssl_valid, response_time_ms, meta_description, page_title, pipeline_stage,
      company_name, industry_segment, ai_fit_reasoning, emails_available_count,
      priority, outreach_status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    site.url,
    site.domain,
    site.is_wordpress ? 1 : 0,
    site.wp_version || null,
    site.detected_theme || null,
    site.detected_plugins || null,
    site.discovery_source || 'manual',
    site.discovery_job_id || null,
    site.country || null,
    site.industry_guess || null,
    site.has_contact_page ? 1 : 0,
    site.contact_page_url || null,
    site.status || 'pending',
    site.http_status_code || null,
    site.ssl_valid !== undefined && site.ssl_valid !== null ? (site.ssl_valid ? 1 : 0) : null,
    site.response_time_ms || null,
    site.meta_description || null,
    site.page_title || null,
    site.pipeline_stage || 'discovered',
    site.company_name || null,
    site.industry_segment || null,
    site.ai_fit_reasoning || null,
    site.emails_available_count || 0,
    site.priority || 'cold',
    site.outreach_status || 'not_started',
    site.notes || null
  );

  return getSiteById(result.lastInsertRowid as number)!;
}

export function saveSiteFromDetection(
  detection: WPDetectionResult,
  source: DiscoveryProvider,
  jobId: string | null,
  extra?: { country?: string; industry_guess?: string }
): Site {
  const url = new URL(detection.url);
  return upsertSite({
    url: detection.url,
    domain: url.hostname,
    is_wordpress: detection.is_wordpress,
    wp_version: detection.wp_version,
    detected_theme: detection.detected_theme,
    detected_plugins: detection.detected_plugins.join(', '),
    discovery_source: source,
    discovery_job_id: jobId,
    has_contact_page: detection.has_contact_page,
    contact_page_url: detection.contact_page_url,
    status: detection.http_status_code ? 'active' : 'error',
    http_status_code: detection.http_status_code,
    ssl_valid: detection.ssl_valid,
    response_time_ms: detection.response_time_ms,
    meta_description: detection.meta_description,
    page_title: detection.page_title,
    country: extra?.country || null,
    industry_guess: extra?.industry_guess || null,
  });
}

export function getSiteById(id: number): Site | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM sites WHERE id = ?').get(id) as any;
  if (!row) return null;
  return normalizeSiteRow(row);
}

export function listSites(filters: SiteFilterParams): { sites: Site[]; total: number } {
  const db = getDb();
  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (filters.search) {
    whereClause += ' AND (url LIKE ? OR domain LIKE ? OR page_title LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  if (filters.is_wordpress !== undefined) {
    whereClause += ' AND is_wordpress = ?';
    params.push(filters.is_wordpress ? 1 : 0);
  }
  if (filters.discovery_source) {
    whereClause += ' AND discovery_source = ?';
    params.push(filters.discovery_source);
  }
  if (filters.status) {
    whereClause += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.pipeline_stage) {
    whereClause += ' AND pipeline_stage = ?';
    params.push(filters.pipeline_stage);
  }
  if (filters.job_id) {
    whereClause += ' AND discovery_job_id = ?';
    params.push(filters.job_id);
  }
  if (filters.priority) {
    whereClause += ' AND priority = ?';
    params.push(filters.priority);
  }
  if (filters.country) {
    whereClause += ' AND country = ?';
    params.push(filters.country);
  }
  if (filters.english_markets_only) {
    whereClause += " AND country IN ('AU', 'US', 'UK', 'NZ', 'CA')";
  }

  const countRow = db.prepare(`SELECT COUNT(*) as count FROM sites ${whereClause}`).get(...params) as any;
  const total = countRow.count;

  const sortBy = filters.sortBy || 'created_at';
  const sortOrder = filters.sortOrder || 'desc';
  const allowedSortColumns = ['url', 'domain', 'is_wordpress', 'status', 'response_time_ms', 'created_at', 'discovery_date', 'priority', 'company_name', 'country'];
  const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const offset = (page - 1) * pageSize;

  const rows = db.prepare(
    `SELECT * FROM sites ${whereClause} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset) as any[];

  return {
    sites: rows.map(normalizeSiteRow),
    total,
  };
}

export function deleteSite(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM sites WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getAllSitesForExport(filters?: Partial<SiteFilterParams>): Site[] {
  const db = getDb();
  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (filters?.is_wordpress !== undefined) {
    whereClause += ' AND is_wordpress = ?';
    params.push(filters.is_wordpress ? 1 : 0);
  }
  if (filters?.discovery_source) {
    whereClause += ' AND discovery_source = ?';
    params.push(filters.discovery_source);
  }
  if (filters?.status) {
    whereClause += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.job_id) {
    whereClause += ' AND discovery_job_id = ?';
    params.push(filters.job_id);
  }
  if (filters?.priority) {
    whereClause += ' AND priority = ?';
    params.push(filters.priority);
  }

  const rows = db.prepare(`SELECT * FROM sites ${whereClause} ORDER BY created_at DESC`).all(...params) as any[];
  return rows.map(normalizeSiteRow);
}

export function batchDeleteSites(ids: number[]): number {
  const db = getDb();
  if (ids.length === 0) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`DELETE FROM sites WHERE id IN (${placeholders})`).run(...ids);
  return result.changes;
}

export function batchUpdateSites(ids: number[], updates: Record<string, any>): number {
  const db = getDb();
  if (ids.length === 0) return 0;

  const allowedFields = ['priority', 'outreach_status', 'pipeline_stage', 'notes', 'company_name', 'industry_segment'];
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return 0;

  fields.push("updated_at = datetime('now')");
  const placeholders = ids.map(() => '?').join(',');
  values.push(...ids);

  const result = db.prepare(
    `UPDATE sites SET ${fields.join(', ')} WHERE id IN (${placeholders})`
  ).run(...values);

  return result.changes;
}

function normalizeSiteRow(row: any): Site {
  return {
    ...row,
    is_wordpress: Boolean(row.is_wordpress),
    has_contact_page: Boolean(row.has_contact_page),
    ssl_valid: row.ssl_valid !== null ? Boolean(row.ssl_valid) : null,
  };
}
