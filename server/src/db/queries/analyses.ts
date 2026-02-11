import { getDb } from '../index';
import type { SiteAnalysis } from '@vimsy/shared';

export function createAnalysis(siteId: number, jobId: string): SiteAnalysis {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO site_analyses (site_id, analysis_job_id, status)
    VALUES (?, ?, 'pending')
  `);
  const result = stmt.run(siteId, jobId);
  return getAnalysisById(result.lastInsertRowid as number)!;
}

export function getAnalysisById(id: number): SiteAnalysis | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM site_analyses WHERE id = ?').get(id) as any;
  if (!row) return null;
  return normalizeAnalysisRow(row);
}

export function getAnalysisBySiteId(siteId: number): SiteAnalysis | null {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM site_analyses WHERE site_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(siteId) as any;
  if (!row) return null;
  return normalizeAnalysisRow(row);
}

export function getAnalysesByJobId(jobId: string): SiteAnalysis[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM site_analyses WHERE analysis_job_id = ? ORDER BY site_id ASC'
  ).all(jobId) as any[];
  return rows.map(normalizeAnalysisRow);
}

export function updateAnalysis(id: number, data: Partial<Omit<SiteAnalysis, 'id' | 'site_id' | 'analysis_job_id' | 'created_at'>>): void {
  const db = getDb();

  const allowedFields = [
    'status', 'health_score', 'priority_classification',
    'psi_performance_score', 'psi_accessibility_score', 'psi_seo_score', 'psi_best_practices_score', 'psi_raw_data',
    'ssl_valid', 'ssl_issuer', 'ssl_expiry_date', 'ssl_days_until_expiry', 'ssl_protocol_version', 'ssl_cipher', 'ssl_chain_valid', 'ssl_raw_data',
    'wpscan_wp_version', 'wpscan_wp_version_status', 'wpscan_theme', 'wpscan_theme_version', 'wpscan_plugins', 'wpscan_users', 'wpscan_config_backups', 'wpscan_db_exports', 'wpscan_raw_data',
    'vulnerabilities_found', 'vulnerability_details',
    'security_score', 'performance_score', 'wp_health_score', 'availability_score', 'seo_score',
    'action_status', 'analyzed_at',
  ];

  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      if (key === 'ssl_valid' || key === 'ssl_chain_valid') {
        values.push(value !== null && value !== undefined ? (value ? 1 : 0) : null);
      } else {
        values.push(value ?? null);
      }
    }
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE site_analyses SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export interface AnalysisListFilters {
  status?: string;
  priority_classification?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function listAnalyses(filters: AnalysisListFilters): { analyses: SiteAnalysis[]; total: number } {
  const db = getDb();
  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (filters.status) {
    whereClause += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.priority_classification) {
    whereClause += ' AND priority_classification = ?';
    params.push(filters.priority_classification);
  }

  const countRow = db.prepare(`SELECT COUNT(*) as count FROM site_analyses ${whereClause}`).get(...params) as any;
  const total = countRow.count;

  const sortBy = filters.sortBy || 'created_at';
  const sortOrder = filters.sortOrder || 'desc';
  const allowedSortColumns = ['health_score', 'security_score', 'performance_score', 'wp_health_score', 'created_at', 'analyzed_at', 'priority_classification'];
  const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const offset = (page - 1) * pageSize;

  const rows = db.prepare(
    `SELECT * FROM site_analyses ${whereClause} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`
  ).all(...params, pageSize, offset) as any[];

  return {
    analyses: rows.map(normalizeAnalysisRow),
    total,
  };
}

export function deleteAnalysesByJobId(jobId: string): number {
  const db = getDb();
  const result = db.prepare('DELETE FROM site_analyses WHERE analysis_job_id = ?').run(jobId);
  return result.changes;
}

function normalizeAnalysisRow(row: any): SiteAnalysis {
  return {
    ...row,
    ssl_valid: row.ssl_valid !== null ? Boolean(row.ssl_valid) : null,
    ssl_chain_valid: row.ssl_chain_valid !== null ? Boolean(row.ssl_chain_valid) : null,
    psi_raw_data: row.psi_raw_data || null,
    ssl_raw_data: row.ssl_raw_data || null,
    wpscan_raw_data: row.wpscan_raw_data || null,
    vulnerability_details: row.vulnerability_details || null,
  };
}
