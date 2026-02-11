---
phase: 4
plan: 1
name: Report Data Model & Settings
status: completed
completed: 2026-02-11
---

# Plan 1 Summary: Report Data Model & Settings

## What was done

- Added `site_reports` table to `schema.sql` with all columns (id, site_id, report_job_id, status, pdf_filename, pdf_path, AI content fields, health_score snapshot, timestamps)
- Added `report_status` column to `sites` table (schema + migration)
- Created `server/src/db/queries/reports.ts` with full CRUD: createReport, getReportById, getReportBySiteId, getReportsByJobId, updateReport, listReports (paginated with site JOIN), deleteReport
- Added `SiteReport`, `ReportStatus`, `ReportJobConfig` types to `shared/types.ts`
- Added `report_status` to `Site` interface
- Added report branding settings defaults (`DEFAULT_REPORT_SETTINGS`) and helpers (`getReportSettings`, `setReportSettings`) to settings queries
- Added `GET /api/settings/report` and `PUT /api/settings/report` API endpoints
- Updated `GET /api/settings` to include report branding fields
- Added "Report Branding" tab to Settings UI with fields: Company Name, Logo URL (with preview), Primary Brand Color (color picker + hex), Disclaimer, CTA Text, Contact Email/Phone/Website
- Added `getReportSettings` and `updateReportSettings` to client API

## Files created
- `server/src/db/queries/reports.ts`

## Files modified
- `server/src/db/schema.sql`
- `server/src/db/migrations.ts`
- `server/src/db/queries/settings.ts`
- `server/src/routes/settings.ts`
- `client/src/pages/SettingsPage.tsx`
- `client/src/lib/api.ts`
- `shared/types.ts`

## Verification
- Server TypeScript compiles cleanly
- Client TypeScript compiles cleanly
- Shared types build successfully
