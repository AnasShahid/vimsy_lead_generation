import { getSiteById } from '../../db/queries/sites';
import { getAnalysisBySiteId } from '../../db/queries/analyses';
import { getContactCountBySiteId } from '../../db/queries/contacts';
import { getAIModel, getReportPrompt } from '../../db/queries/settings';
import { chatCompletion } from '../openrouter';
import type { Site, SiteAnalysis } from '@vimsy/shared';

export interface ReportAIContent {
  executive_summary: string;
  recommendations: string;
  pitch: string;
}

/**
 * Build a comprehensive context string from site + analysis data for the AI.
 */
export function buildReportContext(site: Site, analysis: SiteAnalysis, contactCount: number): string {
  const lines: string[] = [];

  // Site Information
  lines.push('=== SITE INFORMATION ===');
  lines.push(`Domain: ${site.domain}`);
  lines.push(`Company: ${site.company_name || 'Unknown'}`);
  lines.push(`Industry: ${site.industry_segment || site.industry_guess || 'Unknown'}`);
  lines.push(`Country: ${site.country || 'Unknown'}`);
  if (site.page_title) lines.push(`Page Title: ${site.page_title}`);
  if (site.meta_description) lines.push(`Description: ${site.meta_description}`);
  lines.push(`WordPress: ${site.is_wordpress ? 'Yes' : 'No'}`);
  if (site.ai_fit_reasoning) lines.push(`AI Fit Assessment: ${site.ai_fit_reasoning}`);

  // Health Score
  lines.push('');
  lines.push('=== HEALTH SCORE ===');
  lines.push(`Overall: ${analysis.health_score ?? 'N/A'}/100 — ${analysis.priority_classification || 'N/A'}`);
  lines.push(`Performance: ${analysis.performance_score ?? 'N/A'}/30`);
  lines.push(`Security: ${analysis.security_score ?? 'N/A'}/30`);
  lines.push(`SEO: ${analysis.seo_score ?? 'N/A'}/20`);
  lines.push(`Availability: ${analysis.availability_score ?? 'N/A'}/20`);

  // Performance (PSI)
  lines.push('');
  lines.push('=== PERFORMANCE (PageSpeed Insights) ===');
  lines.push(`Performance Score: ${analysis.psi_performance_score ?? 'N/A'}/100`);
  lines.push(`Accessibility: ${analysis.psi_accessibility_score ?? 'N/A'}/100`);
  lines.push(`SEO Score: ${analysis.psi_seo_score ?? 'N/A'}/100`);
  lines.push(`Best Practices: ${analysis.psi_best_practices_score ?? 'N/A'}/100`);

  // Security
  lines.push('');
  lines.push('=== SECURITY ===');
  lines.push(`SSL Valid: ${analysis.ssl_valid === null ? 'N/A' : analysis.ssl_valid ? 'Yes' : 'No'}`);
  if (analysis.ssl_issuer) lines.push(`SSL Issuer: ${analysis.ssl_issuer}`);
  if (analysis.ssl_expiry_date) {
    lines.push(`SSL Expires: ${analysis.ssl_expiry_date} (${analysis.ssl_days_until_expiry ?? '?'} days)`);
  }
  if (analysis.ssl_protocol_version) lines.push(`Protocol: ${analysis.ssl_protocol_version}`);
  lines.push(`Vulnerabilities Found: ${analysis.vulnerabilities_found}`);

  // Parse vulnerability details if available
  if (analysis.vulnerability_details) {
    try {
      const vulnDetails = JSON.parse(analysis.vulnerability_details);
      if (Array.isArray(vulnDetails) && vulnDetails.length > 0) {
        const counts: Record<string, number> = {};
        for (const v of vulnDetails) {
          const severity = v.severity || v.category || 'unknown';
          counts[severity] = (counts[severity] || 0) + 1;
        }
        lines.push(`Vulnerability Breakdown: ${Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
      }
    } catch {
      // ignore parse errors
    }
  }

  // WordPress Health
  if (site.is_wordpress) {
    lines.push('');
    lines.push('=== WORDPRESS HEALTH ===');
    lines.push(`WP Version: ${analysis.wpscan_wp_version || 'Unknown'} (${analysis.wpscan_wp_version_status || 'Unknown'})`);
    if (analysis.wpscan_theme) {
      lines.push(`Theme: ${analysis.wpscan_theme}${analysis.wpscan_theme_version ? ` v${analysis.wpscan_theme_version}` : ''}`);
    }

    // Parse plugins
    if (analysis.wpscan_plugins) {
      try {
        const plugins = JSON.parse(analysis.wpscan_plugins);
        if (Array.isArray(plugins) && plugins.length > 0) {
          lines.push(`Plugins Detected: ${plugins.length}`);
          for (const p of plugins.slice(0, 10)) {
            const name = p.name || p.slug || 'Unknown';
            const version = p.version || '?';
            const outdated = p.outdated ? ' [OUTDATED]' : '';
            lines.push(`  - ${name} v${version}${outdated}`);
          }
          if (plugins.length > 10) lines.push(`  ... and ${plugins.length - 10} more`);
        }
      } catch {
        // ignore parse errors
      }
    }

    // Parse users
    if (analysis.wpscan_users) {
      try {
        const users = JSON.parse(analysis.wpscan_users);
        if (Array.isArray(users)) {
          lines.push(`Users Enumerated: ${users.length}`);
        }
      } catch {
        // ignore
      }
    }

    // Config/DB exposure
    if (analysis.wpscan_config_backups) {
      try {
        const configs = JSON.parse(analysis.wpscan_config_backups);
        if (Array.isArray(configs) && configs.length > 0) {
          lines.push(`Config Backups Exposed: ${configs.length}`);
        }
      } catch { /* ignore */ }
    }
    if (analysis.wpscan_db_exports) {
      try {
        const exports = JSON.parse(analysis.wpscan_db_exports);
        if (Array.isArray(exports) && exports.length > 0) {
          lines.push(`DB Exports Exposed: ${exports.length}`);
        }
      } catch { /* ignore */ }
    }
  }

  // Contacts
  lines.push('');
  lines.push('=== CONTACTS ===');
  lines.push(`Email contacts found: ${contactCount}`);

  return lines.join('\n');
}

/**
 * Generate AI report content for a site.
 * Returns executive_summary, recommendations, and pitch.
 */
export async function generateReportContent(siteId: number): Promise<ReportAIContent> {
  const startTime = Date.now();

  // Fetch data
  const site = getSiteById(siteId);
  if (!site) throw new Error(`Site ${siteId} not found`);

  const analysis = getAnalysisBySiteId(siteId);
  if (!analysis) throw new Error(`No analysis found for site ${siteId}`);

  const contactCount = getContactCountBySiteId(siteId);

  // Build context
  const contextString = buildReportContext(site, analysis, contactCount);

  // Get AI config
  const model = getAIModel();
  const prompt = getReportPrompt();

  console.log(`[Report AI] Generating content for site ${siteId} (${site.domain}) using model ${model}`);

  // Call OpenRouter
  const aiResponse = await chatCompletion({
    model,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: contextString },
    ],
    temperature: 0.4,
    jsonMode: true,
    appTitle: 'Vimsy Lead Gen - Report',
  });

  const content = aiResponse.content;

  // Parse JSON response
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Try to extract JSON from the response if it has extra text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error(`Failed to parse AI response as JSON for site ${siteId}: ${content.slice(0, 200)}`);
      }
    } else {
      throw new Error(`Failed to parse AI response as JSON for site ${siteId}: ${content.slice(0, 200)}`);
    }
  }

  // Validate required keys — ensure all values are strings (AI may return arrays for recommendations)
  const ensureString = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val.map(item => typeof item === 'string' ? `- ${item}` : `- ${JSON.stringify(item)}`).join('\n');
    return JSON.stringify(val);
  };

  const result: ReportAIContent = {
    executive_summary: ensureString(parsed.executive_summary),
    recommendations: ensureString(parsed.recommendations),
    pitch: ensureString(parsed.pitch),
  };

  if (!result.executive_summary && !result.recommendations && !result.pitch) {
    throw new Error(`AI returned empty content for all sections for site ${siteId}`);
  }

  const elapsed = Date.now() - startTime;
  console.log(`[Report AI] Generated content for site ${siteId} in ${elapsed}ms`);

  return result;
}
