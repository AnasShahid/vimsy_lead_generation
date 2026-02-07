# Vimsy Lead Gen Platform

## What This Is

An automated lead generation pipeline for Vimsy, a WordPress maintenance service. The system discovers WordPress websites, analyzes their technical health (performance, security, SEO), generates branded PDF reports showing problems, and sends personalized cold emails with those reports to convert site owners into Vimsy customers. Used by a small team (2-5 people) at Vimsy with a shared dashboard.

## Core Value

Automatically find WordPress sites that need maintenance, prove it with data, and reach the right person — so the team spends time closing deals, not finding them.

## Requirements

### Validated

- ✓ Discover WordPress sites via manual URL entry — existing
- ✓ Discover WordPress sites via CSV import/export — existing
- ✓ Discover WordPress sites via Google Search scraping — existing
- ✓ Discover WordPress sites via directory scraping — existing
- ✓ Discover WordPress sites via BuiltWith API — existing
- ✓ Discover WordPress sites via Wappalyzer API — existing
- ✓ Thorough WordPress detection (meta tags, wp-json, wp-content paths, readme.html, headers) — existing
- ✓ Background job queue with progress tracking and cancellation — existing
- ✓ Dashboard with pipeline step navigation — existing
- ✓ Site results table with filtering, sorting, pagination — existing
- ✓ Standardized CSV output format between pipeline steps — existing
- ✓ SQLite database for persistence — existing
- ✓ Docker-ready deployment — existing

### Active

- [ ] Contact data enrichment (Hunter.io, Clearbit integration)
- [ ] Technical site analysis with 0-100 health scoring
- [ ] PageSpeed Insights / Lighthouse integration
- [ ] SSL/TLS security analysis
- [ ] WordPress version and vulnerability detection
- [ ] Priority classification (Critical/High/Medium/Low)
- [ ] Branded 7-page PDF report generation
- [ ] Cold email 4-sequence outreach (Day 0, 3, 7, 14)
- [ ] Instantly.ai or similar cold email platform integration
- [ ] Email template management with personalization
- [ ] Response tracking and conversion monitoring
- [ ] Pipeline dashboard with stats and conversion metrics
- [ ] Auto-qualify sites with score <40 for outreach
- [ ] Manual review queue for medium-scored sites (40-75)
- [ ] Geographic filtering for English-speaking markets (AU, US, UK, NZ, CA)

### Out of Scope

- Multi-tenant SaaS for other agencies — this is Vimsy's internal tool
- Real-time chat or live support features — not relevant to lead gen
- Payment processing — Vimsy handles billing separately
- Mobile app — web dashboard is sufficient for team use
- AI-generated email content — templates are pre-written and proven

## Context

- Vimsy is a WordPress maintenance service targeting businesses in English-speaking markets
- The prototype (prototype.html) contains the complete workflow specification originally designed for n8n automation
- Step 1 (WordPress Discovery) is fully implemented with 5 discovery providers and thorough WP detection
- The system follows a 3-layer architecture: Directives (SOPs) → Orchestration (Claude agent) → Execution (scripts)
- Each pipeline step produces standardized CSV that can be imported/exported independently
- The codebase is a TypeScript monorepo: React+Vite client, Express+SQLite server, shared types
- Target output: 50+ qualified leads per week, 3% response rate, 30% consultation-to-customer conversion

## Constraints

- **Budget**: Free tier APIs preferred; total monthly cost target $0-50 for APIs
- **Tech stack**: Node.js + Express + React + SQLite (already established)
- **Email platform**: Instantly.ai or similar dedicated cold email service (not Gmail direct)
- **Markets**: English-speaking countries only (AU, US, UK, NZ, CA)
- **Privacy**: Must comply with anti-spam laws (CAN-SPAM, GDPR opt-out requirements)
- **Rate limits**: External APIs (Hunter.io, PageSpeed, etc.) have free tier limits that cap throughput

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Node.js + Express over Python backend | Full JS stack, simpler monorepo, team familiarity | — Pending |
| SQLite over PostgreSQL | Single-team tool, no multi-user concurrency needs, easy deployment | — Pending |
| CSV as inter-step interface | Steps can run independently, easy to import/export externally | ✓ Good |
| Provider plugin pattern for discovery | Easy to add new discovery sources without modifying core | ✓ Good |
| Instantly.ai for email sending | Dedicated cold email platform with warmup and deliverability features | — Pending |
| Auto-qualify + manual review hybrid | Critical sites (score <40) auto-enter pipeline, medium reviewed by team | — Pending |
| Docker-ready from start | Easy deployment to any server when ready to scale | ✓ Good |

---
*Last updated: 2026-02-07 after initialization*
