# Phase 2: Contact Enrichment — Context

**Captured:** 2026-02-10

## Vision

Select discovered sites from the Discovery tab, move them to an Enrichment stage, and use Hunter.io (and later Snov.io) to find contact emails and people associated with each domain. The enrichment tab shows sites that have been moved there, with sub-tabs for each enrichment provider. Users configure filters (seniority, department, type, etc.) and run batch enrichment as a background job. After enrichment, clicking a site reveals its associated contacts — names, emails, LinkedIn, verification status, etc.

## User Experience

1. **Discovery → Enrichment flow**: In the Discovery results table, select one or more sites → click "Move to Enrichment". This updates their `pipeline_stage` from `discovered` → `enrichment`. They disappear from Discovery's active view and appear in the Enrichment tab.

2. **Enrichment tab layout**: Two sub-tabs — **Hunter.io** and **Snov.io** (Snov.io is a placeholder for now). Each tab shows the sites that are in the enrichment stage.

3. **Hunter.io enrichment UI**: 
   - Sites list on the left/top showing domains moved to enrichment, with enrichment status (pending, enriched, error).
   - Filter panel with: seniority (multi-select), department (multi-select), type (personal/generic), required field, verification status, location, job titles, max results (number input, 1-15, default 5).
   - Select sites → click "Enrich Selected" → runs as background batch job with progress tracking.
   - API rate limits respected automatically.

4. **Contact details view**: Click on a site row → expands or opens a detail panel showing all contacts found for that domain: full name, email, position/title, seniority, department, LinkedIn URL, phone, verification status (verified/unverified badge), confidence score.

5. **Re-enrichment**: User can re-enrich an already-enriched site with different filters (e.g., first time senior, second time executive). New contacts are **added** to the existing contact list — duplicates are removed by email address. The site stays in `enriched` status.

6. **Status tracking**: Each site in enrichment has a status:
   - `pending` — moved to enrichment but not yet enriched
   - `enriching` — currently being processed
   - `enriched` — has contacts
   - `error` — enrichment failed
   
   This prevents accidental double-enrichment while still allowing intentional re-enrichment.

## Essentials

Things that MUST be true:
- New `contacts` table linked to sites (many contacts per site)
- Pipeline stage tracking: `discovered` → `enrichment` → `enriched`
- Duplicate contact prevention by email address per site
- Background batch job with progress tracking for enrichment
- API rate limit compliance for Hunter.io
- Verification status stored and displayed for each email
- Max results per domain configurable (1-15, default 5)
- Hunter.io domain-search API filters: seniority, department, type, required field, verification, location, job titles
- Domain and company auto-populated from the selected site record
- Snov.io tab present in UI (placeholder, not implemented yet)

## Boundaries

Things to explicitly AVOID:
- No Clearbit integration — removed from scope
- No auto-enrichment — always manual user action (select + enrich)
- No enrichment from Discovery tab directly — must move to Enrichment stage first
- No deleting contacts on re-enrichment — only add new, dedupe by email
- No Snov.io implementation in this phase — tab placeholder only

## Implementation Notes

Specific technical preferences mentioned:
- Hunter.io `domain-search` API endpoint: https://hunter.io/api-documentation/v2#domain-search
- Contacts stored in a new `contacts` table with foreign key to `sites`
- Background job system (existing job queue) used for batch enrichment
- Rate limiting: use existing rate limiter pattern from WordPress detection
- Pipeline stage column already exists on `sites` table — extend with enrichment stages
- Site enrichment_status separate from pipeline_stage (a site can be in enrichment stage but not yet enriched)

## Open Questions

Things to decide during planning:
- Exact Hunter.io domain-search response fields to store in contacts table
- Whether to add an `enrichment_status` column to sites or use a separate enrichment jobs tracking
- UI layout: expandable rows vs. side panel vs. modal for contact details
- How to handle Hunter.io API quota exhaustion mid-batch (pause? skip? error?)

---
*This context informs planning. The planner will honor these preferences.*
