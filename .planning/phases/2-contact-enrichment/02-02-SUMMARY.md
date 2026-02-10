---
phase: 2
plan: 2
name: Pipeline Stage Management & Move to Enrichment
status: complete
completed: 2026-02-10
---

# Plan 02-02 Summary

## What was done

1. **Client enrichment API methods** — Added `moveToEnrichment`, `getEnrichmentSites`, `getContactsForSite`, `createEnrichmentJob`, `getEnrichmentJobs`, `getEnrichmentJob`, `cancelEnrichmentJob` to `api.ts`
2. **Move to Enrichment button** — Updated existing button in SiteResultsTable to use dedicated `/api/enrichment/move` endpoint; clears selection after move
3. **Discovery page filtering** — Added `pipeline_stage: 'discovered'` to fetchSites params so enrichment-stage sites no longer appear in Discovery
4. **Shared types** — Already completed in Plan 02-01 (PipelineStage includes 'enrichment', EnrichmentStatus, enrichment_status on Site)

## Files modified
- `client/src/lib/api.ts`
- `client/src/components/discovery/SiteResultsTable.tsx`
- `client/src/pages/DiscoveryPage.tsx`
