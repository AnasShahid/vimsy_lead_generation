import type { PageSpeedResult } from './pagespeed';
import type { SSLAnalysisResult } from './ssl-analyzer';
import type { WPScanResult } from './wpscan';
import type { VulnerabilityMatchResult } from './vulnerability-matcher';
import type { SecurityHeadersResult } from './security-headers';
import type { AvailabilityResult } from './availability';
import type { AnalysisPriority } from '@vimsy/shared';

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
  securityScore: number;
  performanceScore: number;
  seoScore: number;
  availabilityScore: number;
  priorityClassification: AnalysisPriority;
  breakdown: Record<string, number>;
  deductions: string[];
}

/**
 * Deduction-based scoring system (start at 100, deduct points).
 * Based on vimsy_highlevel_plan.pdf page 13:
 *
 * Performance (30 points max deduction):
 *   - Lighthouse score < 50: -30 points
 *   - Lighthouse score 50-80: -15 points
 *   - Lighthouse score > 80: full points (no deduction)
 *
 * Security (30 points max deduction):
 *   - No SSL: -30 points
 *   - Outdated WordPress (> 2 versions old): -15 points
 *   - Missing security headers: -10 points
 *   - SSL grade below B (expiring/weak): -5 points
 *
 * SEO (20 points max deduction):
 *   - SEO score < 70: -20 points
 *   - Missing meta descriptions: -5 points
 *   - No sitemap: -5 points
 *
 * Availability (20 points max deduction):
 *   - Site down: -20 points
 *   - Slow response > 5s: -10 points
 *
 * Priority:
 *   0-40: Critical (immediate outreach)
 *   41-60: High (strong opportunity)
 *   61-75: Medium (good opportunity)
 *   76-100: Low (maintenance only)
 */
export function calculateScore(input: ScoringInput): ScoringOutput {
  const deductions: string[] = [];

  // ── Performance (30 pts max deduction) ──
  const perfDeduction = calculatePerformanceDeduction(input.pagespeed, deductions);

  // ── Security (30 pts max deduction) ──
  const secDeduction = calculateSecurityDeduction(
    input.ssl, input.wpscan, input.securityHeaders, deductions
  );

  // ── SEO (20 pts max deduction) ──
  const seoDeduction = calculateSEODeduction(input.pagespeed, input.availability, deductions);

  // ── Availability (20 pts max deduction) ──
  const availDeduction = calculateAvailabilityDeduction(input.availability, deductions);

  const totalDeduction = perfDeduction + secDeduction + seoDeduction + availDeduction;
  const healthScore = Math.max(0, Math.min(100, 100 - totalDeduction));
  const priorityClassification = classifyPriority(healthScore);

  // Sub-scores (each normalized to 0-100 for display)
  const performanceScore = Math.max(0, Math.round(((30 - perfDeduction) / 30) * 100));
  const securityScore = Math.max(0, Math.round(((30 - secDeduction) / 30) * 100));
  const seoScore = Math.max(0, Math.round(((20 - seoDeduction) / 20) * 100));
  const availabilityScore = Math.max(0, Math.round(((20 - availDeduction) / 20) * 100));

  const breakdown: Record<string, number> = {
    performance_max: 30,
    performance_deduction: perfDeduction,
    performance_score: 30 - perfDeduction,
    security_max: 30,
    security_deduction: secDeduction,
    security_score: 30 - secDeduction,
    seo_max: 20,
    seo_deduction: seoDeduction,
    seo_score: 20 - seoDeduction,
    availability_max: 20,
    availability_deduction: availDeduction,
    availability_score: 20 - availDeduction,
    total_deduction: totalDeduction,
  };

  return {
    healthScore,
    securityScore,
    performanceScore,
    seoScore,
    availabilityScore,
    priorityClassification,
    breakdown,
    deductions,
  };
}

function calculatePerformanceDeduction(
  pagespeed: PageSpeedResult | null,
  deductions: string[]
): number {
  if (!pagespeed || pagespeed.error) {
    // No data available — apply moderate deduction
    deductions.push('Performance: No PageSpeed data available (-15)');
    return 15;
  }

  const lighthouseScore = pagespeed.performance;

  if (lighthouseScore < 50) {
    deductions.push(`Performance: Lighthouse score ${lighthouseScore} (< 50) (-30)`);
    return 30;
  }
  if (lighthouseScore <= 80) {
    deductions.push(`Performance: Lighthouse score ${lighthouseScore} (50-80) (-15)`);
    return 15;
  }
  // > 80 = full points, no deduction
  return 0;
}

function calculateSecurityDeduction(
  ssl: SSLAnalysisResult | null,
  wpscan: WPScanResult | null,
  securityHeaders: SecurityHeadersResult | null,
  deductions: string[]
): number {
  let deduction = 0;

  // No SSL: -30 points
  if (!ssl || !ssl.valid) {
    deductions.push('Security: No valid SSL certificate (-30)');
    deduction += 30;
    return Math.min(deduction, 30); // Cap at 30
  }

  // SSL grade below B (expiring soon or weak protocol): -5 points
  const sslWeak = (ssl.daysUntilExpiry !== null && ssl.daysUntilExpiry <= 30) ||
    (ssl.protocolVersion && ['TLSv1', 'TLSv1.1', 'SSLv3'].includes(ssl.protocolVersion)) ||
    ssl.selfSigned;
  if (sslWeak) {
    deductions.push('Security: SSL grade below B (expiring/weak/self-signed) (-5)');
    deduction += 5;
  }

  // Outdated WordPress (> 2 versions old): -15 points
  if (wpscan && wpscan.wpVersionsBehind > 2) {
    deductions.push(`Security: Outdated WordPress (${wpscan.wpVersionsBehind} versions behind) (-15)`);
    deduction += 15;
  } else if (wpscan && wpscan.wpVersionStatus === 'insecure') {
    deductions.push('Security: Insecure WordPress version (-15)');
    deduction += 15;
  }

  // Missing security headers: -10 points
  if (securityHeaders && securityHeaders.missingHeaders.length >= 3) {
    deductions.push(`Security: Missing ${securityHeaders.missingHeaders.length} security headers (-10)`);
    deduction += 10;
  } else if (!securityHeaders) {
    deductions.push('Security: Could not check security headers (-5)');
    deduction += 5;
  }

  return Math.min(deduction, 30); // Cap at 30
}

function calculateSEODeduction(
  pagespeed: PageSpeedResult | null,
  availability: AvailabilityResult | null,
  deductions: string[]
): number {
  let deduction = 0;

  // SEO score < 70: -20 points
  if (pagespeed && !pagespeed.error) {
    if (pagespeed.seo < 70) {
      deductions.push(`SEO: Score ${pagespeed.seo} (< 70) (-20)`);
      deduction += 20;
      return Math.min(deduction, 20); // Already at max
    }
  } else {
    // No PSI data — moderate deduction
    deductions.push('SEO: No PageSpeed SEO data available (-10)');
    deduction += 10;
  }

  // Missing meta descriptions: -5 points
  if (availability && !availability.hasMetaDescription) {
    deductions.push('SEO: Missing meta description (-5)');
    deduction += 5;
  }

  // No sitemap: -5 points
  if (availability && !availability.hasSitemap) {
    deductions.push('SEO: No sitemap found (-5)');
    deduction += 5;
  }

  return Math.min(deduction, 20); // Cap at 20
}

function calculateAvailabilityDeduction(
  availability: AvailabilityResult | null,
  deductions: string[]
): number {
  if (!availability || availability.error) {
    deductions.push('Availability: Site unreachable (-20)');
    return 20;
  }

  let deduction = 0;

  // Site down: -20 points
  if (!availability.isUp) {
    deductions.push(`Availability: Site down (status ${availability.statusCode}) (-20)`);
    return 20;
  }

  // Slow response > 5s: -10 points
  if (availability.responseTimeMs > 5000) {
    deductions.push(`Availability: Slow response ${Math.round(availability.responseTimeMs / 1000)}s (> 5s) (-10)`);
    deduction += 10;
  }

  return Math.min(deduction, 20); // Cap at 20
}

function classifyPriority(healthScore: number): AnalysisPriority {
  if (healthScore <= 40) return 'critical';
  if (healthScore <= 60) return 'high';
  if (healthScore <= 75) return 'medium';
  return 'low';
}
