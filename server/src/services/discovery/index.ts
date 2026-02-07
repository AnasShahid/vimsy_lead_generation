import type { IDiscoveryProvider } from './providers/base';
import type { DiscoveryProvider } from '@vimsy/shared';
import { ManualProvider } from './providers/manual';
import { DirectoryProvider } from './providers/directory';
import { BuiltWithProvider } from './providers/builtwith';
import { WappalyzerProvider } from './providers/wappalyzer';
import { HunterLeadsProvider } from './providers/hunter-leads';

const providers: Record<DiscoveryProvider, IDiscoveryProvider> = {
  manual: new ManualProvider(),
  directory: new DirectoryProvider(),
  builtwith: new BuiltWithProvider(),
  wappalyzer: new WappalyzerProvider(),
  hunter: new HunterLeadsProvider(),
};

export function getProvider(name: DiscoveryProvider): IDiscoveryProvider | null {
  return providers[name] || null;
}

export function getAllProviders(): IDiscoveryProvider[] {
  return Object.values(providers);
}

export { type IDiscoveryProvider } from './providers/base';
