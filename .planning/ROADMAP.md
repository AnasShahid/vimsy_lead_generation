# Roadmap

## Overview

**Project:** Vimsy Lead Gen Platform
**Milestone:** v1.0
**Created:** 2026-02-07
**Phases:** 7

## Progress

```
Phase 1  ██████████ 100%  Discovery Improvements
Phase 2  ██████████ 100%  Contact Enrichment
Phase 3  ██████████ 100%  Technical Analysis & Scoring
Phase 4  ░░░░░░░░░░  0%  PDF Report Generation
Phase 5  ░░░░░░░░░░  0%  Cold Email Outreach
Phase 6  ░░░░░░░░░░  0%  Pipeline Dashboard & Metrics
Phase 7  ░░░░░░░░░░  0%  Leads Tracking Page
```

## Phases

### Phase 1: Discovery Improvements

**Goal:** Discovery phase outputs enriched, AI-analyzed leads in the vimsy_cold_outreach_leads format — with Hunter.io as a new source and Google Search removed.

**Requirements:** REQ-012, REQ-013, REQ-014, REQ-015

**Success Criteria:**
- [x] Google Search provider removed from codebase and UI
- [x] Hunter.io lead list import provider works end-to-end (API key → list selection → import)
- [x] Pre-analyzed Excel/CSV upload imports into database with all enriched fields (company name, industry, fit reasoning, priority)
- [x] AI analysis service enriches discovered sites with industry/segment, fit reasoning, and Hot/Warm/Cold priority
- [x] Database schema includes new enrichment columns (company_name, industry_segment, ai_fit_reasoning, priority, etc.)
- [x] Geographic filtering limits results to AU, US, UK, NZ, CA markets
- [x] Discovery results table displays enriched columns

**Research flag:** Recommended (Hunter.io Leads API, AI analysis prompt design)

---

### Phase 2: Contact Enrichment

**Goal:** Every qualified lead has contact emails and company data attached, ready for outreach.

**Requirements:** REQ-016, REQ-017

**Depends on:** Phase 1

**Success Criteria:**
- [x] Hunter.io domain search finds email addresses for discovered domains
- [ ] ~~Clearbit enrichment~~ → Replaced by Snov.io (placeholder, not yet implemented)
- [x] Enrichment runs as background job with progress tracking
- [x] Enriched contact data saved to database and visible in UI
- [x] Batch enrichment respects API rate limits and free tier quotas

**Research flag:** Recommended (Hunter.io domain search API, Clearbit API, rate limit strategies)

---

### Phase 3: Technical Analysis & Scoring

**Goal:** Each site has a 0-100 health score with specific technical issues identified, and sites are auto-classified by priority for outreach qualification.

**Requirements:** REQ-018, REQ-019, REQ-020, REQ-021, REQ-022, REQ-023, REQ-024

**Depends on:** Phase 1

**Success Criteria:**
- [x] PageSpeed Insights integration returns performance, accessibility, SEO scores
- [x] SSL/TLS analysis detects certificate issues, expiry, protocol versions
- [x] WordPress version detection identifies outdated/vulnerable installations
- [x] Composite 0-100 health score calculated from all analysis dimensions
- [x] Priority classification assigns Critical/High/Medium/Low based on score
- [x] Sites scoring <40 auto-qualify for outreach pipeline
- [x] Sites scoring 40-75 enter manual review queue in UI
- [x] Analysis runs as background job with progress tracking

**Research flag:** Required (PageSpeed Insights API, SSL analysis approach, WP vulnerability databases)

---

### Phase 4: PDF Report Generation

**Goal:** Branded 7-page PDF reports are generated per site, showing problems found and Vimsy's value proposition — ready to attach to outreach emails.

**Requirements:** REQ-025

**Depends on:** Phase 3

**Success Criteria:**
- [ ] PDF generation produces branded 7-page report from analysis data
- [ ] Report includes: executive summary, performance scores, security findings, WordPress issues, recommendations, Vimsy CTA
- [ ] Reports generated as background job (batch or per-site)
- [ ] PDFs stored and downloadable from UI
- [ ] Report template is configurable (branding, sections)

**Research flag:** Recommended (PDF generation libraries — Puppeteer/PDFKit/React-PDF)

---

### Phase 5: Cold Email Outreach

**Goal:** Qualified leads receive a 4-email sequence via Instantly.ai with personalized content and attached PDF reports, with delivery tracked.

**Requirements:** REQ-026, REQ-027, REQ-028, REQ-029

**Depends on:** Phase 2, Phase 4

**Success Criteria:**
- [ ] Instantly.ai integration sends emails via API
- [ ] 4-sequence campaign (Day 0, 3, 7, 14) configured and triggered per lead
- [ ] Email templates support personalization tokens (company name, issues found, score)
- [ ] PDF reports attached to initial outreach email
- [ ] Template management UI for creating/editing email sequences
- [ ] Response tracking captures opens, replies, bounces from Instantly.ai
- [ ] Conversion monitoring tracks lead → consultation → customer

**Research flag:** Required (Instantly.ai API, email deliverability best practices, CAN-SPAM/GDPR compliance)

---

### Phase 6: Pipeline Dashboard & Metrics

**Goal:** Team has a single dashboard showing the full pipeline funnel — from discovery through conversion — with actionable stats.

**Requirements:** REQ-030

**Depends on:** Phase 5

**Success Criteria:**
- [ ] Dashboard shows counts at each pipeline stage (discovered → enriched → analyzed → reported → contacted → responded → converted)
- [ ] Conversion rates displayed between each stage
- [ ] Time-series charts for leads processed per week
- [ ] Filterable by date range, priority, geographic market
- [ ] Export pipeline stats to CSV

**Research flag:** None

---

### Phase 7: Leads Tracking Page

**Goal:** A unified Leads page that tracks every post-discovery site through the entire pipeline — showing contacts, analysis status, reports, and outreach in one place — so enrichment data is never lost when sites move to later stages.

**Requirements:** REQ-031, REQ-032, REQ-033, REQ-034, REQ-035

**Depends on:** Phase 2

**Success Criteria:**
- [ ] Unified Leads page shows all sites that have left Discovery (enrichment onwards)
- [ ] Each lead row displays: domain, company, contacts count, enrichment status, analysis status, report status, outreach status
- [ ] Expandable detail view per lead showing all contacts, analysis scores, and action history
- [ ] Sites remain visible in enrichment tab after being sent to analysis (pipeline_stage no longer removes from previous views)
- [ ] Filter leads by any status column (enrichment, analysis, outreach) and by tags
- [ ] "Select all by filter" allows bulk actions on filtered subsets
- [ ] Analysis can be triggered directly from the Leads page without losing enrichment context
- [ ] Leads page becomes the central tracking hub; enrichment/analysis tabs become action-focused tools

**Research flag:** None

---

## Requirement Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-001 | — | ✅ Done |
| REQ-002 | — | ✅ Done |
| REQ-003 | — | ✅ Done |
| REQ-004 | — | ✅ Done |
| REQ-005 | — | ✅ Done |
| REQ-006 | — | ✅ Done |
| REQ-007 | — | ✅ Done |
| REQ-008 | — | ✅ Done |
| REQ-009 | — | ✅ Done |
| REQ-010 | — | ✅ Done |
| REQ-011 | — | ✅ Done |
| REQ-012 | 1 | ✅ Done |
| REQ-013 | 1 | ✅ Done |
| REQ-014 | 1 | ✅ Done |
| REQ-015 | 1 | ✅ Done |
| REQ-016 | 2 | ✅ Done |
| REQ-017 | 2 | Deferred (Snov.io placeholder) |
| REQ-018 | 3 | ✅ Done |
| REQ-019 | 3 | ✅ Done |
| REQ-020 | 3 | ✅ Done |
| REQ-021 | 3 | ✅ Done |
| REQ-022 | 3 | ✅ Done |
| REQ-023 | 3 | ✅ Done |
| REQ-024 | 3 | ✅ Done |
| REQ-025 | 4 | Pending |
| REQ-026 | 5 | Pending |
| REQ-027 | 5 | Pending |
| REQ-028 | 5 | Pending |
| REQ-029 | 5 | Pending |
| REQ-030 | 6 | Pending |
| REQ-031 | 7 | Pending |
| REQ-032 | 7 | Pending |
| REQ-033 | 7 | Pending |
| REQ-034 | 7 | Pending |
| REQ-035 | 7 | Pending |

## Timeline Estimate

| Phase | Complexity | Est. Plans |
|-------|------------|------------|
| 1 — Discovery Improvements | High | 3 |
| 2 — Contact Enrichment | Medium | 2 |
| 3 — Technical Analysis & Scoring | High | 3 |
| 4 — PDF Report Generation | Medium | 2 |
| 5 — Cold Email Outreach | High | 3 |
| 6 — Pipeline Dashboard & Metrics | Low | 1 |
| 7 — Leads Tracking Page | Medium | 2 |

---
*Last updated: 2026-02-11 — Phase 3 verified complete, Phase 7 added*
