# Todo: Populate emails_available_count from Hunter.io Discover API response

**Created:** 2026-02-10
**Area:** discovery
**Priority:** medium

## Description

The Hunter.io Discover API returns the number of emails available for each domain in its response. When discovering websites via the Hunter provider, populate the `emails_available_count` column in the discovered sites table with this value.

## Context

Currently the Hunter Discover provider (`server/src/services/discovery/providers/hunter-discover.ts`) extracts company data (domain, company name, industry, etc.) but does not map the emails count from the API response to the site record. The `emails_available_count` field already exists in the sites DB schema and is displayed in the discovery results table.

## Related Files

- `server/src/services/discovery/providers/hunter-discover.ts` — Hunter Discover provider, needs to include emails count in discovered URL metadata
- `server/src/workers/discovery-worker.ts` — Passes extra metadata to `saveSiteFromDetection`, may need to forward emails count
- `server/src/db/queries/sites.ts` — `upsertSite` / `saveSiteFromDetection` already supports `emails_available_count`
- `shared/types.ts` — Type definitions for discovery results

## Notes

- Check the Hunter.io Discover API response structure for the exact field name (likely `emails_count` or similar per company object).
- The value should be passed through the discovery pipeline and saved via `upsertSite`.
