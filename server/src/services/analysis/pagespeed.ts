import { fetchUrl } from '../../utils/http';

export interface PageSpeedResult {
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
  rawData: Record<string, unknown>;
  error?: string;
}

const PSI_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const MIN_DELAY_MS = 250;
let lastRequestTime = 0;

async function rateLimitedDelay(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export async function analyzePageSpeed(url: string): Promise<PageSpeedResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return {
      performance: 0,
      accessibility: 0,
      seo: 0,
      bestPractices: 0,
      rawData: {},
      error: 'GOOGLE_API_KEY not configured',
    };
  }

  await rateLimitedDelay();

  const params = new URLSearchParams({
    url,
    key: apiKey,
    strategy: 'mobile',
    category: 'performance',
  });
  // PSI API requires separate category params
  params.append('category', 'accessibility');
  params.append('category', 'best-practices');
  params.append('category', 'seo');

  const requestUrl = `${PSI_API_URL}?${params.toString()}`;

  try {
    const response = await fetchUrl(requestUrl, { timeout: 60000 });

    if (response.statusCode === 429) {
      return {
        performance: 0,
        accessibility: 0,
        seo: 0,
        bestPractices: 0,
        rawData: {},
        error: 'PageSpeed Insights rate limit exceeded',
      };
    }

    if (response.statusCode === 400) {
      const errData = JSON.parse(response.body || '{}');
      const errMsg = errData?.error?.message || 'Invalid URL or request';
      return {
        performance: 0,
        accessibility: 0,
        seo: 0,
        bestPractices: 0,
        rawData: {},
        error: `PSI error: ${errMsg}`,
      };
    }

    if (response.statusCode !== 200) {
      return {
        performance: 0,
        accessibility: 0,
        seo: 0,
        bestPractices: 0,
        rawData: {},
        error: `PSI API returned status ${response.statusCode}`,
      };
    }

    const data = JSON.parse(response.body);
    const categories = data?.lighthouseResult?.categories || {};

    const performance = Math.round((categories?.performance?.score ?? 0) * 100);
    const accessibility = Math.round((categories?.accessibility?.score ?? 0) * 100);
    const seo = Math.round((categories?.seo?.score ?? 0) * 100);
    const bestPractices = Math.round((categories?.['best-practices']?.score ?? 0) * 100);

    return {
      performance,
      accessibility,
      seo,
      bestPractices,
      rawData: data,
    };
  } catch (err: any) {
    return {
      performance: 0,
      accessibility: 0,
      seo: 0,
      bestPractices: 0,
      rawData: {},
      error: `PSI request failed: ${err.message}`,
    };
  }
}
