---
created: 2026-02-07T15:03
title: Revamp discovery providers - remove Google, add Hunter.io lead list import
area: api
files:
  - server/src/services/discovery/providers/google-search.ts
  - server/src/services/discovery/providers/manual.ts
  - server/src/services/discovery/providers/builtwith.ts
  - server/src/services/discovery/providers/wappalyzer.ts
  - server/src/services/discovery/index.ts
  - server/src/routes/discovery.ts
  - shared/types.ts
  - client/src/pages/DiscoveryPage.tsx
  - client/src/components/discovery/GoogleSearchForm.tsx
---

## Problem

Two changes needed in the discovery phase (Step 1):

**1. Remove Google Search provider**
The Google Search scraping provider hits anti-bot limits and doesn't work reliably. It should be removed entirely from the platform. Manual, BuiltWith, and Wappalyzer providers remain as-is.

**2. Add Hunter.io Lead List import provider**
Need a new discovery provider that connects to Hunter.io via API key to import a pre-created "Companies" lead list. The user has lead lists already set up in Hunter.io with company names. The flow:
- User enters their Hunter.io API key
- Platform calls Hunter.io Leads API to fetch available lead lists
- User selects which list to import
- Platform imports the companies and puts them into the discovery pipeline's standardized format
- **Important**: At this stage the list is NOT enriched — it contains company names/domains that need to go through WordPress detection and enrichment in subsequent steps

Key detail: This is different from using Hunter.io for contact enrichment (Step 2). This is purely importing a company list as a discovery source, similar to how manual CSV import works but pulling from Hunter.io's lead lists API instead.

## Solution

1. Delete `google-search.ts` provider and `GoogleSearchForm.tsx` component
2. Remove Google Search from provider registry and shared types
3. Create new `hunter-leads.ts` provider that:
   - Calls `GET https://api.hunter.io/v2/leads_lists` to list available lists
   - Calls `GET https://api.hunter.io/v2/leads_lists/{id}/leads` to fetch leads from selected list
   - Extracts company domains/URLs from leads
   - Returns them as `DiscoveredUrl[]` for WordPress detection
4. Create `HunterLeadsForm.tsx` UI component with API key input + list selector dropdown
5. Add HUNTER_IO_API_KEY to .env.example
6. Update DiscoveryPage tabs to swap Google for Hunter.io Leads
