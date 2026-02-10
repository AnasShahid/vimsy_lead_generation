import type { HunterDomainSearchConfig, HunterDomainSearchResult, HunterEmailResult } from '@vimsy/shared';
import { fetchUrl } from '../../utils/http';

const HUNTER_API_BASE = 'https://api.hunter.io/v2';

// Rate limiting: 15 req/sec, 500 req/min
const MIN_DELAY_MS = 70;  // ~14 req/sec to stay under 15/sec
let lastRequestTime = 0;

async function rateLimitedDelay(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

/**
 * Call Hunter.io Domain Search API to find email addresses for a domain.
 * https://hunter.io/api-documentation/v2#domain-search
 */
export async function hunterDomainSearch(
  config: HunterDomainSearchConfig,
  apiKey: string
): Promise<HunterDomainSearchResult> {
  await rateLimitedDelay();

  const params = new URLSearchParams();
  params.set('api_key', apiKey);
  params.set('domain', config.domain);

  if (config.company) {
    params.set('company', config.company);
  }
  if (config.type) {
    params.set('type', config.type);
  }
  if (config.seniority && config.seniority.length > 0) {
    params.set('seniority', config.seniority.join(','));
  }
  if (config.department && config.department.length > 0) {
    params.set('department', config.department.join(','));
  }
  if (config.required_field) {
    params.set('required_field', config.required_field);
  }
  if (config.limit !== undefined) {
    params.set('limit', String(config.limit));
  }
  if (config.offset !== undefined) {
    params.set('offset', String(config.offset));
  }
  if (config.location) {
    params.set('location', JSON.stringify(config.location));
  }

  const url = `${HUNTER_API_BASE}/domain-search?${params.toString()}`;

  const response = await fetchUrl(url, { timeout: 30000 });

  if (response.statusCode === 401) {
    throw new Error('Invalid Hunter.io API key');
  }
  if (response.statusCode === 429) {
    throw new HunterRateLimitError('Hunter.io rate limit exceeded');
  }
  if (response.statusCode === 422) {
    const errData = JSON.parse(response.body || '{}');
    const errMsg = errData?.errors?.[0]?.details || 'Invalid request parameters';
    throw new Error(`Hunter.io validation error: ${errMsg}`);
  }
  if (response.statusCode !== 200) {
    const errData = JSON.parse(response.body || '{}');
    const errMsg = errData?.errors?.[0]?.details || `Hunter.io API error: ${response.statusCode}`;
    throw new Error(errMsg);
  }

  const data = JSON.parse(response.body);
  const apiData = data?.data || {};
  const emails: HunterEmailResult[] = (apiData.emails || []).map((e: any) => ({
    value: e.value,
    type: e.type || 'personal',
    confidence: e.confidence || 0,
    first_name: e.first_name || null,
    last_name: e.last_name || null,
    position: e.position || null,
    position_raw: e.position_raw || null,
    seniority: e.seniority || null,
    department: e.department || null,
    linkedin: e.linkedin || null,
    twitter: e.twitter || null,
    phone_number: e.phone_number || null,
    verification: e.verification ? {
      date: e.verification.date || null,
      status: e.verification.status || null,
    } : null,
  }));

  return {
    domain: apiData.domain || config.domain,
    organization: apiData.organization || null,
    pattern: apiData.pattern || null,
    emails,
    totalResults: data?.meta?.results || emails.length,
  };
}

export class HunterRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HunterRateLimitError';
  }
}
