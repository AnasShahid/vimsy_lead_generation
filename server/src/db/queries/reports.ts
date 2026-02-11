import { getDb } from '../index';
import type { SiteReport, ReportStatus } from '@vimsy/shared';

export interface ReportListFilters {
  status?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function createReport(siteId: number, jobId: string): SiteReport {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO site_reports (site_id, report_job_id, status)
    VALUES (?, ?, 'pending')
  `);
  const result = stmt.run(siteId, jobId);
  return getReportById(result.lastInsertRowid as number)!;
}

export function getReportById(id: number): SiteReport | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM site_reports WHERE id = ?').get(id) as any;
  if (!row) return null;
  return normalizeReportRow(row);
}

export function getReportBySiteId(siteId: number): SiteReport | null {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM site_reports WHERE site_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(siteId) as any;
  if (!row) return null;
  return normalizeReportRow(row);
}

export function getReportsByJobId(jobId: string): SiteReport[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM site_reports WHERE report_job_id = ? ORDER BY site_id ASC'
  ).all(jobId) as any[];
  return rows.map(normalizeReportRow);
}

export function updateReport(id: number, data: Partial<Omit<SiteReport, 'id' | 'site_id' | 'report_job_id' | 'created_at'>>): void {
  const db = getDb();

  const allowedFields = [
    'status', 'pdf_filename', 'pdf_path',
    'ai_executive_summary', 'ai_recommendations', 'ai_pitch',
    'health_score', 'priority_classification',
    'error', 'generated_at',
  ];

  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value ?? null);
    }
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE site_reports SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function listReports(filters: ReportListFilters): { reports: (SiteReport & { domain?: string; company_name?: string; industry_segment?: string })[]; total: number } {
  const db = getDb();
  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (filters.status) {
    whereClause += ' AND r.status = ?';
    params.push(filters.status);
  }

  const countRow = db.prepare(
    `SELECT COUNT(*) as count FROM site_reports r ${whereClause}`
  ).get(...params) as any;
  const total = countRow.count;

  const sortBy = filters.sortBy || 'r.created_at';
  const sortOrder = filters.sortOrder || 'desc';
  const allowedSortColumns = ['r.created_at', 'r.generated_at', 'r.health_score', 'r.status', 'r.priority_classification', 's.domain', 's.company_name'];
  const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'r.created_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const offset = (page - 1) * pageSize;

  const rows = db.prepare(`
    SELECT r.*, s.domain, s.company_name, s.industry_segment
    FROM site_reports r
    LEFT JOIN sites s ON r.site_id = s.id
    ${whereClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset) as any[];

  return {
    reports: rows.map(normalizeReportRow),
    total,
  };
}

export function deleteReport(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM site_reports WHERE id = ?').run(id);
}

function normalizeReportRow(row: any): SiteReport & { domain?: string; company_name?: string; industry_segment?: string } {
  return {
    ...row,
  };
}
