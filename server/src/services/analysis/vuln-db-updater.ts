import { fetchUrl } from '../../utils/http';
import { clearVulnerabilities, importVulnerabilities, getVulnerabilityStats, getLastImportDate } from '../../db/queries/vulnerabilities';
import { setSetting, getSetting } from '../../db/queries/settings';
import type { WpVulnerability } from '@vimsy/shared';

const OWVD_CSV_URL = 'https://github.com/ihuzaifashoukat/wordpress-vulnerability-database/raw/main/vulnerabilities.csv';

export interface VulnDbUpdateResult {
  success: boolean;
  totalImported: number;
  stats: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  error?: string;
}

export interface VulnDbStatus {
  lastUpdated: string | null;
  stats: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

export async function updateVulnerabilityDatabase(): Promise<VulnDbUpdateResult> {
  try {
    console.log('[VulnDB] Downloading OWVD vulnerability database...');

    const response = await fetchUrl(OWVD_CSV_URL, { timeout: 60000 });

    if (response.statusCode !== 200) {
      return {
        success: false,
        totalImported: 0,
        stats: { total: 0, byType: {}, bySeverity: {} },
        error: `Failed to download OWVD CSV: HTTP ${response.statusCode}`,
      };
    }

    const csvContent = response.body;
    if (!csvContent || csvContent.trim().length === 0) {
      return {
        success: false,
        totalImported: 0,
        stats: { total: 0, byType: {}, bySeverity: {} },
        error: 'Downloaded CSV is empty',
      };
    }

    console.log('[VulnDB] Parsing CSV data...');
    const rows = parseCSV(csvContent);

    if (rows.length === 0) {
      return {
        success: false,
        totalImported: 0,
        stats: { total: 0, byType: {}, bySeverity: {} },
        error: 'No valid rows found in CSV',
      };
    }

    console.log(`[VulnDB] Importing ${rows.length} vulnerabilities...`);

    // Clear existing data and import fresh
    clearVulnerabilities();
    const totalImported = importVulnerabilities(rows);

    // Update settings with last import date
    setSetting('vuln_db_last_updated', new Date().toISOString());

    const stats = getVulnerabilityStats();

    console.log(`[VulnDB] Import complete: ${totalImported} vulnerabilities imported`);

    return {
      success: true,
      totalImported,
      stats,
    };
  } catch (err: any) {
    console.error(`[VulnDB] Update failed: ${err.message}`);
    return {
      success: false,
      totalImported: 0,
      stats: { total: 0, byType: {}, bySeverity: {} },
      error: `Update failed: ${err.message}`,
    };
  }
}

export function getVulnDbStatus(): VulnDbStatus {
  const lastUpdated = getSetting('vuln_db_last_updated') || getLastImportDate();
  const stats = getVulnerabilityStats();

  return {
    lastUpdated,
    stats,
  };
}

/**
 * Simple CSV parser for OWVD format.
 * Handles quoted fields and newlines within quotes.
 */
function parseCSV(content: string): Array<Omit<WpVulnerability, 'id' | 'imported_at'>> {
  const lines = content.split('\n');
  if (lines.length < 2) return [];

  // Parse header to get column indices
  const header = parseCSVLine(lines[0]);
  const colMap: Record<string, number> = {};
  for (let i = 0; i < header.length; i++) {
    colMap[header[i].trim().toLowerCase()] = i;
  }

  const rows: Array<Omit<WpVulnerability, 'id' | 'imported_at'>> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    if (cols.length < 3) continue;

    const getCol = (name: string): string | null => {
      const idx = colMap[name];
      if (idx === undefined || idx >= cols.length) return null;
      const val = cols[idx]?.trim();
      return val || null;
    };

    const cvssStr = getCol('cvss_score') || getCol('cvss');
    const cvssScore = cvssStr ? parseFloat(cvssStr) : null;

    rows.push({
      title: getCol('title') || getCol('name'),
      cve_id: getCol('cve_id') || getCol('cve'),
      cvss_score: cvssScore !== null && !isNaN(cvssScore) ? cvssScore : null,
      cvss_rating: getCol('cvss_rating') || getCol('severity') || classifyCVSSScore(cvssScore),
      software_name: getCol('software_name') || getCol('software'),
      software_type: getCol('software_type') || getCol('type'),
      software_slug: getCol('software_slug') || getCol('slug'),
      affected_versions: getCol('affected_versions') || getCol('affected_version'),
      patched_status: getCol('patched_status') || getCol('patched'),
      remediation: getCol('remediation') || getCol('fix'),
      description: getCol('description'),
      published_date: getCol('published_date') || getCol('published'),
      last_updated_date: getCol('last_updated_date') || getCol('updated'),
    });
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}

function classifyCVSSScore(score: number | null): string | null {
  if (score === null || score === undefined || isNaN(score)) return null;
  if (score >= 9.0) return 'critical';
  if (score >= 7.0) return 'high';
  if (score >= 4.0) return 'medium';
  return 'low';
}
