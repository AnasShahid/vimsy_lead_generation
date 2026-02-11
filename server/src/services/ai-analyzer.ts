import { getSiteById, upsertSite } from '../db/queries/sites';
import { getAIModel, getAIPrompt } from '../db/queries/settings';
import type { Site, LeadPriority, ProgressCallback } from '@vimsy/shared';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 120_000;

function buildSiteContext(site: Site): string {
  const parts = [
    `Domain: ${site.domain}`,
    site.page_title ? `Title: ${site.page_title}` : null,
    site.meta_description ? `Description: ${site.meta_description}` : null,
    site.is_wordpress ? `WordPress: Yes (v${site.wp_version || 'unknown'})` : 'WordPress: No',
    site.detected_theme ? `Theme: ${site.detected_theme}` : null,
    site.detected_plugins ? `Plugins: ${site.detected_plugins}` : null,
    site.has_contact_page ? 'Has contact page: Yes' : null,
    site.country ? `Country: ${site.country}` : null,
  ];
  return parts.filter(Boolean).join('\n');
}

function getOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required for AI analysis');
  }
  return apiKey;
}

/**
 * Infer country from domain TLD.
 */
export function inferCountryFromDomain(domain: string): string | null {
  if (domain.endsWith('.com.au') || domain.endsWith('.au')) return 'AU';
  if (domain.endsWith('.co.uk') || domain.endsWith('.uk')) return 'UK';
  if (domain.endsWith('.co.nz') || domain.endsWith('.nz')) return 'NZ';
  if (domain.endsWith('.ca')) return 'CA';
  if (domain.endsWith('.com') || domain.endsWith('.org') || domain.endsWith('.net')) return 'US';
  return null;
}

/**
 * Analyze a batch of sites using OpenAI.
 */
export async function analyzeSites(
  siteIds: number[],
  onProgress?: ProgressCallback
): Promise<void> {
  const apiKey = getOpenRouterApiKey();
  const model = getAIModel();
  const prompt = getAIPrompt();
  const BATCH_SIZE = 5;

  for (let i = 0; i < siteIds.length; i += BATCH_SIZE) {
    const batchIds = siteIds.slice(i, i + BATCH_SIZE);
    const sites: Site[] = [];

    for (const id of batchIds) {
      const site = getSiteById(id);
      if (site) sites.push(site);
    }

    if (sites.length === 0) continue;

    const userMessage = sites
      .map((s, idx) => `--- Site ${idx + 1} (id: ${s.id}) ---\n${buildSiteContext(s)}`)
      .join('\n\n');

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://vimsy.com',
          'X-Title': 'Vimsy Lead Gen',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
          stream: false,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const err: any = new Error(`OpenRouter API error ${response.status}: ${errorBody.slice(0, 300)}`);
        err.statusCode = response.status;
        throw err;
      }

      const data: any = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        console.warn('[AI] Empty response for batch starting at index', i);
        continue;
      }

      let results: any[];
      try {
        const parsed = JSON.parse(content);
        results = Array.isArray(parsed) ? parsed : parsed.sites || parsed.results || [parsed];
      } catch {
        console.error('[AI] Failed to parse JSON response:', content.slice(0, 200));
        continue;
      }

      for (let j = 0; j < sites.length && j < results.length; j++) {
        const site = sites[j];
        const result = results[j];

        const priority = (['hot', 'warm', 'cold'].includes(result.priority)
          ? result.priority
          : 'cold') as LeadPriority;

        try {
          upsertSite({
            url: site.url,
            domain: site.domain,
            company_name: result.company_name || null,
            industry_segment: result.industry_segment || null,
            ai_fit_reasoning: result.ai_fit_reasoning || null,
            priority,
            country: result.country || site.country || inferCountryFromDomain(site.domain),
          });
        } catch (err: any) {
          console.error(`[AI] Failed to update site ${site.id}: ${err.message}`);
        }
      }
    } catch (err: any) {
      const statusCode = err.statusCode || err.status;
      if (statusCode === 429) {
        console.warn('[AI] Rate limited, waiting 30s...');
        await new Promise(r => setTimeout(r, 30000));
        i -= BATCH_SIZE; // retry this batch
        continue;
      }
      console.error(`[AI] API error for batch at index ${i}: ${err.message}`);
    }

    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, siteIds.length), siteIds.length);
    }

    // Small delay between batches
    if (i + BATCH_SIZE < siteIds.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

/**
 * Analyze a single site.
 */
export async function analyzeSingleSite(siteId: number): Promise<void> {
  await analyzeSites([siteId]);
}
