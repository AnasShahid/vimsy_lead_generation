import type { IDiscoveryProvider } from './base';
import type { DiscoveredUrl, ProviderConfig, HunterDiscoverProviderConfig, HunterDiscoverFilters, ProgressCallback } from '@vimsy/shared';
import { fetchPost, normalizeUrl } from '../../../utils/http';

const HUNTER_API_BASE = 'https://api.hunter.io/v2';

/**
 * Build the JSON body for the Hunter.io Discover API from our filter config.
 * Only includes non-empty filters.
 */
function buildDiscoverBody(filters: HunterDiscoverFilters): Record<string, any> {
  const body: Record<string, any> = {};

  if (filters.query) {
    body.query = filters.query;
  }

  if (filters.similar_to && filters.similar_to.length > 0) {
    body.organization = { domain: filters.similar_to };
  }

  if (filters.headquarters_location) {
    const loc: Record<string, any> = {};
    if (filters.headquarters_location.include && filters.headquarters_location.include.length > 0) {
      loc.include = filters.headquarters_location.include;
    }
    if (filters.headquarters_location.exclude && filters.headquarters_location.exclude.length > 0) {
      loc.exclude = filters.headquarters_location.exclude;
    }
    if (Object.keys(loc).length > 0) {
      body.headquarters_location = loc;
    }
  }

  if (filters.industry) {
    const ind: Record<string, any> = {};
    if (filters.industry.include && filters.industry.include.length > 0) {
      ind.include = filters.industry.include;
    }
    if (filters.industry.exclude && filters.industry.exclude.length > 0) {
      ind.exclude = filters.industry.exclude;
    }
    if (Object.keys(ind).length > 0) {
      body.industry = ind;
    }
  }

  if (filters.headcount && filters.headcount.length > 0) {
    body.headcount = filters.headcount;
  }

  if (filters.company_type) {
    const ct: Record<string, any> = {};
    if (filters.company_type.include && filters.company_type.include.length > 0) {
      ct.include = filters.company_type.include;
    }
    if (filters.company_type.exclude && filters.company_type.exclude.length > 0) {
      ct.exclude = filters.company_type.exclude;
    }
    if (Object.keys(ct).length > 0) {
      body.company_type = ct;
    }
  }

  if (filters.year_founded) {
    const yf: Record<string, any> = {};
    if (filters.year_founded.from) yf.from = filters.year_founded.from;
    if (filters.year_founded.to) yf.to = filters.year_founded.to;
    if (Object.keys(yf).length > 0) {
      body.year_founded = yf;
    }
  }

  if (filters.keywords) {
    const kw: Record<string, any> = {};
    if (filters.keywords.include && filters.keywords.include.length > 0) kw.include = filters.keywords.include;
    if (filters.keywords.exclude && filters.keywords.exclude.length > 0) kw.exclude = filters.keywords.exclude;
    if (filters.keywords.match) kw.match = filters.keywords.match;
    if (Object.keys(kw).length > 0) {
      body.keywords = kw;
    }
  }

  if (filters.technology) {
    const tech: Record<string, any> = {};
    if (filters.technology.include && filters.technology.include.length > 0) tech.include = filters.technology.include;
    if (filters.technology.exclude && filters.technology.exclude.length > 0) tech.exclude = filters.technology.exclude;
    if (filters.technology.match) tech.match = filters.technology.match;
    if (Object.keys(tech).length > 0) {
      body.technology = tech;
    }
  }

  if (filters.funding) {
    const fund: Record<string, any> = {};
    if (filters.funding.series && filters.funding.series.length > 0) fund.series = filters.funding.series;
    if (filters.funding.amount) {
      const amt: Record<string, any> = {};
      if (filters.funding.amount.from) amt.from = filters.funding.amount.from;
      if (filters.funding.amount.to) amt.to = filters.funding.amount.to;
      if (Object.keys(amt).length > 0) fund.amount = amt;
    }
    if (filters.funding.date) {
      const dt: Record<string, any> = {};
      if (filters.funding.date.from) dt.from = filters.funding.date.from;
      if (filters.funding.date.to) dt.to = filters.funding.date.to;
      if (Object.keys(dt).length > 0) fund.date = dt;
    }
    if (Object.keys(fund).length > 0) {
      body.funding = fund;
    }
  }

  return body;
}

export class HunterDiscoverProvider implements IDiscoveryProvider {
  name = 'hunter';
  requiresApiKey = true;

  async discover(
    config: ProviderConfig,
    signal: AbortSignal,
    onProgress: ProgressCallback
  ): Promise<DiscoveredUrl[]> {
    const { apiKey, filters, page = 1, limit = 100 } = config as HunterDiscoverProviderConfig;
    const results: DiscoveredUrl[] = [];
    const seenDomains = new Set<string>();

    const offset = (page - 1) * limit;
    const body = buildDiscoverBody(filters);

    if (Object.keys(body).length === 0) {
      throw new Error('At least one filter or query is required for Hunter.io Discover');
    }

    const url = `${HUNTER_API_BASE}/discover?api_key=${encodeURIComponent(apiKey)}&limit=${limit}&offset=${offset}`;

    if (signal.aborted) return results;

    try {
      const response = await fetchPost(url, JSON.stringify(body), { timeout: 30000 });

      if (response.statusCode === 401) {
        throw new Error('Invalid Hunter.io API key');
      }
      if (response.statusCode === 429) {
        throw new Error('Hunter.io rate limit exceeded. Please wait and try again.');
      }
      if (response.statusCode !== 200) {
        const errData = JSON.parse(response.body || '{}');
        const errMsg = errData?.errors?.[0]?.details || `Hunter.io API error: ${response.statusCode}`;
        throw new Error(errMsg);
      }

      const data = JSON.parse(response.body);
      const companies = data?.data || [];
      const totalResults = data?.meta?.results || companies.length;

      for (const company of companies) {
        if (signal.aborted) break;

        const domain = company.domain;
        if (!domain) continue;

        const siteUrl = normalizeUrl(domain);
        if (siteUrl && !seenDomains.has(siteUrl)) {
          seenDomains.add(siteUrl);
          results.push({
            url: siteUrl,
            source: 'hunter',
            metadata: {
              company_name: company.organization || null,
              emails_total: company.emails_count?.total || 0,
              emails_personal: company.emails_count?.personal || 0,
              emails_generic: company.emails_count?.generic || 0,
              hunter_discover_total: totalResults,
            },
          });
        }
      }

      onProgress(results.length, totalResults);
    } catch (err: any) {
      if (err.message.includes('Invalid Hunter.io') || err.message.includes('rate limit')) {
        throw err;
      }
      console.error(`[Hunter Discover] Error: ${err.message}`);
      throw err;
    }

    return results;
  }

  validate(config: ProviderConfig): { valid: boolean; errors: string[] } {
    const { apiKey, filters } = config as HunterDiscoverProviderConfig;
    const errors: string[] = [];

    if (!apiKey || apiKey.trim().length === 0) {
      errors.push('Hunter.io API key is required');
    }

    if (!filters || typeof filters !== 'object') {
      errors.push('Filters are required');
      return { valid: false, errors };
    }

    // Must have at least one filter or query
    const hasFilter = filters.query ||
      (filters.similar_to && filters.similar_to.length > 0) ||
      (filters.headquarters_location?.include && filters.headquarters_location.include.length > 0) ||
      (filters.industry?.include && filters.industry.include.length > 0) ||
      (filters.headcount && filters.headcount.length > 0) ||
      (filters.company_type?.include && filters.company_type.include.length > 0) ||
      (filters.year_founded?.from || filters.year_founded?.to) ||
      (filters.keywords?.include && filters.keywords.include.length > 0) ||
      (filters.technology?.include && filters.technology.include.length > 0) ||
      (filters.funding?.series && filters.funding.series.length > 0);

    if (!hasFilter) {
      errors.push('At least one filter or search query is required');
    }

    return { valid: errors.length === 0, errors };
  }
}
