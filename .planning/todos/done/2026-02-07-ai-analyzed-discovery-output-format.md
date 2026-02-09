---
created: 2026-02-07T15:06
title: AI-analyzed discovery output matching vimsy_cold_outreach_leads format
area: api
files:
  - vimsy_cold_outreach_leads.xlsx
  - server/src/services/discovery/providers/manual.ts
  - server/src/routes/discovery.ts
  - server/src/routes/csv.ts
  - server/src/db/queries/sites.ts
  - server/src/db/schema.sql
  - shared/types.ts
  - client/src/pages/DiscoveryPage.tsx
---

## Problem

The discovery phase output needs to match the AI-analyzed format demonstrated in `vimsy_cold_outreach_leads.xlsx`. Currently the discovery phase outputs raw WordPress detection data (url, domain, is_wordpress, wp_version, etc.). The desired output is richer — it includes AI-driven business analysis:

**Excel format (9 columns):**
1. `#` — row number
2. `Company Name` — e.g. "Nonna Box"
3. `Domain` — e.g. "nonnabox.com"
4. `Industry / Segment` — e.g. "E-commerce (Food)", "Professional Services / Consulting"
5. `Why They're a Good Fit` — AI reasoning, e.g. "WooCommerce store, small team, revenue depends on site uptime"
6. `Emails Available` — count from Hunter.io (number)
7. `Priority` — Hot / Warm / Cold
8. `Outreach Status` — Not Started / In Progress / Done
9. `Notes` — additional context

**50 leads across segments:** E-commerce/WooCommerce, Professional Services, Local Business, Content Creators, Nonprofits, Small Business/Niche.

**Two capabilities needed:**

1. **Upload pre-analyzed Excel/CSV**: User can upload a file in this exact format (produced externally by AI with Hunter.io MCP access) and the platform imports it directly into the discovery database, preserving all AI analysis fields.

2. **Analyze on-platform**: When sites come in through other discovery methods (manual URLs, BuiltWith, Wappalyzer, Hunter.io lead list import), the platform should run AI analysis on the list to produce the same enriched output — categorizing industry/segment, generating "why they're a good fit" reasoning, assigning priority (Hot/Warm/Cold), etc. The AI is trained on Vimsy's business context (WordPress maintenance service targeting businesses that depend on their WP site but lack dedicated dev teams).

**This becomes the canonical discovery phase output** — saved to the database and tracked through subsequent pipeline steps (enrichment, analysis, reports, outreach).

## Solution

1. **Update database schema** — Add columns to `sites` table: `company_name`, `industry_segment`, `ai_fit_reasoning`, `emails_available_count`, `priority` (hot/warm/cold), `outreach_status`, `notes`
2. **Update shared types** — Reflect new fields in Site type and CSV schema
3. **Excel/CSV import endpoint** — Accept uploads in the vimsy_cold_outreach_leads format, map columns to new DB fields
4. **AI analysis service** — New service that takes a batch of discovered sites and uses an LLM to produce: industry/segment classification, fit reasoning (based on Vimsy's business model), and priority scoring. Needs a Vimsy business context prompt.
5. **Integration into discovery flow** — After WordPress detection, optionally run AI analysis to enrich the discovery output
6. **UI** — Upload button for pre-analyzed Excel/CSV, and a "Run AI Analysis" action on discovered sites
