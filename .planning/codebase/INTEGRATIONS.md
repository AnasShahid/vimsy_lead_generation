# External Integrations

**Analysis Date:** 2026-02-07

## APIs & External Services

**Technology Discovery APIs:**
- **BuiltWith** - Technology detection and domain discovery
  - SDK/Client: HTTP client (built-in Node.js/fetch)
  - Auth: `BUILTWITH_API_KEY` environment variable
  - Endpoint: `https://api.builtwith.com/lists7/api.json`
  - Provider: `server/src/services/discovery/providers/builtwith.ts`
  - Rate limiting: Custom rate limiter in `server/src/utils/rate-limiter.ts`

- **Wappalyzer** - Technology stack detection
  - SDK/Client: HTTP client
  - Auth: `WAPPALYZER_API_KEY` environment variable
  - Endpoint: `https://api.wappalyzer.com/v2/lookup/`
  - Provider: `server/src/services/discovery/providers/wappalyzer.ts`
  - Max batch size: 100 URLs (free tier limit)
  - Rate limiting: Implemented with 60s backoff on 429 responses

**Search & Web Data:**
- **Google Search** - Lead discovery via search results scraping
  - SDK/Client: HTTP client + Cheerio HTML parser
  - Auth: No API key required (organic search results)
  - Endpoint: `https://www.google.com/search` (with query parameters)
  - Provider: `server/src/services/discovery/providers/google-search.ts`
  - Features: Parses Google search results, extracts URLs, filters domains
  - Rate limiting: Random 2-5s delays between requests, 30s backoff on 429

**Optional/Planned Integrations (Not Currently Used):**
- **Hunter.io** - Contact enrichment
  - Auth: `HUNTER_API_KEY` environment variable
  - Status: Listed in `.env.example` but not implemented in codebase

- **Clearbit** - Company data enrichment
  - Auth: `CLEARBIT_API_KEY` environment variable
  - Status: Listed in `.env.example` but not implemented in codebase

- **Google PageSpeed Insights** - Performance metrics
  - Auth: `GOOGLE_API_KEY` environment variable
  - Status: Listed in `.env.example` but not implemented in codebase

- **Google APIs (Sheets/Drive)** - Cloud spreadsheet integration
  - Auth: `GOOGLE_APPLICATION_CREDENTIALS` (credentials.json path)
  - Client: google-api-python-client (Python only, commented in requirements.txt)
  - Status: Infrastructure configured but no implementation in codebase

- **OpenAI API** - AI/LLM integration
  - Auth: API key via environment
  - Client: openai package (commented in requirements.txt)
  - Status: Not integrated

- **Anthropic API** - AI/LLM integration
  - Auth: API key via environment
  - Client: anthropic package (commented in requirements.txt)
  - Status: Not integrated

## Data Storage

**Databases:**
- **SQLite** (better-sqlite3)
  - Connection: `data/vimsy.db` (local filesystem)
  - Client: better-sqlite3 11.7.0
  - Features: WAL mode, foreign key constraints
  - Persistence: Docker volume `./data:/app/data`

**File Storage:**
- **Local filesystem only** - No cloud storage integrations
- CSV uploads handled via multer: `server/src/routes/csv.ts`
- Files temporarily stored in memory or temp directory (multipart handler)

**Caching:**
- None - No Redis, Memcached, or other caching layer

## Authentication & Identity

**Auth Provider:**
- Custom/None for API endpoints
- Basic job/site management (no user authentication in code)

**OAuth Support (Configured but Not Implemented):**
- Google OAuth for potential Sheets/Drive integration
- Credentials: `credentials.json` (placeholder path in `.env.example`)
- Status: Configured in `.env` but no actual implementation in codebase

## Monitoring & Observability

**Error Tracking:**
- None configured
- No Sentry, LogRocket, or similar integration

**Logs:**
- Console logging via `console.log()`, `console.warn()`, `console.error()`
- Prefixed messages: `[DB]`, `[Worker]`, `[Server]`, `[Wappalyzer]`, etc.
- Standard Node.js stdout/stderr capture

**Health Checks:**
- Docker healthcheck: `GET /api/health` endpoint
- Returns: `{ status: 'ok', timestamp: ISO-string }`
- Location: `server/src/app.ts`

## CI/CD & Deployment

**Hosting:**
- Docker Compose (local/self-hosted)
- No cloud provider integrations (AWS, GCP, Azure, Heroku, etc.)

**CI Pipeline:**
- None configured
- No GitHub Actions, GitLab CI, Jenkins, etc.

**Deployment Strategy:**
- Docker multi-stage builds
- Server: Node.js Alpine image → runs `server/dist/index.js`
- Client: Nginx Alpine image → serves static `client/dist`

## Environment Configuration

**Required env vars:**
- `PORT` - Server port (default 3001)
- `NODE_ENV` - Environment (development/production)

**API Keys (Optional but Used):**
- `BUILTWITH_API_KEY` - BuiltWith technology discovery
- `WAPPALYZER_API_KEY` - Wappalyzer detection
- `HUNTER_API_KEY` - Contact enrichment (planned)
- `CLEARBIT_API_KEY` - Company data (planned)
- `GOOGLE_API_KEY` - PageSpeed Insights (planned)
- `GOOGLE_APPLICATION_CREDENTIALS` - Google OAuth credentials file path

**Secrets location:**
- `.env` file (not committed, copied to container at runtime)
- Template: `.env.example` (safe to commit)

## Webhooks & Callbacks

**Incoming:**
- None configured
- No webhook endpoints defined

**Outgoing:**
- None configured
- No outbound webhook triggers

## HTTP Utilities & Client Details

**HTTP Client:**
- Custom HTTP abstraction: `server/src/utils/http.ts`
- Uses Node.js built-in `http`/`https` modules
- Features:
  - Automatic protocol detection (http/https)
  - Timeout handling (15-30 seconds per request)
  - User-Agent customization
  - Response body parsing (JSON/text)

**Rate Limiting:**
- Custom rate limiter: `server/src/utils/rate-limiter.ts`
- Implements per-provider rate limits:
  - BuiltWith: Specific limits per API tier
  - Wappalyzer: Per-batch limits
  - Scraping (Google): Adaptive delays 2-5s between requests
- Backoff strategy: Exponential waits on 429 (Too Many Requests)

## CORS Configuration

**Cross-Origin Handling:**
- CORS middleware enabled: `cors` package
- Configuration: `server/src/app.ts` - default open policy
- Client proxy for dev: `client/vite.config.ts` proxies `/api/*` to `http://localhost:3001`

## Data Pipeline

**Discovery Providers:**
Location: `server/src/services/discovery/providers/`
- Manual (direct URL input)
- Google Search (web scraping)
- Directory (directory scraping)
- BuiltWith (API)
- Wappalyzer (API)

**Detection Services:**
- WordPress Detection: `server/src/services/wordpress-detector.ts`
- Checks multiple indicators: meta tags, WP JSON endpoints, theme/plugin detection

---

*Integration audit: 2026-02-07*
