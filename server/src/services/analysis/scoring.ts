import type { PageSpeedResult } from './pagespeed';
import type { SSLAnalysisResult } from './ssl-analyzer';
import type { WPScanResult } from './wpscan';
import type { VulnerabilityMatchResult } from './vulnerability-matcher';
import type { SecurityHeadersResult } from './security-headers';
import type { AvailabilityResult } from './availability';
import type { AnalysisPriority, AnalysisAction } from '@vimsy/shared';

export interface ScoringInput {
  pagespeed: PageSpeedResult | null;
  ssl: SSLAnalysisResult | null;
  wpscan: WPScanResult | null;
  vulnerabilities: VulnerabilityMatchResult | null;
  securityHeaders: SecurityHeadersResult | null;
  availability: AvailabilityResult | null;
}

export interface ScoringOutput {
  healthScore: number;
  /** Actual category points retained (out of 30) */
  securityScore: number;
  /** Actual category points retained (out of 30) */
  performanceScore: number;
  /** Actual category points retained (out of 20) */
  seoScore: number;
  /** Actual category points retained (out of 20) */
  availabilityScore: number;
  priorityClassification: AnalysisPriority;
  actionStatus: AnalysisAction;
  breakdown: Record<string, number>;
  deductions: string[];
}

/**
 * Comprehensive deduction-based scoring system (start at 100, deduct points).
 *
 * Sub-scores are returned as actual category points retained (NOT normalized %).
 * Health score = performanceScore + securityScore + seoScore + availabilityScore.
 *
 * Performance (30 points max):
 *   Proportional from weighted PSI scores:
 *   - Performance 60%, Accessibility 20%, Best Practices 20%
 *   - Deduction = round((1 - weightedPSI / 100) * 30)
 *   - No PSI data: -20
 *
 * Security (30 points max):
 *   - SSL (10 pts): No SSL -10, Weak/expiring -4
 *   - Security Headers (5 pts): Proportional to missing count
 *   - WordPress Freshness (5 pts): > 2 ver old -5, insecure -5, unknown version -2
 *   - Vulnerabilities (10 pts): Severity-weighted deduction
 *
 * SEO (20 points max):
 *   - PSI SEO score (12 pts): Proportional
 *   - Meta description (4 pts): Missing -4
 *   - Sitemap (4 pts): Missing -4
 *
 * Availability (20 points max):
 *   - Site reachability (12 pts): Down -12, Anti-bot blocked -4
 *   - Response time (8 pts): > 10s -8, > 5s -6, > 3s -3
 *
 * Priority:
 *   0-40: Critical (immediate outreach)
 *   41-60: High (strong opportunity)
 *   61-75: Medium (good opportunity)
 *   76-100: Low (maintenance only)
 */
export function calculateScore(input: ScoringInput): ScoringOutput {
  const deductions: string[] = [];

  // ── Performance (30 pts) ──
  const perfDeduction = calculatePerformanceDeduction(input.pagespeed, deductions);

  // ── Security (30 pts) ──
  const secDeduction = calculateSecurityDeduction(
    input.ssl, input.wpscan, input.vulnerabilities, input.securityHeaders, deductions
  );

  // ── SEO (20 pts) ──
  const seoDeduction = calculateSEODeduction(input.pagespeed, input.availability, deductions);

  // ── Availability (20 pts) ──
  const availDeduction = calculateAvailabilityDeduction(input.availability, deductions);

  // Sub-scores are actual category points retained
  const performanceScore = Math.max(0, 30 - perfDeduction);
  const securityScore = Math.max(0, 30 - secDeduction);
  const seoScore = Math.max(0, 20 - seoDeduction);
  const availabilityScore = Math.max(0, 20 - availDeduction);

  const healthScore = performanceScore + securityScore + seoScore + availabilityScore;
  const priorityClassification = classifyPriority(healthScore);
  const actionStatus = classifyAction(healthScore);

  const breakdown: Record<string, number> = {
    performance_max: 30,
    performance_deduction: perfDeduction,
    performance_score: performanceScore,
    security_max: 30,
    security_deduction: secDeduction,
    security_score: securityScore,
    seo_max: 20,
    seo_deduction: seoDeduction,
    seo_score: seoScore,
    availability_max: 20,
    availability_deduction: availDeduction,
    availability_score: availabilityScore,
    total_deduction: perfDeduction + secDeduction + seoDeduction + availDeduction,
  };

  return {
    healthScore,
    securityScore,
    performanceScore,
    seoScore,
    availabilityScore,
    priorityClassification,
    actionStatus,
    breakdown,
    deductions,
  };
}

// ── Performance (30 pts max) ─────────────────────────────────────────────────
// Uses ALL PSI categories: Performance (60%), Accessibility (20%), Best Practices (20%)
function calculatePerformanceDeduction(
  pagespeed: PageSpeedResult | null,
  deductions: string[]
): number {
  if (!pagespeed || pagespeed.error) {
    deductions.push('Performance: No PageSpeed data available (-20)');
    return 20;
  }

  const perf = pagespeed.performance;
  const access = pagespeed.accessibility;
  const bp = pagespeed.bestPractices;

  // Weighted average of all PSI categories
  const weightedPSI = (perf * 0.6) + (access * 0.2) + (bp * 0.2);
  const deduction = Math.round((1 - weightedPSI / 100) * 30);

  const parts: string[] = [`PSI ${perf}`];
  if (access < 80) parts.push(`Accessibility ${access}`);
  if (bp < 80) parts.push(`Best Practices ${bp}`);

  if (deduction > 0) {
    deductions.push(`Performance: Weighted PSI ${Math.round(weightedPSI)} [${parts.join(', ')}] (-${deduction})`);
  }

  return Math.min(deduction, 30);
}

// ── Security (30 pts max) ────────────────────────────────────────────────────
// Components: SSL (10), Headers (5), WP Freshness (5), Vulnerabilities (10)
function calculateSecurityDeduction(
  ssl: SSLAnalysisResult | null,
  wpscan: WPScanResult | null,
  vulnerabilities: VulnerabilityMatchResult | null,
  securityHeaders: SecurityHeadersResult | null,
  deductions: string[]
): number {
  let deduction = 0;

  // ── SSL (10 pts) ──
  if (!ssl || !ssl.valid) {
    deductions.push('Security: No valid SSL certificate (-10)');
    deduction += 10;
  } else {
    const sslWeak = (ssl.daysUntilExpiry !== null && ssl.daysUntilExpiry <= 30) ||
      (ssl.protocolVersion && ['TLSv1', 'TLSv1.1', 'SSLv3'].includes(ssl.protocolVersion)) ||
      ssl.selfSigned;
    if (sslWeak) {
      deductions.push('Security: SSL weak/expiring/self-signed (-4)');
      deduction += 4;
    }
  }

  // ── Security Headers (5 pts) ──
  if (securityHeaders && !securityHeaders.error) {
    const totalHeaders = securityHeaders.presentHeaders.length + securityHeaders.missingHeaders.length;
    if (totalHeaders > 0 && securityHeaders.missingHeaders.length > 0) {
      const headerDeduction = Math.round((securityHeaders.missingHeaders.length / totalHeaders) * 5);
      if (headerDeduction > 0) {
        deductions.push(`Security: Missing ${securityHeaders.missingHeaders.length}/${totalHeaders} security headers (-${headerDeduction})`);
        deduction += headerDeduction;
      }
    }
  } else if (!securityHeaders) {
    deductions.push('Security: Could not check security headers (-3)');
    deduction += 3;
  }

  // ── WordPress Freshness (5 pts) ──
  if (wpscan) {
    if (wpscan.wpVersionsBehind > 2 || wpscan.wpVersionStatus === 'insecure') {
      const label = wpscan.wpVersionsBehind > 2
        ? `${wpscan.wpVersionsBehind} versions behind`
        : 'insecure version';
      deductions.push(`Security: Outdated WordPress (${label}) (-5)`);
      deduction += 5;
    } else if (!wpscan.wpVersion && wpscan.plugins.length > 0) {
      // WP detected (has plugins) but version unknown — minor concern
      deductions.push('Security: WordPress version undetectable (-2)');
      deduction += 2;
    }
  }

  // ── Vulnerabilities (10 pts) ──
  if (vulnerabilities && vulnerabilities.totalVulnerabilities > 0) {
    const critical = vulnerabilities.criticalCount || 0;
    const high = vulnerabilities.highCount || 0;
    const medium = vulnerabilities.mediumCount || 0;
    const low = vulnerabilities.lowCount || 0;

    // Severity-weighted score
    const severityScore = (critical * 4) + (high * 3) + (medium * 1.5) + (low * 0.5);

    let vulnDeduction: number;
    if (severityScore > 20) vulnDeduction = 10;
    else if (severityScore > 10) vulnDeduction = 7;
    else if (severityScore > 5) vulnDeduction = 5;
    else vulnDeduction = 3;

    const counts: string[] = [];
    if (critical > 0) counts.push(`${critical} critical`);
    if (high > 0) counts.push(`${high} high`);
    if (medium > 0) counts.push(`${medium} medium`);
    if (low > 0) counts.push(`${low} low`);

    deductions.push(`Security: ${vulnerabilities.totalVulnerabilities} vulnerabilities [${counts.join(', ')}] (-${vulnDeduction})`);
    deduction += vulnDeduction;
  }

  return Math.min(deduction, 30);
}

// ── SEO (20 pts max) ─────────────────────────────────────────────────────────
// Components: PSI SEO (12), Meta description (4), Sitemap (4)
function calculateSEODeduction(
  pagespeed: PageSpeedResult | null,
  availability: AvailabilityResult | null,
  deductions: string[]
): number {
  let deduction = 0;

  // ── PSI SEO score (12 pts) — proportional ──
  if (pagespeed && !pagespeed.error) {
    const seoDeduction = Math.round((1 - pagespeed.seo / 100) * 12);
    if (seoDeduction > 0) {
      deductions.push(`SEO: PSI SEO score ${pagespeed.seo} (-${seoDeduction})`);
      deduction += seoDeduction;
    }
  } else {
    deductions.push('SEO: No PageSpeed SEO data available (-8)');
    deduction += 8;
  }

  // ── Meta description (4 pts) ──
  if (availability && !availability.error && !availability.hasMetaDescription) {
    deductions.push('SEO: Missing meta description (-4)');
    deduction += 4;
  }

  // ── Sitemap (4 pts) ──
  if (availability && !availability.error && !availability.hasSitemap) {
    deductions.push('SEO: No sitemap found (-4)');
    deduction += 4;
  }

  return Math.min(deduction, 20);
}

// ── Availability (20 pts max) ────────────────────────────────────────────────
// Components: Reachability (12), Response time (8)
function calculateAvailabilityDeduction(
  availability: AvailabilityResult | null,
  deductions: string[]
): number {
  if (!availability) {
    deductions.push('Availability: No availability data (-12)');
    return 12;
  }

  let deduction = 0;

  // ── Reachability (12 pts) ──
  if (availability.error) {
    if (availability.error.includes('anti-bot') || availability.error.includes('bot protection')) {
      // Anti-bot blocking — partial penalty (site is technically up)
      deductions.push('Availability: Blocked by anti-bot protection (-4)');
      deduction += 4;
    } else {
      deductions.push(`Availability: Site unreachable — ${availability.error} (-12)`);
      deduction += 12;
    }
  } else if (!availability.isUp) {
    deductions.push(`Availability: Site down (HTTP ${availability.statusCode}) (-12)`);
    deduction += 12;
  }

  // ── Response time (8 pts) ──
  if (availability.isUp && availability.responseTimeMs > 0) {
    if (availability.responseTimeMs > 10000) {
      deductions.push(`Availability: Very slow response ${Math.round(availability.responseTimeMs / 1000)}s (> 10s) (-8)`);
      deduction += 8;
    } else if (availability.responseTimeMs > 5000) {
      deductions.push(`Availability: Slow response ${Math.round(availability.responseTimeMs / 1000)}s (> 5s) (-6)`);
      deduction += 6;
    } else if (availability.responseTimeMs > 3000) {
      deductions.push(`Availability: Moderate response ${Math.round(availability.responseTimeMs / 1000)}s (> 3s) (-3)`);
      deduction += 3;
    }
  }

  return Math.min(deduction, 20);
}

function classifyPriority(healthScore: number): AnalysisPriority {
  if (healthScore <= 40) return 'critical';
  if (healthScore <= 60) return 'high';
  if (healthScore <= 75) return 'medium';
  return 'low';
}

function classifyAction(healthScore: number): AnalysisAction {
  if (healthScore <= 60) return 'qualified';
  if (healthScore <= 75) return 'manual_review';
  return 'maintenance';
}
