# Phase 3: Technical Analysis & Scoring — Context

**Captured:** 2026-02-11

## Vision

Users select/bulk-select sites from the enrichment table, hit "Analyze", and sites move into a new Analysis tab in the pipeline. A background job is scheduled that runs analyses in parallel (up to 5 concurrent). Each site gets a composite 0-100 health score with detailed breakdowns across security, performance, and WordPress health — all stored in the database for later PDF report generation.

## User Experience

- Bulk select sites from enrichment table → "Analyze" action
- Sites move to Analysis page/tab (new pipeline step after Enrichment)
- Background job with progress tracking (consistent with existing enrichment UX)
- Analysis results page shows breakdown cards with optional drill-down per site
- All analysis parameters stored in DB (feeds into Phase 4 PDF reports)
- Users can re-analyze a site at any time to recheck issues
- Filter by system-assigned tags across all views

## Essentials

Things that MUST be true:

- **Composite 0-100 health score** from all analysis dimensions
- **Scoring weights:** Security 40%, Performance 30%, WordPress Health 30%
- **Priority classification** based on score:
  - Score <40 → Auto-qualify for outreach (Critical/High)
  - Score 40-75 → Manual review queue (Medium)
  - Score >75 → No auto-disqualification; stays in system (Low priority)
- **No auto-disqualification** — all leads remain in the system regardless of score
- **All analysis data persisted** in database for report generation
- **System-assigned tags** across the pipeline: discovered → enriched → analyzed → (future: reported, contacted, etc.)
- Tags filterable in all UI views
- **Parallel processing** — 5 concurrent analyses per batch
- **Re-analysis** capability — user can re-run analysis on any site

## Boundaries

Things to explicitly AVOID:

- No paid API dependencies for core analysis (WPScan API token NOT required)
- No auto-disqualification of leads
- No reliance on external SSL APIs — use Node.js `tls` module
- No WPScan vulnerability DB API token dependency — use local vulnerability database instead

## Implementation Notes

### PageSpeed Insights (Performance)
- Google PSI API (free tier): 25,000 requests/day, 240 requests/minute
- `GOOGLE_API_KEY` already in `.env.example`
- Full Lighthouse scores: performance, accessibility, SEO, best practices
- User will configure the API key

### SSL/TLS Analysis (Security)
- Node.js `tls` module — no external API
- Detect: expired certificates, protocol versions, certificate chain issues, cipher strength
- Standard SSL health checks per industry norms

### WordPress Vulnerability Scanning
- **Dockerized WPScan** (`wpscanteam/wpscan`) added to `docker-compose.yml`
- WPScan runs WITHOUT API token — detects WP version, themes, plugins, config backups, users
- JSON output format (`--format json`) for structured parsing
- Enumeration: vulnerable plugins (vp), vulnerable themes (vt), config backups, DB exports, users
- Default enumeration mode: mixed (balance of speed and thoroughness)

### Vulnerability Database (Local Matching)
- **Primary:** Download OWVD SQLite database (ihuzaifashoukat/wordpress-vulnerability-database)
  - 27,000+ vulnerabilities, MIT licensed, sourced from Wordfence
  - Schema: software_slug, affected_versions, cvss_score, cvss_rating, patched_status, remediation
  - Stored locally, queried during analysis by matching plugin/theme slug + version
- **Settings page:** "Update Vulnerability Database" button to re-download latest OWVD SQLite file
- **Fallback:** If plugin not found locally, query Wordfence Intelligence API or WPVulnerability API (both free, no key)
  - Wordfence: `GET /api/v1/vulnerabilities/slug/{slug}`
  - WPVulnerability: `GET https://www.wpvulnerability.net/plugin/{slug}/`
- **Result:** Unlimited scans, offline-capable matching, user-controlled updates, rich CVSS data

### Scoring Model
- **Security (40%):** SSL issues, vulnerable plugins/themes, outdated WP core, config exposure
- **Performance (30%):** PageSpeed performance score, accessibility, SEO, best practices
- **WordPress Health (30%):** Outdated version, plugin count, theme issues, detected vulnerabilities
- Composite score = weighted average, mapped to 0-100

### Tags System
- System-assigned, unified across pipeline: `discovered` → `enriched` → `analyzed` → (future phases)
- Multiple tags per site (a site can be both `enriched` and `analyzed`)
- Filterable in all UI views
- Supplements/replaces current `pipeline_stage` field

### Infrastructure
- WPScan Docker container in `docker-compose.yml` — spins up with the application
- Concurrency: 5 parallel analyses per batch
- Background job queue with progress tracking (consistent with enrichment worker pattern)

## Open Questions

Things to decide during planning:

- Exact sub-score breakdowns within each category (e.g., how much weight for expired SSL vs weak cipher within the 40% security bucket)
- WPScan enumeration depth: passive vs mixed vs aggressive — default mixed, but configurable?
- OWVD update frequency recommendation (weekly? monthly? on-demand only?)
- How to handle non-WordPress sites in the analysis pipeline (skip WPScan, still run PSI + SSL)
- Database schema design for storing all analysis dimensions

---
*This context informs planning. The planner will honor these preferences.*
