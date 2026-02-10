import { getSiteById } from '../../db/queries/sites';
import { updateAnalysis } from '../../db/queries/analyses';
import { analyzePageSpeed } from './pagespeed';
import { analyzeSSL } from './ssl-analyzer';
import { runWPScan } from './wpscan';
import { matchVulnerabilities } from './vulnerability-matcher';
import { calculateScore } from './scoring';
import type { PageSpeedResult } from './pagespeed';
import type { SSLAnalysisResult } from './ssl-analyzer';
import type { WPScanResult } from './wpscan';
import type { VulnerabilityMatchResult } from './vulnerability-matcher';
import type { ScoringOutput } from './scoring';

export interface AnalysisResult {
  success: boolean;
  analysisId: number;
  healthScore?: number;
  priorityClassification?: string;
  error?: string;
}

/**
 * Run full technical analysis on a single site.
 * Orchestrates PSI, SSL, WPScan, vulnerability matching, and scoring.
 */
export async function analyzeSite(siteId: number, analysisId: number): Promise<AnalysisResult> {
  const site = getSiteById(siteId);
  if (!site) {
    return { success: false, analysisId, error: 'Site not found' };
  }

  const domain = site.domain;
  const url = site.url;
  const isWordPress = site.is_wordpress;

  console.log(`[Analysis] Starting analysis for site ${siteId} (${domain})`);

  let pagespeedResult: PageSpeedResult | null = null;
  let sslResult: SSLAnalysisResult | null = null;
  let wpscanResult: WPScanResult | null = null;
  let vulnResult: VulnerabilityMatchResult | null = null;

  // Step 1: PageSpeed Insights
  try {
    console.log(`[Analysis] Site ${siteId}: Running PageSpeed Insights...`);
    pagespeedResult = await analyzePageSpeed(url);
    if (pagespeedResult.error) {
      console.warn(`[Analysis] Site ${siteId}: PSI warning: ${pagespeedResult.error}`);
    }
  } catch (err: any) {
    console.error(`[Analysis] Site ${siteId}: PSI failed: ${err.message}`);
  }

  // Step 2: SSL/TLS Analysis
  try {
    console.log(`[Analysis] Site ${siteId}: Running SSL analysis...`);
    sslResult = await analyzeSSL(domain);
  } catch (err: any) {
    console.error(`[Analysis] Site ${siteId}: SSL analysis failed: ${err.message}`);
  }

  // Step 3: WPScan (only for WordPress sites)
  if (isWordPress) {
    try {
      console.log(`[Analysis] Site ${siteId}: Running WPScan...`);
      wpscanResult = await runWPScan(url);
      if (wpscanResult.error) {
        console.warn(`[Analysis] Site ${siteId}: WPScan warning: ${wpscanResult.error}`);
      }
    } catch (err: any) {
      console.error(`[Analysis] Site ${siteId}: WPScan failed: ${err.message}`);
    }

    // Step 4: Vulnerability matching (only if WPScan returned data)
    if (wpscanResult && !wpscanResult.error) {
      try {
        console.log(`[Analysis] Site ${siteId}: Matching vulnerabilities...`);
        vulnResult = await matchVulnerabilities(wpscanResult);
      } catch (err: any) {
        console.error(`[Analysis] Site ${siteId}: Vulnerability matching failed: ${err.message}`);
      }
    }
  }

  // Step 5: Calculate composite score
  let scoring: ScoringOutput;
  try {
    scoring = calculateScore({
      pagespeed: pagespeedResult,
      ssl: sslResult,
      wpscan: wpscanResult,
      vulnerabilities: vulnResult,
    });
  } catch (err: any) {
    console.error(`[Analysis] Site ${siteId}: Scoring failed: ${err.message}`);
    return { success: false, analysisId, error: `Scoring failed: ${err.message}` };
  }

  // Step 6: Save results to site_analyses table
  try {
    updateAnalysis(analysisId, {
      status: 'completed',
      health_score: scoring.healthScore,
      priority_classification: scoring.priorityClassification,
      // PSI
      psi_performance_score: pagespeedResult?.performance ?? null,
      psi_accessibility_score: pagespeedResult?.accessibility ?? null,
      psi_seo_score: pagespeedResult?.seo ?? null,
      psi_best_practices_score: pagespeedResult?.bestPractices ?? null,
      psi_raw_data: pagespeedResult?.rawData ? JSON.stringify(pagespeedResult.rawData) : null,
      // SSL
      ssl_valid: sslResult?.valid ?? null,
      ssl_issuer: sslResult?.issuer ?? null,
      ssl_expiry_date: sslResult?.expiryDate ?? null,
      ssl_days_until_expiry: sslResult?.daysUntilExpiry ?? null,
      ssl_protocol_version: sslResult?.protocolVersion ?? null,
      ssl_cipher: sslResult?.cipher ?? null,
      ssl_chain_valid: sslResult?.chainValid ?? null,
      ssl_raw_data: sslResult?.rawData ? JSON.stringify(sslResult.rawData) : null,
      // WPScan
      wpscan_wp_version: wpscanResult?.wpVersion ?? null,
      wpscan_wp_version_status: wpscanResult?.wpVersionStatus ?? null,
      wpscan_theme: wpscanResult?.mainTheme?.name ?? null,
      wpscan_theme_version: wpscanResult?.mainTheme?.version ?? null,
      wpscan_plugins: wpscanResult?.plugins ? JSON.stringify(wpscanResult.plugins) : null,
      wpscan_users: wpscanResult?.users ? JSON.stringify(wpscanResult.users) : null,
      wpscan_config_backups: wpscanResult?.configBackups ? JSON.stringify(wpscanResult.configBackups) : null,
      wpscan_db_exports: wpscanResult?.dbExports ? JSON.stringify(wpscanResult.dbExports) : null,
      wpscan_raw_data: wpscanResult?.rawData ? JSON.stringify(wpscanResult.rawData) : null,
      // Vulnerabilities
      vulnerabilities_found: vulnResult?.totalVulnerabilities ?? 0,
      vulnerability_details: vulnResult ? JSON.stringify(vulnResult) : null,
      // Sub-scores
      security_score: scoring.securityScore,
      performance_score: scoring.performanceScore,
      wp_health_score: scoring.wpHealthScore,
      // Timestamp
      analyzed_at: new Date().toISOString(),
    });

    console.log(`[Analysis] Site ${siteId} (${domain}): Score ${scoring.healthScore}/100 — ${scoring.priorityClassification}`);

    return {
      success: true,
      analysisId,
      healthScore: scoring.healthScore,
      priorityClassification: scoring.priorityClassification,
    };
  } catch (err: any) {
    console.error(`[Analysis] Site ${siteId}: Failed to save results: ${err.message}`);
    return { success: false, analysisId, error: `Save failed: ${err.message}` };
  }
}
