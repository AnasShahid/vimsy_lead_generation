import type { IDiscoveryProvider } from './base';
import type { DiscoveredUrl, ProviderConfig, WappalyzerProviderConfig, ProgressCallback } from '@vimsy/shared';
import { fetchUrl, normalizeUrl } from '../../../utils/http';
import { rateLimiters } from '../../../utils/rate-limiter';

export class WappalyzerProvider implements IDiscoveryProvider {
  name = 'wappalyzer';
  requiresApiKey = true;

  async discover(
    config: ProviderConfig,
    signal: AbortSignal,
    onProgress: ProgressCallback
  ): Promise<DiscoveredUrl[]> {
    const { apiKey, urls } = config as WappalyzerProviderConfig;
    const results: DiscoveredUrl[] = [];

    for (let i = 0; i < urls.length; i++) {
      if (signal.aborted) break;

      const rawUrl = urls[i].trim();
      if (!rawUrl) continue;

      const normalizedUrl = normalizeUrl(rawUrl);

      try {
        await rateLimiters.wappalyzer.acquire();

        // Wappalyzer API v2 endpoint
        const apiUrl = `https://api.wappalyzer.com/v2/lookup/?urls=${encodeURIComponent(normalizedUrl)}`;

        const response = await fetchUrl(apiUrl, {
          timeout: 20000,
        });

        if (response.statusCode === 200) {
          const data = JSON.parse(response.body);

          // Wappalyzer returns an array of results
          const siteResult = Array.isArray(data) ? data[0] : data;

          if (siteResult && siteResult.technologies) {
            const hasWordPress = siteResult.technologies.some(
              (tech: any) => /wordpress/i.test(tech.name || tech.slug || '')
            );

            if (hasWordPress) {
              results.push({
                url: normalizedUrl,
                source: 'wappalyzer',
                metadata: {
                  technologies: siteResult.technologies.map((t: any) => t.name).join(', '),
                },
              });
            }
          }
        } else if (response.statusCode === 429) {
          console.warn('[Wappalyzer] Rate limited, waiting 60s...');
          await new Promise(r => setTimeout(r, 60000));
          i--; // Retry this URL
          continue;
        } else {
          console.warn(`[Wappalyzer] API returned ${response.statusCode} for ${normalizedUrl}`);
        }
      } catch (err: any) {
        console.error(`[Wappalyzer] Error checking ${normalizedUrl}: ${err.message}`);
      }

      onProgress(i + 1, urls.length);
    }

    return results;
  }

  validate(config: ProviderConfig): { valid: boolean; errors: string[] } {
    const { apiKey, urls } = config as WappalyzerProviderConfig;
    const errors: string[] = [];

    if (!apiKey || apiKey.trim().length === 0) {
      errors.push('Wappalyzer API key is required');
    }
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      errors.push('At least one URL is required');
    }
    if (urls && urls.length > 100) {
      errors.push('Maximum 100 URLs per batch (free tier limit)');
    }

    return { valid: errors.length === 0, errors };
  }
}
