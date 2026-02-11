---
phase: 4
plan: 5
name: Reports Page UI
status: completed
completed: 2026-02-11
---

# Plan 5 Summary: Reports Page UI

## What was done

- Added report API methods to client: getReports, getReport, generateReports, regenerateReport, getReportJobs, cancelReportJob, getReportPdfUrl, getReportDownloadUrl
- Replaced placeholder ReportsPage with full implementation:
  - Shows all analyzed sites with report status
  - Filter tabs: All, Completed, Queued, Generating, Errors, No Report (with counts)
  - Search by domain/company name
  - Checkbox bulk selection with "Generate Reports" button
  - Per-row actions: View (opens PDF modal), Download, Regenerate, Generate, Retry
  - Status badges: No Report (gray), Queued (blue pulse), Generating (indigo spinner), Ready (green check), Error (red)
  - Active job progress banner with progress bar
  - Polling every 3s when jobs active or sites pending/generating
  - Loading skeleton state
  - Empty states for no analyzed sites and no filter matches
- Built inline ReportViewer component:
  - Full-screen modal with iframe rendering PDF from API
  - Download button in header
  - Click-outside to close
- Updated AnalysisPage with "Report" column:
  - ReportStatusCell component showing report status per site
  - Completed reports are clickable links opening PDF in new tab
  - Column added between Status and action buttons

## Files created
- None (ReportViewer is inline in ReportsPage)

## Files modified
- `client/src/pages/ReportsPage.tsx` (full rewrite)
- `client/src/pages/AnalysisPage.tsx` (added Report column)
- `client/src/lib/api.ts` (added report API methods)

## Verification
- Client TypeScript compiles cleanly
- Server TypeScript compiles cleanly
