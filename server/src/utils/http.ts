import https from 'https';
import http from 'http';
import { URL } from 'url';

export interface HttpResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
  responseTimeMs: number;
  sslValid: boolean;
}

export async function fetchUrl(
  url: string,
  options: { timeout?: number; followRedirects?: boolean; maxRedirects?: number } = {}
): Promise<HttpResponse> {
  const { timeout = 15000, followRedirects = true, maxRedirects = 5 } = options;

  return new Promise((resolve, reject) => {
    const start = Date.now();

    function doRequest(currentUrl: string, redirectCount: number) {
      const parsed = new URL(currentUrl);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      const req = client.get(
        currentUrl,
        {
          timeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; VimsyBot/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          rejectUnauthorized: false, // We'll check SSL separately
        },
        (res) => {
          // Handle redirects
          if (
            followRedirects &&
            res.statusCode &&
            [301, 302, 303, 307, 308].includes(res.statusCode) &&
            res.headers.location &&
            redirectCount < maxRedirects
          ) {
            const redirectUrl = new URL(res.headers.location, currentUrl).href;
            doRequest(redirectUrl, redirectCount + 1);
            return;
          }

          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const responseTimeMs = Date.now() - start;
            const body = Buffer.concat(chunks).toString('utf-8');

            // Check SSL validity by making a strict request
            let sslValid = false;
            if (isHttps) {
              const tlsSocket = (res.socket as any);
              sslValid = tlsSocket?.authorized !== false;
            }

            resolve({
              statusCode: res.statusCode || 0,
              headers: res.headers as Record<string, string | string[] | undefined>,
              body,
              responseTimeMs,
              sslValid,
            });
          });
        }
      );

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timed out after ${timeout}ms`));
      });
    }

    doRequest(url, 0);
  });
}

export async function fetchPost(
  url: string,
  body: string,
  options: { timeout?: number; headers?: Record<string, string> } = {}
): Promise<HttpResponse> {
  const { timeout = 30000, headers: extraHeaders = {} } = options;

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqOptions = {
      method: 'POST',
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'Mozilla/5.0 (compatible; VimsyBot/1.0)',
        ...extraHeaders,
      },
    };

    const req = client.request(reqOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const responseTimeMs = Date.now() - start;
        const responseBody = Buffer.concat(chunks).toString('utf-8');

        let sslValid = false;
        if (isHttps) {
          const tlsSocket = (res.socket as any);
          sslValid = tlsSocket?.authorized !== false;
        }

        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers as Record<string, string | string[] | undefined>,
          body: responseBody,
          responseTimeMs,
          sslValid,
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out after ${timeout}ms`));
    });

    req.write(body);
    req.end();
  });
}

export function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url.match(/^https?:\/\//i)) {
    url = 'https://' + url;
  }
  try {
    const parsed = new URL(url);
    // Remove trailing slash for consistency
    return parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname);
  } catch {
    return url;
  }
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0];
  }
}
