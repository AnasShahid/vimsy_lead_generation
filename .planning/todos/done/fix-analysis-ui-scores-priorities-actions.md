# Todo: Fix Analysis UI — Score Colors, Priority/Action System, Layout

**Created:** 2026-02-11T17:22+05:00
**Area:** client/analysis
**Priority:** high

## Description

### 1. Fix Analysis Listing Page Score Display

The individual columns (Security, Performance, SEO) are always red because the scoring scale changed from 0-100 normalized percentages to actual category points (e.g. 22/30, 13/30, 19/20). The `ScoreCell` color thresholds still assume 0-100 scale.

- **1.1** Remove Tags column from the listing table UI (keep in DB, just hide from table).
- **1.2** Add a Vulnerabilities count column to the listing page table.

### 2. Rework Priority & Action System

Current priority badges and queue filters are confusing. Separate into two distinct concepts:

**Priorities** (based on health score, read-only classification):
- **Critical**: 0–40
- **High**: 41–60
- **Medium**: 61–75
- **Low**: 76–100

**Actions** (actionable status, user can switch between them):
- **Qualified**: 0–60 (auto-assigned for critical + high)
- **Manual Review**: 61–75 (auto-assigned for medium)
- **Maintenance**: 76–100 (auto-assigned for low)
- Users should be able to manually switch a site between Qualified, Manual Review, and Maintenance.

### Implementation Notes

- `ScoreCell` in `AnalysisPage.tsx` needs score-relative-to-max color logic (e.g. 22/30 = 73% = yellow, not red)
- Queue filters should use the Action categories (Qualified, Manual Review, Maintenance) instead of current confusing labels
- Need a new `action_status` field or repurpose existing `priority_classification` for the switchable action
- Add API endpoint or inline update for switching action status

## Context

Follows the scoring overhaul commit that changed sub-scores from normalized 0-100 to actual category points. The UI color thresholds weren't updated to match.

## Related Files

- `client/src/pages/AnalysisPage.tsx` — ScoreCell, PriorityBadge, QueueFilters usage, table columns
- `client/src/components/analysis/QueueFilters.tsx` — Filter tabs and counts
- `client/src/components/analysis/ScoreBreakdown.tsx` — Already updated with new scoring
- `server/src/routes/analysis.ts` — API returns analysis summary (may need action_status)
- `server/src/services/analysis/scoring.ts` — Priority classification logic

## Notes

- Score color thresholds for sub-scores should be relative to their max (30 or 20), not absolute 0-100
- The action status should be auto-assigned on analysis but manually overridable by user
- Tags column removal is UI-only — keep tag data in DB and detail view
