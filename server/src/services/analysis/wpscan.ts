import { exec } from 'child_process';
import { promisify } from 'util';
import { fetchUrl } from '../../utils/http';

const execAsync = promisify(exec);

export interface WPScanResult {
  wpVersion: string | null;
  wpVersionStatus: 'latest' | 'outdated' | 'insecure' | null;
  wpVersionsBehind: number;
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
const WP_VERSION_API = 'https://api.wordpress.org/core/version-check/1.7/';

/**
 * Primary: HTTP-based WordPress scanner (no external dependencies).
 * Fallback: Docker WPScan when WPSCAN_API_TOKEN is set.
 */
export async function runWPScan(url: string): Promise<WPScanResult> {
  // Try Docker WPScan first if API token is available
  const apiToken = process.env.WPSCAN_API_TOKEN;
  if (apiToken) {
    console.log(`[WPScan] API token found, attempting Docker WPScan for ${url}`);
    const dockerResult = await runDockerWPScan(url, apiToken);
    if (!dockerResult.error) {
      return dockerResult;
    }
    console.warn(`[WPScan] Docker WPScan failed: ${dockerResult.error}. Falling back to HTTP scanner.`);
  }

  // Primary: HTTP-based scanner
  console.log(`[WPScan] Running HTTP-based WordPress scan for ${url}`);
  return runHttpWPScan(url);
}

// ─── HTTP-Based WordPress Scanner ────────────────────────────────────────────

async function runHttpWPScan(url: string): Promise<WPScanResult> {
  const result: WPScanResult = {
    wpVersion: null,
    wpVersionStatus: null,
    wpVersionsBehind: 0,
    mainTheme: null,
    plugins: [],
    users: [],
    configBackups: [],
    dbExports: [],
    interestingFindings: [],
    rawData: {},
  };

  const baseUrl = url.replace(/\/+$/, '');
  const findings: Record<string, unknown> = {};

  // Run all detection methods in parallel
  const [versionInfo, themeInfo, pluginsInfo, usersInfo, configInfo] = await Promise.allSettled([
    detectWPVersion(baseUrl),
    detectTheme(baseUrl),
    detectPlugins(baseUrl),
    detectUsers(baseUrl),
    detectConfigExposure(baseUrl),
  ]);

  // WordPress version
  if (versionInfo.status === 'fulfilled' && versionInfo.value) {
    result.wpVersion = versionInfo.value.version;
    result.wpVersionStatus = versionInfo.value.status;
    result.wpVersionsBehind = versionInfo.value.versionsBehind;
    findings.version = versionInfo.value;
  }

  // Theme
  if (themeInfo.status === 'fulfilled' && themeInfo.value) {
    result.mainTheme = themeInfo.value;
    findings.theme = themeInfo.value;
  }

  // Plugins
  if (pluginsInfo.status === 'fulfilled' && pluginsInfo.value) {
    result.plugins = pluginsInfo.value;
    findings.plugins = pluginsInfo.value;
  }

  // Users
  if (usersInfo.status === 'fulfilled' && usersInfo.value) {
    result.users = usersInfo.value;
    findings.users = usersInfo.value;
  }

  // Config exposure
  if (configInfo.status === 'fulfilled' && configInfo.value) {
    result.configBackups = configInfo.value.configBackups;
    result.dbExports = configInfo.value.dbExports;
    result.interestingFindings = configInfo.value.findings;
    findings.exposure = configInfo.value;
  }

  result.rawData = findings;
  return result;
}

async function detectWPVersion(baseUrl: string): Promise<{
  version: string;
  status: 'latest' | 'outdated' | 'insecure';
  versionsBehind: number;
  source: string;
} | null> {
  let detectedVersion: string | null = null;
  let source = '';

  // Method 1: wp-json API
  try {
    const res = await fetchUrl(`${baseUrl}/wp-json/`, { timeout: 10000 });
    if (res.statusCode === 200 && res.body) {
      const data = JSON.parse(res.body);
      if (data?.namespaces && data?.name) {
        // WP REST API is available — try to extract version from generator
        const genMatch = res.body.match(/"generator"\s*:\s*"WordPress\s+([\d.]+)"/);
        if (genMatch) {
          detectedVersion = genMatch[1];
          source = 'wp-json';
        }
      }
    }
  } catch { /* ignore */ }

  // Method 2: RSS feed generator tag
  if (!detectedVersion) {
    try {
      const res = await fetchUrl(`${baseUrl}/feed/`, { timeout: 10000 });
      if (res.statusCode === 200 && res.body) {
        const match = res.body.match(/<generator>https?:\/\/wordpress\.org\/\?v=([\d.]+)<\/generator>/);
        if (match) {
          detectedVersion = match[1];
          source = 'feed';
        }
      }
    } catch { /* ignore */ }
  }

  // Method 3: Meta generator tag in HTML
  if (!detectedVersion) {
    try {
      const res = await fetchUrl(baseUrl, { timeout: 10000 });
      if (res.statusCode === 200 && res.body) {
        const match = res.body.match(/<meta\s+name=["']generator["']\s+content=["']WordPress\s+([\d.]+)["']/i);
        if (match) {
          detectedVersion = match[1];
          source = 'meta-generator';
        }
      }
    } catch { /* ignore */ }
  }

  // Method 4: readme.html
  if (!detectedVersion) {
    try {
      const res = await fetchUrl(`${baseUrl}/readme.html`, { timeout: 10000 });
      if (res.statusCode === 200 && res.body) {
        const match = res.body.match(/Version\s+([\d.]+)/i);
        if (match) {
          detectedVersion = match[1];
          source = 'readme.html';
        }
      }
    } catch { /* ignore */ }
  }

  if (!detectedVersion) return null;

  // Check version status against WordPress.org API
  const versionCheck = await checkVersionStatus(detectedVersion);

  return {
    version: detectedVersion,
    status: versionCheck.status,
    versionsBehind: versionCheck.versionsBehind,
    source,
  };
}

async function checkVersionStatus(version: string): Promise<{
  status: 'latest' | 'outdated' | 'insecure';
  versionsBehind: number;
}> {
  try {
    const res = await fetchUrl(WP_VERSION_API, { timeout: 10000 });
    if (res.statusCode === 200 && res.body) {
      const data = JSON.parse(res.body);
      const releases = data?.offers || [];
      if (releases.length > 0) {
        const latestVersion = releases[0]?.version;
        if (latestVersion === version) {
          return { status: 'latest', versionsBehind: 0 };
        }

        // Count major versions behind
        const latestParts = latestVersion.split('.').map(Number);
        const currentParts = version.split('.').map(Number);
        const majorsBehind = (latestParts[0] - currentParts[0]) * 10 +
          (latestParts[1] || 0) - (currentParts[1] || 0);

        if (majorsBehind > 2) {
          return { status: 'insecure', versionsBehind: majorsBehind };
        }
        return { status: 'outdated', versionsBehind: majorsBehind };
      }
    }
  } catch { /* ignore */ }

  // Can't determine — assume outdated
  return { status: 'outdated', versionsBehind: 1 };
}

async function detectTheme(baseUrl: string): Promise<{ name: string; version: string | null } | null> {
  try {
    const res = await fetchUrl(baseUrl, { timeout: 10000 });
    if (res.statusCode === 200 && res.body) {
      // Look for theme in wp-content/themes/ references
      const themeMatch = res.body.match(/wp-content\/themes\/([\w-]+)/);
      if (themeMatch) {
        const themeName = themeMatch[1];
        // Try to get version from style.css
        let version: string | null = null;
        try {
          const styleRes = await fetchUrl(`${baseUrl}/wp-content/themes/${themeName}/style.css`, { timeout: 5000 });
          if (styleRes.statusCode === 200 && styleRes.body) {
            const versionMatch = styleRes.body.match(/Version:\s*([\d.]+)/i);
            if (versionMatch) version = versionMatch[1];
          }
        } catch { /* ignore */ }
        return { name: themeName, version };
      }
    }
  } catch { /* ignore */ }
  return null;
}

async function detectPlugins(baseUrl: string): Promise<Array<{ slug: string; name: string; version: string | null; outdated: boolean }>> {
  const plugins: Array<{ slug: string; name: string; version: string | null; outdated: boolean }> = [];
  const detectedSlugs = new Set<string>();

  try {
    // Scan homepage HTML for plugin references
    const res = await fetchUrl(baseUrl, { timeout: 10000 });
    if (res.statusCode === 200 && res.body) {
      const pluginMatches = res.body.matchAll(/wp-content\/plugins\/([\w-]+)/g);
      for (const match of pluginMatches) {
        detectedSlugs.add(match[1]);
      }
    }
  } catch { /* ignore */ }

  // For each detected plugin, try to get version from readme.txt
  const pluginChecks = Array.from(detectedSlugs).slice(0, 30).map(async (slug) => {
    let version: string | null = null;
    try {
      const readmeRes = await fetchUrl(`${baseUrl}/wp-content/plugins/${slug}/readme.txt`, { timeout: 5000 });
      if (readmeRes.statusCode === 200 && readmeRes.body) {
        const vMatch = readmeRes.body.match(/Stable tag:\s*([\d.]+)/i);
        if (vMatch) version = vMatch[1];
      }
    } catch { /* ignore */ }
    return { slug, name: slug, version, outdated: false };
  });

  const results = await Promise.allSettled(pluginChecks);
  for (const r of results) {
    if (r.status === 'fulfilled') plugins.push(r.value);
  }

  return plugins;
}

async function detectUsers(baseUrl: string): Promise<string[]> {
  const users: string[] = [];
  try {
    // WP REST API user enumeration
    const res = await fetchUrl(`${baseUrl}/wp-json/wp/v2/users?per_page=10`, { timeout: 10000 });
    if (res.statusCode === 200 && res.body) {
      const data = JSON.parse(res.body);
      if (Array.isArray(data)) {
        for (const user of data) {
          if (user.slug) users.push(user.slug);
        }
      }
    }
  } catch { /* ignore */ }

  // Fallback: author archive enumeration
  if (users.length === 0) {
    for (let i = 1; i <= 3; i++) {
      try {
        const res = await fetchUrl(`${baseUrl}/?author=${i}`, { timeout: 5000, followRedirects: false });
        if (res.statusCode && [301, 302].includes(res.statusCode) && res.headers.location) {
          const loc = String(res.headers.location);
          const match = loc.match(/\/author\/([\w-]+)/);
          if (match) users.push(match[1]);
        }
      } catch { /* ignore */ }
    }
  }

  return users;
}

async function detectConfigExposure(baseUrl: string): Promise<{
  configBackups: string[];
  dbExports: string[];
  findings: string[];
}> {
  const configBackups: string[] = [];
  const dbExports: string[] = [];
  const findings: string[] = [];

  const checks = [
    { path: '/wp-config.php.bak', type: 'config' as const },
    { path: '/wp-config.php~', type: 'config' as const },
    { path: '/wp-config.php.old', type: 'config' as const },
    { path: '/wp-config.php.save', type: 'config' as const },
    { path: '/.wp-config.php.swp', type: 'config' as const },
    { path: '/debug.log', type: 'finding' as const },
    { path: '/wp-content/debug.log', type: 'finding' as const },
  ];

  const results = await Promise.allSettled(
    checks.map(async (check) => {
      const res = await fetchUrl(`${baseUrl}${check.path}`, { timeout: 5000 });
      return { ...check, statusCode: res.statusCode, size: res.body?.length || 0 };
    })
  );

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.statusCode === 200 && r.value.size > 100) {
      const fullUrl = `${baseUrl}${r.value.path}`;
      if (r.value.type === 'config') configBackups.push(fullUrl);
      else if (r.value.type === 'finding') findings.push(fullUrl);
    }
  }

  return { configBackups, dbExports, findings };
}

// ─── Docker WPScan (Optional Fallback) ──────────────────────────────────────

async function runDockerWPScan(url: string, apiToken: string): Promise<WPScanResult> {
  const emptyResult: WPScanResult = {
    wpVersion: null,
    wpVersionStatus: null,
    wpVersionsBehind: 0,
    mainTheme: null,
    plugins: [],
    users: [],
    configBackups: [],
    dbExports: [],
    interestingFindings: [],
    rawData: {},
  };

  try {
    const cmd = [
      'docker', 'exec', DOCKER_CONTAINER_NAME,
      'wpscan',
      '--url', url,
      '--format', 'json',
      '--enumerate', 'vp,vt,cb,dbe,u',
      '--no-banner',
      '--random-user-agent',
      '--force',
      '--api-token', apiToken,
    ].join(' ');

    const { stdout, stderr } = await execAsync(cmd, {
      timeout: SCAN_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (!stdout || stdout.trim().length === 0) {
      return {
        ...emptyResult,
        error: stderr ? `WPScan stderr: ${stderr.substring(0, 500)}` : 'WPScan returned empty output',
      };
    }

    const data = JSON.parse(stdout);
    if (data.scan_aborted) {
      return { ...emptyResult, error: `WPScan aborted: ${data.scan_aborted}` };
    }
    return parseDockerWPScanOutput(data);
  } catch (err: any) {
    if (err.stdout) {
      try {
        const data = JSON.parse(err.stdout);
        if (data.scan_aborted) {
          return { ...emptyResult, error: `WPScan aborted: ${data.scan_aborted}` };
        }
        return parseDockerWPScanOutput(data);
      } catch { /* JSON parse failed */ }
    }
    return { ...emptyResult, error: `WPScan error: ${err.message?.substring(0, 500) || 'Unknown error'}` };
  }
}

function parseDockerWPScanOutput(data: any): WPScanResult {
  const result: WPScanResult = {
    wpVersion: null,
    wpVersionStatus: null,
    wpVersionsBehind: 0,
    mainTheme: null,
    plugins: [],
    users: [],
    configBackups: [],
    dbExports: [],
    interestingFindings: [],
    rawData: data,
  };

  if (data.version) {
    result.wpVersion = data.version.number || null;
    result.wpVersionStatus = data.version.status || null;
  }

  if (data.main_theme) {
    result.mainTheme = {
      name: data.main_theme.slug || data.main_theme.style_name || 'unknown',
      version: data.main_theme.version?.number || null,
    };
  }

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

  if (data.users) {
    for (const [username] of Object.entries(data.users)) {
      result.users.push(username);
    }
  }

  if (data.config_backups) {
    for (const [url] of Object.entries(data.config_backups)) {
      result.configBackups.push(url);
    }
  }

  if (data.db_exports) {
    for (const [url] of Object.entries(data.db_exports)) {
      result.dbExports.push(url);
    }
  }

  if (data.interesting_findings && Array.isArray(data.interesting_findings)) {
    for (const finding of data.interesting_findings) {
      if (finding.to_s) result.interestingFindings.push(finding.to_s);
      else if (finding.url) result.interestingFindings.push(finding.url);
    }
  }

  return result;
}
