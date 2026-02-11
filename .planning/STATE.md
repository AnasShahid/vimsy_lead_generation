# Project State

## Current Position

**Milestone:** v1.0
**Phase:** 3 of 6 (Technical Analysis & Scoring) — COMPLETE
**Plan:** 3 of 3 (All complete)
**Status:** Phase 3 done, ready for Phase 4

**Progress:**
```
████████████████████ 100% (Phase 3)
```

**Last activity:** 2026-02-11 - Fixed WPScan (HTTP-based scanner) + rewrote scoring to match PDF spec

## Session Continuity

**Last session:** 2026-02-11
**Stopped at:** Phase 3 complete + WPScan/scoring fixes applied
**Resume file:** None
**Next action:** Plan and execute Phase 4 (Reporting & Dashboard)

## Decisions

| Decision | Rationale | Date | Phase |
|----------|-----------|------|-------|
| Node.js + Express over Python backend | Full JS stack, simpler monorepo, team familiarity | 2026-02-07 | — |
| SQLite over PostgreSQL | Single-team tool, no multi-user concurrency needs | 2026-02-07 | — |
| CSV as inter-step interface | Steps run independently, easy import/export | 2026-02-07 | — |
| Provider plugin pattern for discovery | Easy to add new sources without modifying core | 2026-02-07 | — |
| Instantly.ai for email sending | Dedicated cold email platform with warmup and deliverability | 2026-02-07 | 5 |
| Auto-qualify + manual review hybrid | Score <40 auto-enters pipeline, 40-75 reviewed by team | 2026-02-07 | 3 |
| Docker-ready from start | Easy deployment to any server | 2026-02-07 | — |
| OpenRouter over direct OpenAI | Single API key for GPT-4o, Gemini, Claude; model stored in DB | 2026-02-09 | 1 |
| Hunter.io Discover over Lead Lists | Discover API finds companies by filters; lead lists only return contacts | 2026-02-09 | 1 |
| Remove Directories provider | Not useful for Vimsy lead gen workflow | 2026-02-09 | 1 |

## Blockers & Concerns

None yet.

## Pending Todos

| Todo | Area | Priority |
|------|------|----------|
| Fix Analysis UI — Score Colors, Priority/Action System, Layout | client/analysis | high |

## Recently Completed Todos

| Todo | Area | Completed |
|------|------|-----------|
| Fix WPScan + Rewrite Scoring System | analysis, scoring | 2026-02-11 |
| Populate emails_available_count from Hunter Discover | discovery | 2026-02-10 |

## Completed Todos

| Todo | Area | Completed |
|------|------|-----------|
| OpenRouter AI Analysis + Settings Screen | ai-analysis, settings | 2026-02-09 |
| Discovery Site Selection & Batch Actions | discovery, ui | 2026-02-09 |
| Rewrite Hunter.io to Discover API with Filters | discovery, hunter | 2026-02-09 |
| Remove Directories Tab | discovery, ui | 2026-02-09 |
| Manual WordPress Analysis on Selected Sites | discovery, wp-detection | 2026-02-09 |
| Hunter.io Lead Import Provider | discovery | 2026-02-07 |
| AI-Analyzed Discovery Output Format | ai-analysis | 2026-02-07 |

## Context Notes

- Discovery providers: manual, hunter (Discover API), builtwith, wappalyzer (directory removed)
- Enrichment: Hunter.io domain-search with seniority/department/type/location filters, background batch jobs
- Contacts table with UNIQUE(site_id, email) deduplication, supports re-enrichment
- Pipeline stages: discovered → enrichment → enriched → analysis → analyzed (tracked via pipeline_stage + enrichment_status + analysis_status)
- Enrichment page: Hunter.io tab (functional) + Snov.io tab (placeholder)
- Enrichment worker with rate limiting (15 req/sec) and 429 retry logic (30s delay, 3 retries)
- Hunter.io tab uses POST /discover with filters: country, industry, headcount, company_type, technology, keywords, year_founded, funding, similar_to
- AI analysis uses OpenRouter (supports OpenAI, Gemini, Claude) with DB-persisted model + prompt
- Settings page at /settings with model dropdown and prompt editor
- Discovery table has checkbox selection with batch: AI Analyze, WP Analyze, Edit, Delete, Move to Enrichment
- WP Analyze runs WordPress detection on selected sites (is_wordpress, version, theme, plugins, SSL, response time)
- fetchPost utility added to http.ts for POST requests (used by Hunter Discover)
- The prototype.html contains the original n8n workflow specification
- Phase 3: Analysis infrastructure (schema, worker, routes), services (PSI, SSL, WPScan, vuln matcher, scoring), and UI (analysis page, detail drill-down, queue filters, tags, settings vuln DB)
- Scoring: Deduction-based (100 - deductions). Performance 30pts, Security 30pts, SEO 20pts, Availability 20pts. Priority: critical (0-40), high (41-60), medium (61-75), low (76-100)
- WPScan: HTTP-based WordPress scanner (version via wp-json/feed/meta/readme, theme/plugin detection, user enumeration, config exposure). Docker WPScan optional fallback when WPSCAN_API_TOKEN set
- Security headers checker (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Availability checker (uptime, response time, sitemap detection, meta description check)
- Vulnerability data from local OWVD SQLite + API fallback
- Analysis worker processes 5 sites in parallel per batch via Promise.allSettled
- Tags system: system-assigned (discovered, enriched, analyzed), stored in site_tags table

---
*Auto-updated by GSD workflows*
