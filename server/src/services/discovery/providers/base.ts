import type { DiscoveredUrl, ProviderConfig, ProgressCallback } from '@vimsy/shared';

export interface IDiscoveryProvider {
  name: string;
  requiresApiKey: boolean;

  /**
   * Discover URLs. These may or may not be WordPress sites —
   * WordPress detection is handled separately by WordPressDetector.
   */
  discover(
    config: ProviderConfig,
    signal: AbortSignal,
    onProgress: ProgressCallback
  ): Promise<DiscoveredUrl[]>;

  /**
   * Validate the provider config before starting a job.
   */
  validate(config: ProviderConfig): { valid: boolean; errors: string[] };
}
