# Todo: Google Cloud Storage for Report Storage

**Created:** 2026-02-11
**Area:** report-storage
**Priority:** high

## Description

Implement Google Cloud Storage (GCS) integration for PDF report storage. When a report is generated, upload it to GCS and save the cloud URL with the report record in the database.

### Requirements

1. **Upload to GCS** — After PDF is rendered locally, upload to the `vimsy-reports` bucket
2. **Monthly organization** — Reports organized by month folders: `January 2026/`, `February 2026/`, etc. One report per website per month
3. **Signed URLs** — Generate signed URLs for report access:
   - Browser access: opens PDF inline in browser
   - Service access (future email phase): downloadable blob for email attachment
4. **Database integration** — Store GCS path, signed URL, and related metadata in `site_reports` table
5. **Credentials** — `credentials.json` already exists in repo root for Google Cloud auth
6. **Bucket** — Already created: `vimsy-reports`

### Implementation Notes

- Replace or supplement local `data/reports/` storage with GCS upload
- Update `pdf-renderer.ts` or `report/index.ts` orchestrator to upload after rendering
- Add GCS utility service (`server/src/services/gcs.ts` or similar)
- Update report API routes to serve signed URLs instead of local file paths
- Signed URLs should have configurable expiry (e.g., 7 days)
- Keep in mind: email outreach phase will use signed URLs to download and attach reports

### Architecture Considerations

- Upload flow: Render PDF locally → Upload to GCS → Save GCS path + signed URL to DB → Clean up local file (optional)
- Signed URL regeneration: If URL expires, regenerate on demand
- Error handling: If GCS upload fails, keep local file and mark report with warning

## Context

User request during Phase 4 verification. The user has already:
- Created the `vimsy-reports` GCS bucket
- Added `credentials.json` to the repo
- Added `data/reports/*` to `.gitignore`

## Related Files

- `server/src/services/report/pdf-renderer.ts` — Current PDF rendering (saves to local `data/reports/`)
- `server/src/services/report/index.ts` — Report orchestrator (coordinates AI → PDF → DB)
- `server/src/routes/reports.ts` — Report API routes (currently serves local files)
- `server/src/db/queries/reports.ts` — Report DB queries
- `server/src/db/schema.sql` — Schema for `site_reports` table
- `credentials.json` — Google Cloud credentials (already in repo)
- `.env.example` — May need `GOOGLE_APPLICATION_CREDENTIALS` env var

## Notes

- The email outreach phase (Phase 5) will consume signed URLs to attach reports to cold emails
- Consider adding a `gcs_path` and `signed_url` / `signed_url_expires` columns to `site_reports`
- Monthly folder naming: use full month name + year (e.g., `January 2026`)
