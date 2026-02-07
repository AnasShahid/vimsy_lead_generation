# Step 1: WordPress Site Discovery

## Goal
Find WordPress websites from multiple sources (manual entry, web scraping, API services) and verify they are running WordPress. Output a standardized CSV that can be fed into Step 2 (Contact Enrichment).

## Inputs
- **Manual**: List of URLs (pasted, typed, or uploaded as CSV)
- **Google Search**: Search query + industry/country filters
- **Directory Scraping**: WordPress directory URLs to scrape
- **BuiltWith API**: API key + technology/country filters
- **Wappalyzer API**: API key + list of URLs to check

## Tools / Scripts
| Tool | Location | Purpose |
|------|----------|---------|
| Express Server | `server/src/index.ts` | Main API server |
| Discovery Routes | `server/src/routes/discovery.ts` | Job creation and management endpoints |
| Sites Routes | `server/src/routes/sites.ts` | Site CRUD and filtering |
| CSV Routes | `server/src/routes/csv.ts` | Import/export CSV |
| WordPress Detector | `server/src/services/wordpress-detector.ts` | Thorough WP detection (6 checks) |
| Manual Provider | `server/src/services/discovery/providers/manual.ts` | Process URL lists |
| Google Search Provider | `server/src/services/discovery/providers/google-search.ts` | Scrape Google results |
| Directory Provider | `server/src/services/discovery/providers/directory.ts` | Scrape WordPress directories |
| BuiltWith Provider | `server/src/services/discovery/providers/builtwith.ts` | BuiltWith API integration |
| Wappalyzer Provider | `server/src/services/discovery/providers/wappalyzer.ts` | Wappalyzer API integration |
| Discovery Worker | `server/src/workers/discovery-worker.ts` | Background job processor |

## Process
1. User selects a discovery method in the dashboard (Discovery page)
2. User submits configuration (URLs, search query, API key, etc.)
3. System creates a background job (status: pending)
4. Worker picks up the job, runs the provider to discover URLs
5. For each URL, WordPress Detector runs 6 thorough checks
6. Results are saved to SQLite `sites` table
7. Dashboard polls for progress updates (every 2s while job active)
8. User can export results as CSV when done

## WordPress Detection Checks (in order)
1. `<meta name="generator" content="WordPress X.X">` tag
2. `wp-content/` and `wp-includes/` paths in HTML source
3. `X-Powered-By` response header
4. `Link` response header containing `wp-json`
5. `/wp-json/` REST API endpoint (only if first checks inconclusive)
6. `/readme.html` file (only if still uncertain)

**Confidence scoring**: 1 check = 50%, 2 checks = 80%, 3+ checks = 95%

## Output
CSV file with these columns:
`url, domain, is_wordpress, wp_version, detected_theme, detected_plugins, discovery_source, discovery_date, country, industry_guess, has_contact_page, contact_page_url, status, http_status_code, ssl_valid, response_time_ms, meta_description, page_title`

## API Endpoints
```
POST   /api/discovery/jobs       # Start discovery job
GET    /api/discovery/jobs       # List all jobs
GET    /api/discovery/jobs/:id   # Job status + progress
DELETE /api/discovery/jobs/:id   # Cancel job
POST   /api/discovery/detect     # One-off WP detection
GET    /api/sites                # List sites (with filters)
GET    /api/sites/:id            # Single site details
DELETE /api/sites/:id            # Remove site
POST   /api/csv/import           # Upload CSV with URLs
GET    /api/csv/export           # Download results as CSV
```

## Edge Cases & Learnings
- **Google Search rate limiting**: Random 2-5s delay between pages, 30s backoff on 429
- **WAF/Cloudflare blocking**: Some sites block automated requests; the detector uses a browser-like User-Agent
- **SSL check**: Uses `rejectUnauthorized: false` for fetching, checks SSL validity separately
- **Duplicate handling**: Sites table has UNIQUE constraint on URL; re-processing a URL updates existing row
- **WP detection false negatives**: Some sites strip generator meta tags; the /wp-json endpoint check catches most of these
- **Large batches**: Manual provider capped at 500 URLs per batch; rate limiter prevents overloading
- **Timeout**: Each URL request has 15s timeout; /wp-json and /readme.html have 8s timeout

## Running Locally
```bash
# From project root:
npm install
npm run dev        # Starts both server (3001) and client (3000)

# Or separately:
npm run dev:server # Express API on port 3001
npm run dev:client # Vite dev server on port 3000 (proxies /api to 3001)
```

## Docker
```bash
docker-compose up --build   # Server on 3001, Client on 3000 (via nginx)
```
