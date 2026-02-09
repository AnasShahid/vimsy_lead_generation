# Todo: Discovery Site Selection & Batch Actions

**Created:** 2026-02-09
**Area:** discovery, ui
**Priority:** high

## Description

Add functionality to select single or multiple sites from the discovery screen for batch operations:

### 1. Site Selection
- Checkbox column in the SiteResultsTable for selecting individual sites
- "Select all" checkbox in the header (selects current page)
- Selected count indicator in the toolbar

### 2. Batch AI Analysis
- "Run AI Analysis" button operates on selected records (not all)
- Analysis runs in batches on the selected sites
- Progress indicator during batch analysis

### 3. Modify & Delete Selected
- Bulk delete selected sites
- Bulk edit fields on selected sites (e.g., priority, outreach status, notes)
- Confirmation dialog before destructive actions

### 4. Select for Further Pipeline Steps
- Ability to mark/select sites to advance to the next pipeline stage
- "Move to Enrichment" or similar action on selected sites
- Updates `pipeline_stage` for selected records

## Context

User request during Phase 1 verification. Currently the SiteResultsTable has no selection mechanism — the "Run AI Analysis" button runs on all sites. This todo adds granular control.

## Related Files

- `client/src/components/discovery/SiteResultsTable.tsx` — Results table (needs checkbox column, selection state)
- `client/src/pages/DiscoveryPage.tsx` — Parent page (needs selection toolbar)
- `server/src/routes/sites.ts` — API endpoints (batch delete, batch update)
- `server/src/db/queries/sites.ts` — DB queries (batch operations)

## Notes

- Selection state should be managed in DiscoveryPage and passed to SiteResultsTable
- Consider "select all across pages" vs "select all on current page" — start with current page
- Batch AI analysis should reuse the existing `analyzeSites` endpoint which already accepts an array of IDs
- Batch delete/update will need new API endpoints
