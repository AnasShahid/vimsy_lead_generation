# Todo: Parallel/Pipeline Report Generation

**Created:** 2026-02-11
**Area:** server/services/report
**Priority:** high

## Description

Report generation is currently sequential — one report fully completes before the next starts. When processing multiple reports in a job, this is slow.

Implement parallel/pipeline processing:
- **Option A (Batch parallel):** Process N reports concurrently (e.g., 3 at a time) using `Promise.allSettled` or similar
- **Option B (Pipeline):** Stage-based pipeline where stage 1 of report B starts while stage 2 of report A is running (AI gen → PDF render → GCS upload)

Considerations:
- Puppeteer browser instance management (shared vs per-report)
- OpenRouter rate limits
- Memory usage with concurrent PDF renders
- Progress reporting per-report within a batch

## Context

User observed that generating reports for multiple sites takes too long because each report waits for the previous one to fully complete before starting.

## Related Files

- `server/src/services/report/index.ts` — Report orchestrator (generateSiteReport)
- `server/src/workers/report-worker.ts` — Worker that processes report jobs sequentially
- `server/src/services/report/pdf-renderer.ts` — PDF rendering with Puppeteer

## Notes

- Start with batch parallel (simpler) — e.g., concurrency of 3
- Pipeline approach is more complex but more efficient for I/O-bound stages
