import { fetchUrl } from '../../utils/http';

export interface AvailabilityResult {
  isUp: boolean;
  responseTimeMs: number;
  statusCode: number;
  hasSitemap: boolean;
  hasMetaDescription: boolean;
  error?: string;
}

function detectAntiBot(
  statusCode: number,
  body: string,
  headers: Record<string, string | string[] | undefined>
): boolean {
  // Cloudflare challenge page (403 or 503 with challenge)
  if ((statusCode === 403 || statusCode === 503) && body) {
    const cfPatterns = [
      'cf-browser-verification',
      'cf_chl_opt',
      'challenge-platform',
      'Checking if the site connection is secure',
      'Enable JavaScript and cookies to continue',
      'Attention Required! | Cloudflare',
      'Just a moment...',
    ];
    for (const pattern of cfPatterns) {
      if (body.includes(pattern)) return true;
    }
  }

  // Generic CAPTCHA / bot detection
  if (body) {
    const botPatterns = [
      'captcha',
      'recaptcha',
      'hCaptcha',
      'Please verify you are a human',
      'Access denied',
      'bot detection',
      'are you a robot',
    ];
    const bodyLower = body.toLowerCase();
    // Only flag as anti-bot if the page is very short (challenge page, not a real page mentioning captcha)
    if (body.length < 50000) {
      for (const pattern of botPatterns) {
        if (bodyLower.includes(pattern.toLowerCase()) && statusCode >= 400) return true;
      }
    }
  }

  // Cloudflare cf-mitigated header
  if (headers['cf-mitigated'] === 'challenge') return true;

  return false;
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

    // Detect anti-bot protection (Cloudflare challenge, CAPTCHA, etc.)
    const isAntiBot = detectAntiBot(res.statusCode, res.body, res.headers);
    if (isAntiBot) {
      // Site is technically up but blocking our scanner
      return {
        isUp: true,
        responseTimeMs,
        statusCode,
        hasSitemap: false,
        hasMetaDescription: false,
        error: 'Blocked by anti-bot protection (Cloudflare/CAPTCHA)',
      };
    }

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
