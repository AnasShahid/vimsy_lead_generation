import { fetchUrl } from '../../utils/http';

export interface SecurityHeadersResult {
  hasStrictTransportSecurity: boolean;
  hasContentSecurityPolicy: boolean;
  hasXFrameOptions: boolean;
  hasXContentTypeOptions: boolean;
  hasReferrerPolicy: boolean;
  hasPermissionsPolicy: boolean;
  missingHeaders: string[];
  presentHeaders: string[];
  score: number; // 0-100 based on headers present
  rawHeaders: Record<string, string | string[] | undefined>;
  error?: string;
}

const SECURITY_HEADERS = [
  { name: 'strict-transport-security', label: 'Strict-Transport-Security (HSTS)', weight: 20 },
  { name: 'content-security-policy', label: 'Content-Security-Policy', weight: 20 },
  { name: 'x-frame-options', label: 'X-Frame-Options', weight: 15 },
  { name: 'x-content-type-options', label: 'X-Content-Type-Options', weight: 15 },
  { name: 'referrer-policy', label: 'Referrer-Policy', weight: 15 },
  { name: 'permissions-policy', label: 'Permissions-Policy', weight: 15 },
];

export async function checkSecurityHeaders(url: string): Promise<SecurityHeadersResult> {
  try {
    const res = await fetchUrl(url, { timeout: 15000 });

    const headers = res.headers;
    const missingHeaders: string[] = [];
    const presentHeaders: string[] = [];
    let score = 0;

    const headerLookup = (name: string): boolean => {
      return headers[name] !== undefined && headers[name] !== null;
    };

    for (const header of SECURITY_HEADERS) {
      if (headerLookup(header.name)) {
        presentHeaders.push(header.label);
        score += header.weight;
      } else {
        missingHeaders.push(header.label);
      }
    }

    return {
      hasStrictTransportSecurity: headerLookup('strict-transport-security'),
      hasContentSecurityPolicy: headerLookup('content-security-policy'),
      hasXFrameOptions: headerLookup('x-frame-options'),
      hasXContentTypeOptions: headerLookup('x-content-type-options'),
      hasReferrerPolicy: headerLookup('referrer-policy'),
      hasPermissionsPolicy: headerLookup('permissions-policy'),
      missingHeaders,
      presentHeaders,
      score,
      rawHeaders: headers,
    };
  } catch (err: any) {
    return {
      hasStrictTransportSecurity: false,
      hasContentSecurityPolicy: false,
      hasXFrameOptions: false,
      hasXContentTypeOptions: false,
      hasReferrerPolicy: false,
      hasPermissionsPolicy: false,
      missingHeaders: SECURITY_HEADERS.map(h => h.label),
      presentHeaders: [],
      score: 0,
      rawHeaders: {},
      error: `Security headers check failed: ${err.message}`,
    };
  }
}
