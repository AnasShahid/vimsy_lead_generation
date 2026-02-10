---
phase: 2
plan: 1
name: Contacts Schema & Hunter.io Domain Search Backend
status: complete
completed: 2026-02-10
---

# Plan 02-01 Summary

## What was done

1. **Contacts table** — Created `contacts` table with 18 columns, UNIQUE(site_id, email) for deduplication, and 3 indexes
2. **enrichment_status column** — Added to `sites` table (values: pending, enriching, enriched, error)
3. **Migrations** — Updated `migrations.ts` to add contacts table + enrichment_status for existing DBs
4. **Contacts queries** — `upsertContact`, `getContactsBySiteId`, `getContactCountBySiteId`, `getContactCountsForSites`, `deleteContactsBySiteId`
5. **Shared types** — Added `Contact`, `EnrichmentProvider`, `EnrichmentStatus`, `HunterDomainSearchConfig`, `HunterDomainSearchResult`, `HunterEmailResult`, `EnrichmentJobConfig`; updated `PipelineStage`, `Site`, `Job`
6. **Hunter.io domain-search service** — Calls `/v2/domain-search` with all filter params, rate limiting (70ms min delay), maps response to Contact shape
7. **Enrichment service index** — `runEnrichment()` dispatches to Hunter provider, upserts contacts per site
8. **Enrichment worker** — Polls for `enrichment` jobs, processes batch with progress tracking, 429 retry (30s × 3), abort support
9. **Enrichment API routes** — POST /jobs, GET /jobs, GET /jobs/:id, DELETE /jobs/:id, GET /sites, GET /sites/:id/contacts, POST /move
10. **Server registration** — Routes in app.ts, worker start/stop in index.ts

## Files created
- `server/src/db/queries/contacts.ts`
- `server/src/services/enrichment/hunter-domain-search.ts`
- `server/src/services/enrichment/index.ts`
- `server/src/workers/enrichment-worker.ts`
- `server/src/routes/enrichment.ts`

## Files modified
- `server/src/db/schema.sql`
- `server/src/db/migrations.ts`
- `server/src/db/queries/sites.ts`
- `server/src/app.ts`
- `server/src/index.ts`
- `shared/types.ts`
