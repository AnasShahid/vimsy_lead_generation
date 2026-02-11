---
phase: 4
plan: 4
name: Report Worker & Auto-Queue
status: completed
completed: 2026-02-11
---

# Plan 4 Summary: Report Worker & Auto-Queue

## What was done

- Created `server/src/services/report/index.ts` — report orchestrator:
  - `generateSiteReport(siteId, reportId)` ties together AI generation + PDF rendering
  - Updates report and site statuses at each stage (generating → completed/error)
  - Saves AI content even if PDF rendering fails
  - Adds 'reported' tag on completion
  - Comprehensive error handling with logging
- Created `server/src/workers/report-worker.ts` — poll-based background worker:
  - Polls for 'report' type jobs every 2s
  - Max concurrent: 1 (Puppeteer is memory-heavy)
  - Processes sites sequentially with progress updates
  - Supports cancellation via AbortController
  - Same lifecycle pattern as analysis worker
- Created `server/src/routes/reports.ts` — 7 API endpoints:
  - `POST /api/reports/generate` — bulk generate (validates sites have completed analysis)
  - `GET /api/reports` — paginated list with site info joined
  - `GET /api/reports/jobs` — list report jobs
  - `DELETE /api/reports/jobs/:jobId` — cancel report job
  - `GET /api/reports/:siteId` — get latest report for site
  - `GET /api/reports/:siteId/pdf` — serve PDF inline
  - `GET /api/reports/:siteId/download` — serve PDF as attachment
  - `POST /api/reports/:siteId/regenerate` — regenerate single site
- Registered report worker in server startup/shutdown lifecycle
- Mounted report routes at `/api/reports` in app.ts
- Added auto-queue in analysis worker: after successful analysis, creates a pending report job per site

## Files created
- `server/src/services/report/index.ts`
- `server/src/workers/report-worker.ts`
- `server/src/routes/reports.ts`

## Files modified
- `server/src/index.ts` (report worker + Puppeteer lifecycle)
- `server/src/app.ts` (mount report routes)
- `server/src/workers/analysis-worker.ts` (auto-queue report after analysis)

## Verification
- Server TypeScript compiles cleanly
