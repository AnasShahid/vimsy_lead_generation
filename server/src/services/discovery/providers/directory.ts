import type { IDiscoveryProvider } from './base';
import type { DiscoveredUrl, ProviderConfig, DirectoryProviderConfig, ProgressCallback } from '@vimsy/shared';
import { fetchUrl, normalizeUrl } from '../../../utils/http';
import { rateLimiters } from '../../../utils/rate-limiter';
import * as cheerio from 'cheerio';

// Known WordPress directories and showcases
const DEFAULT_DIRECTORIES = [
  'https://developer.wordpress.org/showcase/',
  'https://developer.wordpress.org/showcase/page/{page}/',
];

export class DirectoryProvider implements IDiscoveryProvider {
  name = 'directory';
  requiresApiKey = false;

  async discover(
    config: ProviderConfig,
    signal: AbortSignal,
    onProgress: ProgressCallback
  ): Promise<DiscoveredUrl[]> {
    const { directories, maxPages = 5, industry } = config as DirectoryProviderConfig;
    const results: DiscoveredUrl[] = [];
    const seenDomains = new Set<string>();
    const targetDirs = directories.length > 0 ? directories : DEFAULT_DIRECTORIES;

    let totalProcessed = 0;
    const totalExpected = targetDirs.length * maxPages;

    for (const dirUrl of targetDirs) {
      if (signal.aborted) break;

      for (let page = 1; page <= maxPages; page++) {
        if (signal.aborted) break;

        try {
          await rateLimiters.scraping.acquire();

          const pageUrl = dirUrl.includes('{page}')
            ? dirUrl.replace('{page}', String(page))
            : `${dirUrl}${dirUrl.includes('?') ? '&' : '?'}page=${page}`;

          const response = await fetchUrl(pageUrl, { timeout: 15000 });

          if (response.statusCode === 200) {
            const $ = cheerio.load(response.body);

            // Extract all external links that look like website URLs
            $('a[href]').each((_i, el) => {
              const href = $(el).attr('href') || '';
              if (!href.startsWith('http')) return;

              try {
                const parsed = new URL(href);
                const domain = parsed.hostname;

                // Skip the directory domain itself and common non-target domains
                const dirDomain = new URL(dirUrl.replace('{page}', '1')).hostname;
                if (
                  domain === dirDomain ||
                  domain.includes('wordpress.org') ||
                  domain.includes('wordpress.com') ||
                  domain.includes('google.') ||
                  domain.includes('facebook.') ||
                  domain.includes('twitter.') ||
                  seenDomains.has(domain)
                ) {
                  return;
                }

                seenDomains.add(domain);
                results.push({
                  url: normalizeUrl(href),
                  source: 'directory',
                  metadata: {
                    directory: dirUrl,
                    industry,
                  },
                });
              } catch {
                // Invalid URL, skip
              }
            });
          } else if (response.statusCode === 404) {
            // No more pages
            break;
          }
        } catch (err: any) {
          console.error(`[Directory] Error scraping ${dirUrl} page ${page}: ${err.message}`);
        }

        totalProcessed++;
        onProgress(totalProcessed, totalExpected);

        // Polite delay
        const delay = 1500 + Math.random() * 1500;
        await new Promise(r => setTimeout(r, delay));
      }
    }

    return results;
  }

  validate(config: ProviderConfig): { valid: boolean; errors: string[] } {
    const { directories, maxPages } = config as DirectoryProviderConfig;
    const errors: string[] = [];

    if (!directories || !Array.isArray(directories)) {
      errors.push('directories must be an array');
    }
    if (maxPages !== undefined && (maxPages < 1 || maxPages > 20)) {
      errors.push('maxPages must be between 1 and 20');
    }

    return { valid: errors.length === 0, errors };
  }
}
