import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface WPScanResult {
  wpVersion: string | null;
  wpVersionStatus: string | null;
  mainTheme: { name: string; version: string | null } | null;
  plugins: Array<{ slug: string; name: string; version: string | null; outdated: boolean }>;
  users: string[];
  configBackups: string[];
  dbExports: string[];
  interestingFindings: string[];
  rawData: Record<string, unknown>;
  error?: string;
}

const SCAN_TIMEOUT_MS = 120000;
const DOCKER_CONTAINER_NAME = 'vimsy-wpscan';

export async function runWPScan(url: string): Promise<WPScanResult> {
  const emptyResult: WPScanResult = {
    wpVersion: null,
    wpVersionStatus: null,
    mainTheme: null,
    plugins: [],
    users: [],
    configBackups: [],
    dbExports: [],
    interestingFindings: [],
    rawData: {},
  };

  try {
    // Build WPScan command
    const cmd = [
      'docker', 'exec', DOCKER_CONTAINER_NAME,
      'wpscan',
      '--url', url,
      '--format', 'json',
      '--enumerate', 'vp,vt,cb,dbe,u',
      '--no-banner',
      '--random-user-agent',
      '--force',
    ].join(' ');

    const { stdout, stderr } = await execAsync(cmd, {
      timeout: SCAN_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large JSON output
    });

    if (!stdout || stdout.trim().length === 0) {
      return {
        ...emptyResult,
        error: stderr ? `WPScan stderr: ${stderr.substring(0, 500)}` : 'WPScan returned empty output',
      };
    }

    const data = JSON.parse(stdout);
    return parseWPScanOutput(data);
  } catch (err: any) {
    // Handle Docker not available
    if (err.message?.includes('Cannot connect to the Docker daemon') ||
        err.message?.includes('docker: not found') ||
        err.message?.includes('No such container')) {
      return {
        ...emptyResult,
        error: 'Docker is not available. WPScan requires Docker to be running with the vimsy-wpscan container.',
      };
    }

    // Handle timeout
    if (err.killed || err.message?.includes('TIMEOUT')) {
      return {
        ...emptyResult,
        error: `WPScan timed out after ${SCAN_TIMEOUT_MS / 1000}s`,
      };
    }

    // WPScan may exit with non-zero but still produce JSON output
    if (err.stdout) {
      try {
        const data = JSON.parse(err.stdout);
        return parseWPScanOutput(data);
      } catch {
        // JSON parse failed, fall through
      }
    }

    return {
      ...emptyResult,
      error: `WPScan error: ${err.message?.substring(0, 500) || 'Unknown error'}`,
    };
  }
}

function parseWPScanOutput(data: any): WPScanResult {
  const result: WPScanResult = {
    wpVersion: null,
    wpVersionStatus: null,
    mainTheme: null,
    plugins: [],
    users: [],
    configBackups: [],
    dbExports: [],
    interestingFindings: [],
    rawData: data,
  };

  // WordPress version
  if (data.version) {
    result.wpVersion = data.version.number || null;
    result.wpVersionStatus = data.version.status || null;
  }

  // Main theme
  if (data.main_theme) {
    result.mainTheme = {
      name: data.main_theme.slug || data.main_theme.style_name || 'unknown',
      version: data.main_theme.version?.number || null,
    };
  }

  // Plugins
  if (data.plugins) {
    for (const [slug, pluginData] of Object.entries(data.plugins as Record<string, any>)) {
      result.plugins.push({
        slug,
        name: pluginData.slug || slug,
        version: pluginData.version?.number || null,
        outdated: pluginData.version?.status === 'outdated' || pluginData.outdated === true,
      });
    }
  }

  // Users
  if (data.users) {
    for (const [username] of Object.entries(data.users)) {
      result.users.push(username);
    }
  }

  // Config backups
  if (data.config_backups) {
    for (const [url] of Object.entries(data.config_backups)) {
      result.configBackups.push(url);
    }
  }

  // DB exports
  if (data.db_exports) {
    for (const [url] of Object.entries(data.db_exports)) {
      result.dbExports.push(url);
    }
  }

  // Interesting findings
  if (data.interesting_findings && Array.isArray(data.interesting_findings)) {
    for (const finding of data.interesting_findings) {
      if (finding.to_s) {
        result.interestingFindings.push(finding.to_s);
      } else if (finding.url) {
        result.interestingFindings.push(finding.url);
      }
    }
  }

  return result;
}
