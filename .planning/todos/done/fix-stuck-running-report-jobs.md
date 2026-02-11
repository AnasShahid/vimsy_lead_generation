# Todo: Fix stuck "running" report jobs + improve job cancellation

**Created:** 2026-02-11
**Area:** server/workers
**Priority:** high

## Description

There are report jobs stuck in "running" status indefinitely in the database. This is likely stale data from when the OpenRouter SDK was hanging — the process was killed but the job status was never updated.

Tasks:
1. **Fix stale data:** Clean up any jobs stuck in "running" or "pending" that are clearly stale (e.g., started > 1 hour ago)
2. **Startup cleanup:** On server start, mark any "running" jobs as "failed" (since the server restarted, they can't still be running)
3. **Job cancellation:** Verify the cancel endpoint works properly and can kill in-progress report generation
4. **Timeout:** Add a per-report timeout so a single stuck report doesn't block the entire job forever

## Context

User reported two jobs showing as "running" indefinitely. These are likely from previous sessions where the OpenRouter SDK hung and the server was killed.

## Related Files

- `server/src/workers/report-worker.ts` — Report job worker
- `server/src/db/queries/jobs.ts` — Job queries (listActiveAndRecentJobs returns these stuck jobs)
- `server/src/routes/reports.ts` — Cancel endpoint

## Notes

- The `listActiveAndRecentJobs` function will keep returning these stuck jobs since they have status "running"
- A simple startup cleanup query would fix this: `UPDATE jobs SET status = 'failed', error = 'Server restarted' WHERE status = 'running'`
