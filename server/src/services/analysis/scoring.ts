import type { PageSpeedResult } from './pagespeed';
import type { SSLAnalysisResult } from './ssl-analyzer';
import type { WPScanResult } from './wpscan';
import type { VulnerabilityMatchResult } from './vulnerability-matcher';
import type { AnalysisPriority } from '@vimsy/shared';

export interface ScoringInput {
  pagespeed: PageSpeedResult | null;
  ssl: SSLAnalysisResult | null;
  wpscan: WPScanResult | null;
  vulnerabilities: VulnerabilityMatchResult | null;
}

export interface ScoringOutput {
  healthScore: number;
  securityScore: number;
  performanceScore: number;
  wpHealthScore: number;
  priorityClassification: AnalysisPriority;
  breakdown: Record<string, number>;
}

// Weights: Security 40%, Performance 30%, WordPress Health 30%
const WEIGHT_SECURITY = 0.4;
const WEIGHT_PERFORMANCE = 0.3;
const WEIGHT_WP_HEALTH = 0.3;

const NEUTRAL_SCORE = 50;

export function calculateScore(input: ScoringInput): ScoringOutput {
  const securityScore = calculateSecurityScore(input.ssl, input.vulnerabilities, input.wpscan);
  const performanceScore = calculatePerformanceScore(input.pagespeed);
  const wpHealthScore = calculateWPHealthScore(input.wpscan);

  const healthScore = Math.round(
    securityScore * WEIGHT_SECURITY +
    performanceScore * WEIGHT_PERFORMANCE +
    wpHealthScore * WEIGHT_WP_HEALTH
  );

  const clampedHealth = Math.max(0, Math.min(100, healthScore));
  const priorityClassification = classifyPriority(clampedHealth);

  const breakdown: Record<string, number> = {
    security_weight: WEIGHT_SECURITY * 100,
    performance_weight: WEIGHT_PERFORMANCE * 100,
    wp_health_weight: WEIGHT_WP_HEALTH * 100,
    security_raw: securityScore,
    performance_raw: performanceScore,
    wp_health_raw: wpHealthScore,
    security_weighted: Math.round(securityScore * WEIGHT_SECURITY),
    performance_weighted: Math.round(performanceScore * WEIGHT_PERFORMANCE),
    wp_health_weighted: Math.round(wpHealthScore * WEIGHT_WP_HEALTH),
  };

  return {
    healthScore: clampedHealth,
    securityScore: Math.round(securityScore),
    performanceScore: Math.round(performanceScore),
    wpHealthScore: Math.round(wpHealthScore),
    priorityClassification,
    breakdown,
  };
}

function calculateSecurityScore(
  ssl: SSLAnalysisResult | null,
  vulnerabilities: VulnerabilityMatchResult | null,
  wpscan: WPScanResult | null
): number {
  if (!ssl && !vulnerabilities && !wpscan) return NEUTRAL_SCORE;

  let score = 0;
  let maxPoints = 0;

  // SSL component (30 points max)
  maxPoints += 30;
  if (ssl) {
    if (ssl.valid && ssl.daysUntilExpiry !== null && ssl.daysUntilExpiry > 30) {
      score += 30;
    } else if (ssl.valid && ssl.daysUntilExpiry !== null && ssl.daysUntilExpiry > 0) {
      score += 15; // Expiring soon
    }
    // Expired or invalid = 0 points
  } else {
    score += 15; // Unknown SSL = neutral
  }

  // Vulnerability component (30 points max)
  maxPoints += 30;
  if (vulnerabilities) {
    let vulnDeduction = 0;
    vulnDeduction += vulnerabilities.criticalCount * 15;
    vulnDeduction += vulnerabilities.highCount * 10;
    vulnDeduction += vulnerabilities.mediumCount * 5;
    vulnDeduction += vulnerabilities.lowCount * 2;
    score += Math.max(0, 30 - vulnDeduction);
  } else {
    score += 15; // No vuln data = neutral
  }

  // Config/DB exposure component (20 points max each = 40 total)
  maxPoints += 40;
  if (wpscan) {
    if (wpscan.configBackups.length === 0) {
      score += 20;
    }
    if (wpscan.dbExports.length === 0) {
      score += 20;
    }
  } else {
    score += 20; // Unknown = neutral
  }

  // Normalize to 0-100
  return maxPoints > 0 ? (score / maxPoints) * 100 : NEUTRAL_SCORE;
}

function calculatePerformanceScore(pagespeed: PageSpeedResult | null): number {
  if (!pagespeed || pagespeed.error) return NEUTRAL_SCORE;

  // Weighted: performance 40%, accessibility 20%, SEO 20%, best practices 20%
  return (
    pagespeed.performance * 0.4 +
    pagespeed.accessibility * 0.2 +
    pagespeed.seo * 0.2 +
    pagespeed.bestPractices * 0.2
  );
}

function calculateWPHealthScore(wpscan: WPScanResult | null): number {
  if (!wpscan || wpscan.error) return NEUTRAL_SCORE;

  let score = 0;
  let maxPoints = 0;

  // WP version status (30 points)
  maxPoints += 30;
  if (wpscan.wpVersionStatus === 'latest') {
    score += 30;
  } else if (wpscan.wpVersionStatus === 'outdated') {
    score += 15;
  }
  // 'insecure' = 0 points

  // Plugin health (30 points)
  maxPoints += 30;
  const pluginCount = wpscan.plugins.length;
  const outdatedPlugins = wpscan.plugins.filter(p => p.outdated).length;

  let pluginScore = 30;
  // Plugin count penalty
  if (pluginCount > 30) {
    pluginScore -= 20;
  } else if (pluginCount > 20) {
    pluginScore -= 10;
  }
  // Outdated plugin penalty
  pluginScore -= outdatedPlugins * 3;
  score += Math.max(0, pluginScore);

  // Theme status (20 points)
  maxPoints += 20;
  if (wpscan.mainTheme) {
    score += 20; // Theme detected = base points (outdated check would need version comparison)
  } else {
    score += 10; // No theme info = partial
  }

  // User enumeration (20 points)
  maxPoints += 20;
  if (wpscan.users.length === 0) {
    score += 20; // No exposed users
  } else {
    score += Math.max(0, 20 - wpscan.users.length * 5);
  }

  // Normalize to 0-100
  return maxPoints > 0 ? (score / maxPoints) * 100 : NEUTRAL_SCORE;
}

function classifyPriority(healthScore: number): AnalysisPriority {
  if (healthScore < 40) return 'critical';
  if (healthScore < 55) return 'high';
  if (healthScore < 75) return 'medium';
  return 'low';
}
