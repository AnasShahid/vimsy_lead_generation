# Debug: Analysis Scoring & WPScan Issues

**Started:** 2026-02-11T16:11+05:00
**Status:** resolved

## Root Causes Found

1. **WPScan gated by is_wordpress flag** — `index.ts:88` had `if (isWordPress)` check, sites with `is_wordpress=0` were never scanned even though HTTP scanner can detect WP.
2. **Vulnerabilities completely ignored in scoring** — `calculateSecurityDeduction()` never used the `vulnerabilities` input. 20 vulns = zero impact.
3. **Performance sub-score was normalized %** — PSI 60 → deduction 15 → (30-15)/30*100 = 50. Confusing because it doesn't match the raw PSI score.
4. **Accessibility/Best Practices unused** — `calculatePerformanceDeduction()` only used `pagespeed.performance`, ignored other PSI categories.
5. **Availability hardcoded null in UI** — `ScoreBreakdown.tsx:85` had `score={null}`. No DB column. Not saved by orchestrator.
6. **No anti-bot detection** — Cloudflare-blocked sites reported as "site unreachable" instead of "anti-bot blocked".

## Resolution

**Fixes applied across 8 files:**

- `scoring.ts` — Rewritten: proportional performance (weighted PSI 60%/20%/20%), vulnerability severity deductions (10pts), sub-scores as actual category points
- `availability.ts` — Added `detectAntiBot()` for Cloudflare/CAPTCHA detection
- `index.ts` — WPScan now runs for ALL sites; saves availability_score + seo_score
- `migrations.ts` — Added `availability_score` and `seo_score` columns
- `analyses.ts` — Added new columns to allowed fields
- `shared/types.ts` — Added `availability_score` and `seo_score` to SiteAnalysis
- `analysis.ts` route — Returns new score fields in API
- `ScoreBreakdown.tsx` — Shows actual points (e.g. 22/30), accepts availabilityScore
- `AnalysisDetail.tsx` — Passes seoScore + availabilityScore to ScoreBreakdown
- `AnalysisPage.tsx` — Uses seo_score with wp_health_score fallback

**Verified:** scandikitchen.co.uk 75/100 (22+13+20+20), photofocus.com 73/100 (17+17+19+20)
