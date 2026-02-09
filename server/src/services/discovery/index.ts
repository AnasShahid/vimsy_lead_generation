import type { IDiscoveryProvider } from './providers/base';
import type { DiscoveryProvider } from '@vimsy/shared';
import { ManualProvider } from './providers/manual';
import { BuiltWithProvider } from './providers/builtwith';
import { WappalyzerProvider } from './providers/wappalyzer';
import { HunterDiscoverProvider } from './providers/hunter-discover';

const providers: Record<DiscoveryProvider, IDiscoveryProvider> = {
  manual: new ManualProvider(),
  builtwith: new BuiltWithProvider(),
  wappalyzer: new WappalyzerProvider(),
  hunter: new HunterDiscoverProvider(),
};

export function getProvider(name: DiscoveryProvider): IDiscoveryProvider | null {
  return providers[name] || null;
}

export function getAllProviders(): IDiscoveryProvider[] {
  return Object.values(providers);
}

export { type IDiscoveryProvider } from './providers/base';
