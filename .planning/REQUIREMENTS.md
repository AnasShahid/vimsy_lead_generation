# Requirements

## v1 — Lead Generation Pipeline

### Discovery (Step 1) — Partially Built

- **REQ-001** — Discover WordPress sites via manual URL entry ✅ *existing*
- **REQ-002** — Discover WordPress sites via CSV import/export ✅ *existing*
- **REQ-003** — Discover WordPress sites via BuiltWith API ✅ *existing*
- **REQ-004** — Discover WordPress sites via Wappalyzer API ✅ *existing*
- **REQ-005** — Thorough WordPress detection (meta tags, wp-json, wp-content, readme.html, headers) ✅ *existing*
- **REQ-006** — Background job queue with progress tracking and cancellation ✅ *existing*
- **REQ-007** — Dashboard with pipeline step navigation ✅ *existing*
- **REQ-008** — Site results table with filtering, sorting, pagination ✅ *existing*
- **REQ-009** — Standardized CSV output format between pipeline steps ✅ *existing*
- **REQ-010** — SQLite database for persistence ✅ *existing*
- **REQ-011** — Docker-ready deployment ✅ *existing*
- **REQ-012** — Remove Google Search provider (unreliable) and add Hunter.io lead list import provider
- **REQ-013** — AI-analyzed discovery output matching vimsy_cold_outreach_leads format (industry, fit reasoning, priority)
- **REQ-014** — Upload pre-analyzed Excel/CSV in enriched format and import into discovery database
- **REQ-015** — Geographic filtering for English-speaking markets (AU, US, UK, NZ, CA)

### Enrichment (Step 2)

- **REQ-016** — Contact data enrichment via Hunter.io (find emails for discovered domains)
- **REQ-017** — Contact data enrichment via Clearbit (company info, decision-maker contacts)

### Analysis (Step 3)

- **REQ-018** — Technical site analysis with 0-100 health scoring
- **REQ-019** — PageSpeed Insights / Lighthouse integration for performance metrics
- **REQ-020** — SSL/TLS security analysis
- **REQ-021** — WordPress version and vulnerability detection
- **REQ-022** — Priority classification (Critical/High/Medium/Low) based on health score
- **REQ-023** — Auto-qualify sites with score <40 for outreach
- **REQ-024** — Manual review queue for medium-scored sites (40-75)

### Reports (Step 4)

- **REQ-025** — Branded 7-page PDF report generation showing site problems and recommendations

### Outreach (Step 5)

- **REQ-026** — Cold email 4-sequence outreach (Day 0, 3, 7, 14)
- **REQ-027** — Instantly.ai or similar cold email platform integration
- **REQ-028** — Email template management with personalization tokens
- **REQ-029** — Response tracking and conversion monitoring

### Dashboard & Tracking

- **REQ-030** — Pipeline dashboard with stats and conversion metrics across all steps

## v2 — Future Enhancements

- Advanced analytics and A/B testing for email templates
- Multi-user role-based access
- Automated scheduling of discovery runs
- CRM integration (HubSpot, Pipedrive)
- Webhook notifications for pipeline events

## Out of Scope

- Multi-tenant SaaS for other agencies
- Real-time chat or live support features
- Payment processing
- Mobile app
- AI-generated email content (templates are pre-written and proven)

## Traceability

| Requirement | Phase | Plan | Status |
|-------------|-------|------|--------|
| REQ-001 | — | — | ✅ Done |
| REQ-002 | — | — | ✅ Done |
| REQ-003 | — | — | ✅ Done |
| REQ-004 | — | — | ✅ Done |
| REQ-005 | — | — | ✅ Done |
| REQ-006 | — | — | ✅ Done |
| REQ-007 | — | — | ✅ Done |
| REQ-008 | — | — | ✅ Done |
| REQ-009 | — | — | ✅ Done |
| REQ-010 | — | — | ✅ Done |
| REQ-011 | — | — | ✅ Done |
| REQ-012 | 1 | 01-01 | Pending |
| REQ-013 | 1 | 01-02, 01-03 | Pending |
| REQ-014 | 1 | 01-02 | Pending |
| REQ-015 | 1 | 01-03 | Pending |
| REQ-016 | 2 | TBD | Pending |
| REQ-017 | 2 | TBD | Pending |
| REQ-018 | 3 | TBD | Pending |
| REQ-019 | 3 | TBD | Pending |
| REQ-020 | 3 | TBD | Pending |
| REQ-021 | 3 | TBD | Pending |
| REQ-022 | 3 | TBD | Pending |
| REQ-023 | 3 | TBD | Pending |
| REQ-024 | 3 | TBD | Pending |
| REQ-025 | 4 | TBD | Pending |
| REQ-026 | 5 | TBD | Pending |
| REQ-027 | 5 | TBD | Pending |
| REQ-028 | 5 | TBD | Pending |
| REQ-029 | 5 | TBD | Pending |
| REQ-030 | 6 | TBD | Pending |

---
*Last updated: 2026-02-07*
