import type { IDiscoveryProvider } from './base';
import type { DiscoveredUrl, ProviderConfig, ManualProviderConfig, ProgressCallback } from '@vimsy/shared';
import { normalizeUrl } from '../../../utils/http';

export class ManualProvider implements IDiscoveryProvider {
  name = 'manual';
  requiresApiKey = false;

  async discover(
    config: ProviderConfig,
    signal: AbortSignal,
    onProgress: ProgressCallback
  ): Promise<DiscoveredUrl[]> {
    const { urls } = config as ManualProviderConfig;
    const results: DiscoveredUrl[] = [];

    for (let i = 0; i < urls.length; i++) {
      if (signal.aborted) break;

      const raw = urls[i].trim();
      if (!raw) continue;

      const normalized = normalizeUrl(raw);
      results.push({
        url: normalized,
        source: 'manual',
      });

      onProgress(i + 1, urls.length);
    }

    return results;
  }

  validate(config: ProviderConfig): { valid: boolean; errors: string[] } {
    const { urls } = config as ManualProviderConfig;
    const errors: string[] = [];

    if (!urls || !Array.isArray(urls)) {
      errors.push('urls must be an array');
    } else if (urls.length === 0) {
      errors.push('At least one URL is required');
    } else if (urls.length > 500) {
      errors.push('Maximum 500 URLs per batch');
    }

    return { valid: errors.length === 0, errors };
  }
}
