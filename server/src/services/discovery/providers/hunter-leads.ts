import type { IDiscoveryProvider } from './base';
import type { DiscoveredUrl, ProviderConfig, HunterLeadsProviderConfig, ProgressCallback } from '@vimsy/shared';
import { fetchUrl, normalizeUrl } from '../../../utils/http';

const HUNTER_API_BASE = 'https://api.hunter.io/v2';
const PAGE_SIZE = 100;

export class HunterLeadsProvider implements IDiscoveryProvider {
  name = 'hunter';
  requiresApiKey = true;

  async discover(
    config: ProviderConfig,
    signal: AbortSignal,
    onProgress: ProgressCallback
  ): Promise<DiscoveredUrl[]> {
    const { apiKey, listId } = config as HunterLeadsProviderConfig;
    const results: DiscoveredUrl[] = [];
    const seenDomains = new Set<string>();

    let offset = 0;
    let totalLeads = 0;
    let fetched = 0;

    // Paginate through all leads in the list
    while (true) {
      if (signal.aborted) break;

      const url = `${HUNTER_API_BASE}/leads_lists/${listId}/leads?api_key=${encodeURIComponent(apiKey)}&limit=${PAGE_SIZE}&offset=${offset}`;

      try {
        const response = await fetchUrl(url, { timeout: 30000 });

        if (response.statusCode === 401) {
          throw new Error('Invalid Hunter.io API key');
        }
        if (response.statusCode === 404) {
          throw new Error(`Lead list ${listId} not found`);
        }
        if (response.statusCode === 429) {
          console.warn('[Hunter] Rate limited, waiting 10s...');
          await new Promise(r => setTimeout(r, 10000));
          continue;
        }
        if (response.statusCode !== 200) {
          throw new Error(`Hunter.io API error: ${response.statusCode}`);
        }

        const data = JSON.parse(response.body);
        const leads = data?.data?.leads || [];
        totalLeads = data?.meta?.total || leads.length;

        if (leads.length === 0) break;

        for (const lead of leads) {
          if (signal.aborted) break;

          // Extract domain from lead data
          const domain = lead.company_domain || lead.domain;
          const websiteUrl = lead.website_url;
          const companyName = lead.company || lead.first_name + ' ' + lead.last_name;

          let siteUrl: string | null = null;

          if (websiteUrl) {
            siteUrl = normalizeUrl(websiteUrl);
          } else if (domain) {
            siteUrl = normalizeUrl(domain);
          }

          if (siteUrl && !seenDomains.has(siteUrl)) {
            seenDomains.add(siteUrl);
            results.push({
              url: siteUrl,
              source: 'hunter',
              metadata: {
                company_name: companyName || null,
                hunter_lead_id: lead.id,
                email: lead.email || null,
              },
            });
          }

          fetched++;
        }

        onProgress(fetched, totalLeads);
        offset += PAGE_SIZE;

        if (offset >= totalLeads) break;

        // Small delay between pages
        await new Promise(r => setTimeout(r, 500));
      } catch (err: any) {
        if (err.message.includes('Invalid Hunter.io') || err.message.includes('not found')) {
          throw err;
        }
        console.error(`[Hunter] Error fetching leads at offset ${offset}: ${err.message}`);
        break;
      }
    }

    return results;
  }

  validate(config: ProviderConfig): { valid: boolean; errors: string[] } {
    const { apiKey, listId } = config as HunterLeadsProviderConfig;
    const errors: string[] = [];

    if (!apiKey || apiKey.trim().length === 0) {
      errors.push('Hunter.io API key is required');
    }
    if (!listId || listId <= 0) {
      errors.push('A valid lead list must be selected');
    }

    return { valid: errors.length === 0, errors };
  }
}

/**
 * Fetch available lead lists from Hunter.io (used by the UI dropdown).
 * Called directly from the route, not through the provider interface.
 */
export async function fetchHunterLeadLists(apiKey: string): Promise<{ id: number; name: string; leads_count: number }[]> {
  const url = `${HUNTER_API_BASE}/leads_lists?api_key=${encodeURIComponent(apiKey)}`;
  const response = await fetchUrl(url, { timeout: 15000 });

  if (response.statusCode === 401) {
    throw new Error('Invalid Hunter.io API key');
  }
  if (response.statusCode !== 200) {
    throw new Error(`Hunter.io API error: ${response.statusCode}`);
  }

  const data = JSON.parse(response.body);
  const lists = data?.data?.leads_lists || [];

  return lists.map((list: any) => ({
    id: list.id,
    name: list.name,
    leads_count: list.leads_count || 0,
  }));
}
