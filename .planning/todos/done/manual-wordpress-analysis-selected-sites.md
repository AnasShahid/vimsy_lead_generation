# Todo: Manual WordPress Analysis on Selected Sites

**Created:** 2026-02-09
**Area:** discovery, ui, batch-actions
**Priority:** high

## Description

Allow users to select one or more sites in the discovered sites table and manually trigger WordPress detection/analysis on them. This checks whether the site is a WordPress website and populates WordPress-specific fields (version, theme, plugins, SSL, response time, page title, etc.).

### Requirements

- User selects sites via checkboxes in the SiteResultsTable
- A "Run WP Analysis" button appears in the batch action toolbar when sites are selected
- Clicking it triggers WordPress detection on each selected site
- Results populate: is_wordpress, wp_version, detected_theme, detected_plugins, ssl_valid, response_time_ms, page_title, http_status_code, has_contact_page
- Progress feedback shown during analysis
- Works independently of AI analysis (AI analysis sets priority/fit reasoning, WP analysis sets technical fields)

### Backend

- Reuse existing WordPress detection logic from the discovery worker
- Create a new endpoint or reuse existing detection endpoint for batch WP analysis
- Update site records in DB with detection results

### Frontend

- Add "WP Analyze" button to batch action toolbar (next to AI Analyze, Edit, Delete, Move to Enrichment)
- Show progress/loading state during analysis
- Refresh table after completion

## Context

When sites are imported from Hunter.io Discover API or CSV, they may not have WordPress detection data. Users need to manually trigger WP analysis to check if sites are WordPress and get version/theme/plugin info.

## Related Files

- `client/src/components/discovery/SiteResultsTable.tsx` — Add WP Analyze button to batch toolbar
- `server/src/services/discovery/worker.ts` — Contains WordPress detection logic to reuse
- `server/src/routes/sites.ts` — Add batch WP analysis endpoint
- `server/src/services/wp-detector.ts` or similar — WordPress detection service

## Notes

- This is separate from AI analysis — WP analysis checks technical WordPress details, AI analysis evaluates business fit
- Should handle errors gracefully (timeouts, unreachable sites)
- Consider rate limiting to avoid overwhelming target sites
