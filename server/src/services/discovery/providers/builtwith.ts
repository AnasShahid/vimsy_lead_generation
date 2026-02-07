import type { IDiscoveryProvider } from './base';
import type { DiscoveredUrl, ProviderConfig, BuiltWithProviderConfig, ProgressCallback } from '@vimsy/shared';
import { fetchUrl, normalizeUrl } from '../../../utils/http';
import { rateLimiters } from '../../../utils/rate-limiter';

export class BuiltWithProvider implements IDiscoveryProvider {
  name = 'builtwith';
  requiresApiKey = true;

  async discover(
    config: ProviderConfig,
    signal: AbortSignal,
    onProgress: ProgressCallback
  ): Promise<DiscoveredUrl[]> {
    const { apiKey, technology = 'WordPress', country, maxResults = 100 } = config as BuiltWithProviderConfig;
    const results: DiscoveredUrl[] = [];

    try {
      await rateLimiters.builtwith.acquire();

      // BuiltWith Free API endpoint for technology lookup
      let apiUrl = `https://api.builtwith.com/free1/api.json?KEY=${encodeURIComponent(apiKey)}&TECH=${encodeURIComponent(technology)}`;

      // BuiltWith also has a lists API for larger datasets
      // https://api.builtwith.com/lists7/api.json?KEY=...&TECH=WordPress&COUNTRY=us
      const listsUrl = `https://api.builtwith.com/lists7/api.json?KEY=${encodeURIComponent(apiKey)}&TECH=${encodeURIComponent(technology)}`;
      if (country) {
        apiUrl += `&COUNTRY=${encodeURIComponent(country)}`;
      }

      const response = await fetchUrl(listsUrl, { timeout: 30000 });
      onProgress(1, 2);

      if (signal.aborted) return results;

      if (response.statusCode === 200) {
        const data = JSON.parse(response.body);

        // BuiltWith lists API returns { Results: [{ Domain, ... }] }
        const domains = data.Results || data.Paths || [];
        const limit = Math.min(domains.length, maxResults);

        for (let i = 0; i < limit; i++) {
          if (signal.aborted) break;

          const entry = domains[i];
          const domain = entry.Domain || entry.domain || entry;

          if (typeof domain === 'string' && domain.length > 0) {
            results.push({
              url: normalizeUrl(`https://${domain}`),
              source: 'builtwith',
              metadata: {
                technology,
                country,
              },
            });
          }
        }
      } else {
        throw new Error(`BuiltWith API returned ${response.statusCode}: ${response.body.substring(0, 200)}`);
      }

      onProgress(2, 2);
    } catch (err: any) {
      console.error(`[BuiltWith] API error: ${err.message}`);
      throw err;
    }

    return results;
  }

  validate(config: ProviderConfig): { valid: boolean; errors: string[] } {
    const { apiKey, maxResults } = config as BuiltWithProviderConfig;
    const errors: string[] = [];

    if (!apiKey || apiKey.trim().length === 0) {
      errors.push('BuiltWith API key is required');
    }
    if (maxResults !== undefined && (maxResults < 1 || maxResults > 10000)) {
      errors.push('maxResults must be between 1 and 10000');
    }

    return { valid: errors.length === 0, errors };
  }
}
