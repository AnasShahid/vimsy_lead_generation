import { getDb } from '../index';
import type { WpVulnerability } from '@vimsy/shared';

export function importVulnerabilities(rows: Array<Omit<WpVulnerability, 'id' | 'imported_at'>>): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO wp_vulnerabilities (
      title, cve_id, cvss_score, cvss_rating,
      software_name, software_type, software_slug,
      affected_versions, patched_status, remediation,
      description, published_date, last_updated_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  const transaction = db.transaction((items: typeof rows) => {
    for (const row of items) {
      stmt.run(
        row.title || null,
        row.cve_id || null,
        row.cvss_score ?? null,
        row.cvss_rating || null,
        row.software_name || null,
        row.software_type || null,
        row.software_slug || null,
        row.affected_versions || null,
        row.patched_status || null,
        row.remediation || null,
        row.description || null,
        row.published_date || null,
        row.last_updated_date || null
      );
      count++;
    }
  });

  transaction(rows);
  return count;
}

export function clearVulnerabilities(): number {
  const db = getDb();
  const result = db.prepare('DELETE FROM wp_vulnerabilities').run();
  return result.changes;
}

export function findVulnerabilitiesBySlug(slug: string): WpVulnerability[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM wp_vulnerabilities WHERE software_slug = ? ORDER BY cvss_score DESC'
  ).all(slug) as any[];
  return rows;
}

export function findVulnerabilitiesBySlugs(slugs: string[]): Record<string, WpVulnerability[]> {
  const db = getDb();
  if (slugs.length === 0) return {};

  const placeholders = slugs.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT * FROM wp_vulnerabilities WHERE software_slug IN (${placeholders}) ORDER BY cvss_score DESC`
  ).all(...slugs) as any[];

  const result: Record<string, WpVulnerability[]> = {};
  for (const slug of slugs) {
    result[slug] = [];
  }
  for (const row of rows) {
    const slug = row.software_slug;
    if (!result[slug]) {
      result[slug] = [];
    }
    result[slug].push(row);
  }
  return result;
}

export function getVulnerabilityStats(): {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
} {
  const db = getDb();

  const totalRow = db.prepare('SELECT COUNT(*) as count FROM wp_vulnerabilities').get() as any;

  const typeRows = db.prepare(
    'SELECT software_type, COUNT(*) as count FROM wp_vulnerabilities GROUP BY software_type'
  ).all() as any[];

  const severityRows = db.prepare(
    'SELECT cvss_rating, COUNT(*) as count FROM wp_vulnerabilities GROUP BY cvss_rating'
  ).all() as any[];

  const byType: Record<string, number> = {};
  for (const row of typeRows) {
    byType[row.software_type || 'unknown'] = row.count;
  }

  const bySeverity: Record<string, number> = {};
  for (const row of severityRows) {
    bySeverity[row.cvss_rating || 'unknown'] = row.count;
  }

  return {
    total: totalRow.count,
    byType,
    bySeverity,
  };
}

export function getLastImportDate(): string | null {
  const db = getDb();
  const row = db.prepare(
    'SELECT MAX(imported_at) as last_import FROM wp_vulnerabilities'
  ).get() as any;
  return row?.last_import || null;
}
