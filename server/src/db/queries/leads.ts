import { getDb } from '../index';
import type { Site } from '@vimsy/shared';

export interface LeadAnalysisSummary {
  health_score: number | null;
  priority_classification: string | null;
  action_status: string | null;
  security_score: number | null;
  performance_score: number | null;
  seo_score: number | null;
  availability_score: number | null;
  vulnerabilities_found: number;
  analyzed_at: string | null;
}

export interface LeadReportSummary {
  report_status: string | null;
  pdf_filename: string | null;
  generated_at: string | null;
}

export interface LeadRow extends Site {
  contact_count: number;
  analysis: LeadAnalysisSummary | null;
  report: LeadReportSummary | null;
  tags: string[];
}

export interface LeadFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  enrichment_status?: string;
  analysis_status?: string;
  report_status?: string;
  outreach_status?: string;
  priority?: string;
  priority_classification?: string;
  tag?: string;
  country?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function listLeads(filters: LeadFilterParams): { leads: LeadRow[]; total: number } {
  const db = getDb();

  // Base: all sites that have left discovery
  let whereClause = "WHERE s.pipeline_stage != 'discovered'";
  const params: any[] = [];

  if (filters.search) {
    whereClause += ' AND (s.domain LIKE ? OR s.company_name LIKE ? OR s.url LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  if (filters.enrichment_status) {
    whereClause += ' AND s.enrichment_status = ?';
    params.push(filters.enrichment_status);
  }
  if (filters.analysis_status) {
    whereClause += ' AND s.analysis_status = ?';
    params.push(filters.analysis_status);
  }
  if (filters.report_status) {
    whereClause += ' AND s.report_status = ?';
    params.push(filters.report_status);
  }
  if (filters.outreach_status) {
    whereClause += ' AND s.outreach_status = ?';
    params.push(filters.outreach_status);
  }
  if (filters.priority) {
    whereClause += ' AND s.priority = ?';
    params.push(filters.priority);
  }
  if (filters.country) {
    whereClause += ' AND s.country = ?';
    params.push(filters.country);
  }
  if (filters.tag) {
    whereClause += ' AND EXISTS (SELECT 1 FROM site_tags st WHERE st.site_id = s.id AND st.tag = ?)';
    params.push(filters.tag);
  }
  if (filters.priority_classification) {
    whereClause += ' AND a.priority_classification = ?';
    params.push(filters.priority_classification);
  }

  const joinClauses = `
    LEFT JOIN (
      SELECT site_id, COUNT(*) as contact_count
      FROM contacts
      GROUP BY site_id
    ) cc ON cc.site_id = s.id
    LEFT JOIN (
      SELECT sa.*,
        ROW_NUMBER() OVER (PARTITION BY sa.site_id ORDER BY sa.created_at DESC) as rn
      FROM site_analyses sa
    ) a ON a.site_id = s.id AND a.rn = 1
    LEFT JOIN (
      SELECT sr.*,
        ROW_NUMBER() OVER (PARTITION BY sr.site_id ORDER BY sr.created_at DESC) as rn
      FROM site_reports sr
    ) r ON r.site_id = s.id AND r.rn = 1
  `;

  // Count query
  const countRow = db.prepare(
    `SELECT COUNT(*) as count FROM sites s ${joinClauses} ${whereClause}`
  ).get(...params) as any;
  const total = countRow.count;

  // Sort
  const sortBy = filters.sortBy || 'updated_at';
  const sortOrder = filters.sortOrder || 'desc';
  const allowedSortColumns: Record<string, string> = {
    domain: 's.domain',
    company_name: 's.company_name',
    updated_at: 's.updated_at',
    created_at: 's.created_at',
    health_score: 'a.health_score',
    priority: 's.priority',
    enrichment_status: 's.enrichment_status',
    analysis_status: 's.analysis_status',
    report_status: 's.report_status',
  };
  const safeSortBy = allowedSortColumns[sortBy] || 's.updated_at';
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  // Pagination
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const offset = (page - 1) * pageSize;

  const rows = db.prepare(`
    SELECT
      s.*,
      COALESCE(cc.contact_count, 0) as contact_count,
      a.health_score as a_health_score,
      a.priority_classification as a_priority_classification,
      a.action_status as a_action_status,
      a.security_score as a_security_score,
      a.performance_score as a_performance_score,
      a.seo_score as a_seo_score,
      a.availability_score as a_availability_score,
      a.vulnerabilities_found as a_vulnerabilities_found,
      a.analyzed_at as a_analyzed_at,
      r.status as r_report_status,
      r.pdf_filename as r_pdf_filename,
      r.generated_at as r_generated_at
    FROM sites s
    ${joinClauses}
    ${whereClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset) as any[];

  // Get tags for all returned sites
  const siteIds = rows.map((r: any) => r.id);
  const tagsMap = getTagsForLeads(siteIds);

  const leads: LeadRow[] = rows.map((row: any) => {
    const hasAnalysis = row.a_health_score !== null || row.a_priority_classification !== null || row.a_analyzed_at !== null;
    const hasReport = row.r_report_status !== null;

    return {
      ...normalizeSiteRow(row),
      contact_count: row.contact_count,
      analysis: hasAnalysis ? {
        health_score: row.a_health_score,
        priority_classification: row.a_priority_classification,
        action_status: row.a_action_status,
        security_score: row.a_security_score,
        performance_score: row.a_performance_score,
        seo_score: row.a_seo_score,
        availability_score: row.a_availability_score,
        vulnerabilities_found: row.a_vulnerabilities_found ?? 0,
        analyzed_at: row.a_analyzed_at,
      } : null,
      report: hasReport ? {
        report_status: row.r_report_status,
        pdf_filename: row.r_pdf_filename,
        generated_at: row.r_generated_at,
      } : null,
      tags: tagsMap[row.id] || [],
    };
  });

  return { leads, total };
}

export function getLeadStats(): Record<string, any> {
  const db = getDb();

  const row = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN enrichment_status = 'enriched' THEN 1 ELSE 0 END) as enriched,
      SUM(CASE WHEN analysis_status = 'analyzed' THEN 1 ELSE 0 END) as analyzed,
      SUM(CASE WHEN report_status = 'completed' THEN 1 ELSE 0 END) as reports_ready,
      SUM(CASE WHEN outreach_status != 'not_started' THEN 1 ELSE 0 END) as outreach_sent,
      SUM(CASE WHEN enrichment_status = 'pending' THEN 1 ELSE 0 END) as enrichment_pending,
      SUM(CASE WHEN enrichment_status = 'enriching' THEN 1 ELSE 0 END) as enrichment_enriching,
      SUM(CASE WHEN enrichment_status = 'error' THEN 1 ELSE 0 END) as enrichment_error,
      SUM(CASE WHEN analysis_status = 'pending' THEN 1 ELSE 0 END) as analysis_pending,
      SUM(CASE WHEN analysis_status = 'analyzing' THEN 1 ELSE 0 END) as analysis_analyzing,
      SUM(CASE WHEN analysis_status = 'error' THEN 1 ELSE 0 END) as analysis_error,
      SUM(CASE WHEN report_status = 'pending' THEN 1 ELSE 0 END) as report_pending,
      SUM(CASE WHEN report_status = 'generating' THEN 1 ELSE 0 END) as report_generating,
      SUM(CASE WHEN report_status = 'error' THEN 1 ELSE 0 END) as report_error,
      SUM(CASE WHEN outreach_status = 'in_progress' THEN 1 ELSE 0 END) as outreach_in_progress,
      SUM(CASE WHEN outreach_status = 'done' THEN 1 ELSE 0 END) as outreach_done,
      SUM(CASE WHEN priority = 'hot' THEN 1 ELSE 0 END) as priority_hot,
      SUM(CASE WHEN priority = 'warm' THEN 1 ELSE 0 END) as priority_warm,
      SUM(CASE WHEN priority = 'cold' THEN 1 ELSE 0 END) as priority_cold
    FROM sites
    WHERE pipeline_stage != 'discovered'
  `).get() as any;

  return row;
}

function getTagsForLeads(siteIds: number[]): Record<number, string[]> {
  if (siteIds.length === 0) return {};
  const db = getDb();
  const placeholders = siteIds.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT site_id, tag FROM site_tags WHERE site_id IN (${placeholders}) ORDER BY assigned_at ASC`
  ).all(...siteIds) as any[];

  const result: Record<number, string[]> = {};
  for (const row of rows) {
    if (!result[row.site_id]) {
      result[row.site_id] = [];
    }
    result[row.site_id].push(row.tag);
  }
  return result;
}

function normalizeSiteRow(row: any): Site {
  return {
    ...row,
    is_wordpress: Boolean(row.is_wordpress),
    has_contact_page: Boolean(row.has_contact_page),
    ssl_valid: row.ssl_valid !== null ? Boolean(row.ssl_valid) : null,
  };
}
