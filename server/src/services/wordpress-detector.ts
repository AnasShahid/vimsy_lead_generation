import * as cheerio from 'cheerio';
import type { WPDetectionResult } from '@vimsy/shared';
import { fetchUrl, normalizeUrl } from '../utils/http';
import { rateLimiters } from '../utils/rate-limiter';

export async function detectWordPress(rawUrl: string): Promise<WPDetectionResult> {
  const url = normalizeUrl(rawUrl);
  const result: WPDetectionResult = {
    url,
    is_wordpress: false,
    confidence: 0,
    wp_version: null,
    detected_theme: null,
    detected_plugins: [],
    checks: {
      meta_generator: false,
      wp_content_paths: false,
      wp_json_endpoint: false,
      readme_html: false,
      x_powered_by: false,
      link_header: false,
    },
    page_title: null,
    meta_description: null,
    has_contact_page: false,
    contact_page_url: null,
    http_status_code: null,
    ssl_valid: null,
    response_time_ms: null,
  };

  try {
    await rateLimiters.wpDetection.acquire();

    // 1. Fetch the homepage
    const response = await fetchUrl(url);
    result.http_status_code = response.statusCode;
    result.ssl_valid = response.sslValid;
    result.response_time_ms = response.responseTimeMs;

    if (response.statusCode >= 400) {
      result.is_wordpress = false;
      return result;
    }

    const $ = cheerio.load(response.body);

    // Extract basic page info
    result.page_title = $('title').text().trim() || null;
    result.meta_description = $('meta[name="description"]').attr('content')?.trim() || null;

    // Check 1: Meta generator tag
    const generator = $('meta[name="generator"]').attr('content') || '';
    if (/wordpress/i.test(generator)) {
      result.checks.meta_generator = true;
      const versionMatch = generator.match(/WordPress\s+([\d.]+)/i);
      if (versionMatch) {
        result.wp_version = versionMatch[1];
      }
    }

    // Check 2: wp-content and wp-includes paths in HTML
    const html = response.body;
    if (/wp-content\//i.test(html) || /wp-includes\//i.test(html)) {
      result.checks.wp_content_paths = true;
    }

    // Check 3: X-Powered-By header
    const poweredBy = response.headers['x-powered-by'];
    if (poweredBy && /wordpress/i.test(String(poweredBy))) {
      result.checks.x_powered_by = true;
    }

    // Check 4: Link header with wp-json
    const linkHeader = response.headers['link'];
    if (linkHeader && /wp-json/i.test(String(linkHeader))) {
      result.checks.link_header = true;
    }

    // Theme detection from wp-content/themes/
    const themeMatches = html.match(/wp-content\/themes\/([a-zA-Z0-9_-]+)/gi);
    if (themeMatches) {
      const themes = new Set(themeMatches.map(m => m.replace(/.*wp-content\/themes\//i, '')));
      result.detected_theme = Array.from(themes)[0] || null;
    }

    // Plugin detection from wp-content/plugins/
    const pluginMatches = html.match(/wp-content\/plugins\/([a-zA-Z0-9_-]+)/gi);
    if (pluginMatches) {
      const plugins = new Set(pluginMatches.map(m => m.replace(/.*wp-content\/plugins\//i, '')));
      result.detected_plugins = Array.from(plugins);
    }

    // Contact page detection
    const contactLinks = $('a[href*="contact"]');
    if (contactLinks.length > 0) {
      result.has_contact_page = true;
      const contactHref = contactLinks.first().attr('href');
      if (contactHref) {
        try {
          result.contact_page_url = new URL(contactHref, url).href;
        } catch {
          result.contact_page_url = contactHref;
        }
      }
    }

    // Check 5: /wp-json/ endpoint (only if we haven't confirmed yet)
    const confirmedSoFar = Object.values(result.checks).filter(Boolean).length;
    if (confirmedSoFar < 2) {
      try {
        await rateLimiters.wpDetection.acquire();
        const wpJsonUrl = url.replace(/\/$/, '') + '/wp-json/';
        const wpJsonResponse = await fetchUrl(wpJsonUrl, { timeout: 8000 });
        if (wpJsonResponse.statusCode === 200) {
          try {
            const json = JSON.parse(wpJsonResponse.body);
            if (json.name || json.namespaces || json.routes) {
              result.checks.wp_json_endpoint = true;
            }
          } catch {
            // Not valid JSON, not WP
          }
        }
      } catch {
        // Endpoint doesn't exist or error
      }
    } else {
      result.checks.wp_json_endpoint = false;
    }

    // Check 6: /readme.html (only if still uncertain)
    const confirmedNow = Object.values(result.checks).filter(Boolean).length;
    if (confirmedNow < 2) {
      try {
        await rateLimiters.wpDetection.acquire();
        const readmeUrl = url.replace(/\/$/, '') + '/readme.html';
        const readmeResponse = await fetchUrl(readmeUrl, { timeout: 8000 });
        if (readmeResponse.statusCode === 200 && /wordpress/i.test(readmeResponse.body)) {
          result.checks.readme_html = true;
        }
      } catch {
        // Endpoint doesn't exist or error
      }
    }

    // Calculate confidence based on checks passed
    const passedChecks = Object.values(result.checks).filter(Boolean).length;
    const totalChecks = Object.keys(result.checks).length;

    if (passedChecks >= 3) {
      result.confidence = 95;
      result.is_wordpress = true;
    } else if (passedChecks === 2) {
      result.confidence = 80;
      result.is_wordpress = true;
    } else if (passedChecks === 1) {
      result.confidence = 50;
      result.is_wordpress = true;
    } else {
      result.confidence = 0;
      result.is_wordpress = false;
    }

  } catch (err: any) {
    result.http_status_code = 0;
    result.is_wordpress = false;
    result.confidence = 0;
  }

  return result;
}
