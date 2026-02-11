import { fetchUrl } from '../../utils/http';

export interface AvailabilityResult {
  isUp: boolean;
  responseTimeMs: number;
  statusCode: number;
  hasSitemap: boolean;
  hasMetaDescription: boolean;
  error?: string;
}

export async function checkAvailability(url: string): Promise<AvailabilityResult> {
  let isUp = false;
  let responseTimeMs = 0;
  let statusCode = 0;
  let hasSitemap = false;
  let hasMetaDescription = false;

  // Check main page availability and response time
  try {
    const res = await fetchUrl(url, { timeout: 15000 });
    statusCode = res.statusCode;
    responseTimeMs = res.responseTimeMs;
    isUp = statusCode >= 200 && statusCode < 500;

    // Check for meta description in HTML
    if (isUp && res.body) {
      const metaMatch = res.body.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
      hasMetaDescription = !!metaMatch && metaMatch[1].trim().length > 0;
    }
  } catch (err: any) {
    return {
      isUp: false,
      responseTimeMs: 0,
      statusCode: 0,
      hasSitemap: false,
      hasMetaDescription: false,
      error: `Site unreachable: ${err.message}`,
    };
  }

  // Check for sitemap
  try {
    const sitemapRes = await fetchUrl(`${url.replace(/\/+$/, '')}/sitemap.xml`, { timeout: 10000 });
    hasSitemap = sitemapRes.statusCode === 200 &&
      sitemapRes.body?.includes('<?xml') &&
      sitemapRes.body?.includes('urlset');
  } catch { /* ignore */ }

  // Fallback: check robots.txt for sitemap reference
  if (!hasSitemap) {
    try {
      const robotsRes = await fetchUrl(`${url.replace(/\/+$/, '')}/robots.txt`, { timeout: 10000 });
      if (robotsRes.statusCode === 200 && robotsRes.body) {
        hasSitemap = /sitemap:/i.test(robotsRes.body);
      }
    } catch { /* ignore */ }
  }

  return {
    isUp,
    responseTimeMs,
    statusCode,
    hasSitemap,
    hasMetaDescription,
  };
}
