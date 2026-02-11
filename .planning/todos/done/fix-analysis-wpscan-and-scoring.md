# Todo: Fix Analysis — WPScan Not Working & Adjust Scoring System

**Created:** 2026-02-11
**Area:** analysis, scoring
**Priority:** high

## Description

Two issues with the Analysis system need fixing:

### Issue 1: WPScan Docker Container Not Working
WPScan v3.8.28 aborts with `HTTP Error: https://wpscan.com/api/v3/status?version=3.8.28 (status: 401)` before scanning. The tool phones home to validate its API status and refuses to scan without a valid token. This causes WP health score to always return a constant `50` (the NEUTRAL_SCORE fallback).

**Root cause:** WPScan v3.8.28 requires a valid API token even for basic scanning. Without it, the scan aborts before any enumeration.

**Fix approach:** Replace Docker-based WPScan with a custom HTTP-based WordPress scanner that:
- Fetches `/readme.html`, `/wp-json/wp/v2`, `/feed/` to detect WP version
- Checks `/wp-content/themes/` and `/wp-content/plugins/` for theme/plugin detection
- Checks security headers
- Keeps WPScan as optional fallback when `WPSCAN_API_TOKEN` is set

### Issue 2: Scoring System Doesn't Match Spec
Current scoring uses Security 40%, Performance 30%, WP Health 30% weights. The spec from `vimsy_highlevel_plan.pdf` page 13 defines:

- **Performance (30pts):** Lighthouse <50 = -30pts, 50-80 = -15pts, >80 = full
- **Security (30pts):** No SSL = -30pts, Outdated WP (>2 versions) = -15pts, Missing security headers = -10pts, SSL grade below B = -5pts
- **SEO (20pts):** SEO score <70 = -20pts, Missing meta descriptions = -5pts, No sitemap = -5pts
- **Availability (20pts):** Site down = -20pts, Slow response >5s = -10pts
- Priority: 0-40 Critical, 41-60 High, 61-75 Medium, 76-100 Low

## Context

- User tested with electricbikereport.com and photofocus.com
- Docker container `vimsy-wpscan` is running but scan aborts
- Scoring spec from vimsy_highlevel_plan.pdf page 13

## Related Files

- `server/src/services/analysis/wpscan.ts` — WPScan service (needs replacement/fix)
- `server/src/services/analysis/scoring.ts` — Scoring engine (needs rewrite to match spec)
- `server/src/services/analysis/index.ts` — Orchestrator (needs to add security headers + availability checks)
- `server/src/services/analysis/pagespeed.ts` — PSI service (already provides performance + SEO scores)
- `server/src/services/analysis/ssl-analyzer.ts` — SSL service (already provides SSL data)
- `docker-compose.yml` — WPScan container definition
- `.env.example` — WPSCAN_API_TOKEN env var

## Notes

- The PDF scoring is a deduction-based system (start at 100, deduct points)
- Need to add: security headers check, sitemap check, availability/response time check
- WPScan can remain as optional enhancement when API token is available
