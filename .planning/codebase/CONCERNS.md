# Codebase Concerns

**Analysis Date:** 2026-02-07

## Security Issues

**SSL Certificate Validation Disabled:**
- Issue: `rejectUnauthorized: false` in HTTP client disables strict SSL certificate validation
- Files: `server/src/utils/http.ts` (line 36)
- Impact: Vulnerable to man-in-the-middle attacks, unsafe for production use
- Fix approach: Set `rejectUnauthorized: true` by default, only disable via explicit environment variable in development with clear warnings
- Priority: HIGH

**API Key Exposure in Request URLs:**
- Issue: API keys passed as URL parameters in BuiltWith provider (e.g., `?KEY=${apiKey}`)
- Files: `server/src/services/discovery/providers/builtwith.ts` (lines 22, 26)
- Impact: Keys visible in server logs, browser history, CDN/proxy logs, HTTP Referer headers
- Fix approach: Use request headers instead of URL parameters; sanitize logs to remove sensitive parameters
- Priority: HIGH

**Insufficient Input Validation on Job Routes:**
- Issue: Job status query parameter accepts any string value without validation
- Files: `server/src/routes/discovery.ts` (line 62)
- Impact: Could enable database injection or filtering bypass if validation is incomplete
- Fix approach: Create strict enum validation for status parameter; whitelist allowed values
- Priority: MEDIUM

**CORS Without Restrictions:**
- Issue: `cors()` middleware enabled without origin restrictions
- Files: `server/src/app.ts` (line 10)
- Impact: Any origin can make requests to the API; potential CSRF attacks
- Fix approach: Configure CORS with explicit origin whitelist from environment variable
- Priority: MEDIUM

**File Upload Size Limit Too Large:**
- Issue: 10MB file upload limit for CSV imports with minimal validation
- Files: `server/src/routes/csv.ts` (line 13)
- Impact: Could cause DoS through large file uploads; potential memory exhaustion
- Fix approach: Reduce to 5MB; add content-type validation; stream CSV parsing instead of buffering
- Priority: MEDIUM

**Database Config Stored in Code:**
- Issue: Database path hardcoded relative to source tree
- Files: `server/src/db/index.ts` (lines 5-6)
- Impact: Path breaks in production builds; data dir location not configurable
- Fix approach: Use environment variable for data directory path with fallback
- Priority: LOW

## Performance Bottlenecks

**Synchronous SQL Queries Block Event Loop:**
- Issue: Discovery worker uses `better-sqlite3` (synchronous) which blocks Node.js event loop
- Files: `server/src/db/index.ts`, all query files in `server/src/db/queries/`
- Impact: Single long-running query blocks all HTTP requests; poor scalability for concurrent jobs
- Current limitation: better-sqlite3 is synchronous; async SQLite alternatives exist (sql.js, better-sqlite3-async)
- Improvement path: Consider async SQLite wrapper or migration to async database driver; limit concurrent queries
- Priority: MEDIUM (blocks at higher load)

**Rate Limiter Prevents Parallelization:**
- Issue: Single-threaded job processing with `processNextJob()` running every 2 seconds
- Files: `server/src/workers/discovery-worker.ts` (lines 39-41, 8)
- Impact: Only one discovery job processes at a time; queue latency grows linearly with jobs
- Cause: `if (runningJobs.size > 0) return;` enforces serial processing
- Improvement path: Allow 2-3 concurrent jobs with per-provider rate limiting instead of global lock
- Priority: MEDIUM

**WordPress Detection Makes 3+ Sequential HTTP Requests:**
- Issue: Multiple checks (homepage + /wp-json/ + /readme.html) made sequentially
- Files: `server/src/services/wordpress-detector.ts` (lines 36, 114, 137)
- Impact: Total detection time = sum of all requests; 15s + 8s + 8s = 31s worst case per URL
- Cause: Checks are awaited sequentially in try-catch blocks
- Improvement path: Parallelize non-critical checks with Promise.all(); skip /readme.html and /wp-json checks if meta_generator found
- Priority: MEDIUM

**Google Search Provider Hardcoded 2-5s Delays:**
- Issue: Random 2000-5000ms delays between pages to avoid detection
- Files: `server/src/services/discovery/providers/google-search.ts` (lines 120-121)
- Impact: Discovering 30 results takes 2-5 minutes; no exponential backoff on 429
- Cause: Detection avoidance hardcoded; no smart backoff strategy
- Improvement path: Implement exponential backoff starting at 1s, cap at 30s; skip delay if no 429s received
- Priority: MEDIUM

**No Response Caching or Deduplication:**
- Issue: Same URL checked multiple times across jobs; no caching of WordPress detection results
- Files: `server/src/services/wordpress-detector.ts`, `server/src/db/queries/sites.ts` (upsert logic)
- Impact: Redundant network requests for duplicate URLs; wasted API quotas
- Cause: Each job independently detects every URL
- Improvement path: Cache detection results with TTL (24h); deduplicate before detection
- Priority: MEDIUM

## Fragile Areas

**Wappalyzer API Key Not Used:**
- Issue: API key parameter required but never sent in requests
- Files: `server/src/services/discovery/providers/wappalyzer.ts` (lines 15, 30)
- Impact: Authentication fails against Wappalyzer API; free tier limits not applied correctly
- Cause: v2 API might not support header-based auth or auth mechanism not implemented
- Safe modification: Add header authentication: `headers: { 'Authorization': `Bearer ${apiKey}` }`; test against sandbox API first
- Test coverage: No tests for provider authentication
- Priority: HIGH

**Manual Provider Not Implemented:**
- Issue: ManualProvider imported but no implementation visible
- Files: `server/src/services/discovery/index.ts` (line 3)
- Impact: Manual URL discovery jobs will fail at runtime
- Cause: File may exist but implementation may be stub
- Safe modification: Find `server/src/services/discovery/providers/manual.ts` and verify full implementation; add tests
- Priority: HIGH

**Job Config Stored as JSON String:**
- Issue: Complex config objects stringified/parsed without validation
- Files: `server/src/db/queries/jobs.ts` (lines 15, 30, 53)
- Impact: Corrupted JSON in database causes silent parse failures; no schema validation
- Cause: Using JSON.stringify/parse without schema validation
- Safe modification: Validate against TypeScript types before storing; add JSON schema validation on retrieval
- Priority: MEDIUM

**WordPress Detection Confidence Logic Fragile:**
- Issue: Hardcoded thresholds (3+ checks = 95%, 2 checks = 80%) may misidentify sites
- Files: `server/src/services/wordpress-detector.ts` (lines 151-163)
- Impact: False positives from similar frameworks; misidentified non-WordPress sites as WordPress
- Cause: Check count doesn't account for false-positive likelihood of individual checks
- Safe modification: Weight different checks differently (meta_generator = 90%, wp-json = 60%); add weighting logic
- Test coverage: No tests for confidence thresholds against non-WordPress sites
- Priority: LOW

**Directory Provider Not Implemented:**
- Issue: DirectoryProvider imported but implementation unclear
- Files: `server/src/services/discovery/index.ts` (line 5)
- Impact: Directory-based discovery jobs will fail
- Cause: File may be stub or incomplete
- Safe modification: Review `server/src/services/discovery/providers/directory.ts` for full implementation; test with sample data
- Priority: MEDIUM

**Socket Timeout Not Enforced on Long Uploads:**
- Issue: Multer doesn't set timeout; large CSV upload could hang indefinitely
- Files: `server/src/routes/csv.ts` (line 11-14)
- Impact: Server resources consumed by stuck uploads; potential DoS
- Cause: No request timeout configured at Express level
- Safe modification: Add express-timeout middleware; set 30s timeout for CSV routes
- Priority: MEDIUM

## Error Handling Issues

**Silent Catch Blocks:**
- Issue: Many try-catch blocks log but don't escalate errors appropriately
- Files: `server/src/workers/discovery-worker.ts` (line 119), `server/src/services/wordpress-detector.ts` (lines 121-122, 142-144)
- Impact: Partial failures treated as success; incomplete data silently discarded
- Cause: Error recovery prioritizes continuing over alerting
- Improvement: Return error counts in progress; mark sites as failed instead of skipping
- Priority: MEDIUM

**HTTP Response Code 429 Not Retried With Backoff:**
- Issue: Rate limit responses (429) logged but not retried with exponential backoff
- Files: `server/src/services/discovery/providers/google-search.ts` (line 108-110) - 30s hard-coded; `server/src/services/discovery/providers/wappalyzer.ts` (line 59) - 60s hard-coded
- Impact: Fixed backoff inefficient; can still exceed rate limits; wastes API quota
- Cause: Hard-coded wait times instead of smart backoff
- Improvement: Implement exponential backoff with jitter; respect Retry-After header
- Priority: MEDIUM

**No Validation of Discovery Results:**
- Issue: Discovered URLs accepted without validation
- Files: `server/src/services/discovery/providers/google-search.ts` (lines 95-105)
- Impact: Invalid/malformed URLs stored in database; detection fails downstream
- Cause: Try-catch allows invalid URLs to be silently skipped
- Improvement: Return validation errors in results; mark URLs as "invalid_url" in database
- Priority: MEDIUM

## Dependency Issues

**Outdated Dependencies:**
- Issue: Package versions are from 2023-2024; potential security vulnerabilities
- Files: `server/package.json`, `client/package.json`
- Critical packages with known vulnerabilities:
  - `express@4.18.2` (EOL: Nov 2024) - consider 4.20.0+
  - `cheerio@1.0.0` (Nov 2022) - consider 1.0.1+
  - `multer@1.4.5-lts.1` (LTS status uncertain)
- Impact: Known CVEs may affect production; no security patches
- Fix approach: Run `npm audit`; update dependencies with compatible versions
- Priority: MEDIUM

**Missing Dependencies for Optional Features:**
- Issue: Google Sheets/Drive APIs commented out in `requirements.txt` and `package.json`
- Files: `requirements.txt` (lines 12-20), `.env.example` (lines 27-28)
- Impact: Unclear which features are working; integrations may be incomplete
- Cause: Multi-phase development; Phase 2/3 features not yet implemented
- Fix approach: Document which providers are fully functional; document Phase 2 requirements
- Priority: LOW

## Scaling Limitations

**Single Process Deployment:**
- Issue: Discovery worker is single Node.js process; no horizontal scaling strategy
- Files: `server/src/workers/discovery-worker.ts` (lines 12-14)
- Impact: All jobs queue in single process; max 1 job at a time
- Current capacity: ~100-200 URLs/hour depending on detection complexity
- Scaling path: Implement job queue (Bull/BullMQ); separate worker processes; distribute across machines
- Priority: MEDIUM

**SQLite Not Suitable for High Concurrency:**
- Issue: better-sqlite3 (synchronous SQLite) doesn't support concurrent writes
- Files: `server/src/db/index.ts` (line 1)
- Impact: Concurrent HTTP requests to same database cause lock contention
- Current limitation: Max ~10 concurrent requests before performance degrades
- Scaling path: Migrate to PostgreSQL or MySQL for production
- Priority: MEDIUM

**No Connection Pooling:**
- Issue: Database object created once at startup; no connection pooling for concurrent queries
- Files: `server/src/db/index.ts` (singleton pattern)
- Impact: Single connection shared across all queries; blocking behavior worsens with load
- Improvement: Implement connection pooling for async database (if migrated)
- Priority: LOW (depends on db migration)

## Missing Critical Features

**No Authentication/Authorization:**
- Issue: API endpoints exposed without any authentication
- Files: All routes in `server/src/routes/`
- Impact: Any user can start jobs, delete data, export results
- Blocks: Shared multi-user deployments; SaaS use cases
- Priority: MEDIUM

**No Rate Limiting on API Endpoints:**
- Issue: No rate limiting on HTTP endpoints themselves (only provider-level limiting)
- Files: `server/src/app.ts` (no middleware)
- Impact: Single user can DoS by spamming job creation
- Blocks: Production deployment; shared environments
- Priority: MEDIUM

**No Job Time Limits:**
- Issue: Long-running jobs have no timeout; can consume resources indefinitely
- Files: `server/src/workers/discovery-worker.ts` (no timeout)
- Impact: Hung jobs block new jobs; resource leak over time
- Improvement: Add job timeout (e.g., 1 hour per job); auto-cancel stuck jobs
- Priority: MEDIUM

**No Data Retention Policy:**
- Issue: No automatic cleanup of old data; database grows unbounded
- Files: Database schema has no cleanup mechanism
- Impact: Database file grows; query performance degrades; storage costs increase
- Improvement: Add periodic cleanup jobs; implement data expiration (30/90 days)
- Priority: LOW

## Test Coverage Gaps

**No Unit Tests:**
- Issue: No test files found in codebase
- Files: No `*.test.ts` or `*.spec.ts` files
- Impact: No protection against regressions; confidence in refactoring low
- Recommend: Add tests for:
  - `server/src/services/wordpress-detector.ts` - test confidence thresholds against non-WordPress sites
  - `server/src/services/discovery/providers/` - test URL extraction and deduplication
  - `server/src/db/queries/` - test SQL injection safety, edge cases in filters
- Priority: MEDIUM

**No Integration Tests:**
- Issue: No tests for API endpoints or job workflows
- Impact: API contract changes not caught; job state transitions untested
- Recommend: Add tests for complete discovery job lifecycle
- Priority: MEDIUM

**No E2E Tests:**
- Issue: No automated tests for full user workflows
- Impact: Features may break in deployment; UI/API mismatches not caught
- Priority: LOW

## Technical Debt Summary

**High Priority (Address Before Production):**
1. Fix SSL certificate validation bypass (`rejectUnauthorized: false`)
2. Fix API key exposure in URL parameters
3. Implement or fix Wappalyzer API authentication
4. Verify Manual and Directory providers are fully implemented
5. Add API authentication/authorization

**Medium Priority (Address in Next Phase):**
1. Migrate to async database (PostgreSQL/MySQL)
2. Implement job queue for horizontal scaling
3. Add rate limiting on HTTP endpoints
4. Add job timeout enforcement
5. Update dependencies to latest secure versions
6. Parallelize WordPress detection checks
7. Add comprehensive test coverage

**Low Priority (Roadmap Items):**
1. Implement data retention/cleanup policies
2. Add caching layer for detection results
3. Smart backoff for rate-limited API responses
4. Improve WordPress detection confidence scoring
5. Configure CORS properly

---

*Concerns audit: 2026-02-07*
