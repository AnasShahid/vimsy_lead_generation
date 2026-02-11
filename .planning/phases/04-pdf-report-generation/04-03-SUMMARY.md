---
phase: 4
plan: 3
name: Handlebars Template & PDF Renderer
status: completed
completed: 2026-02-11
---

# Plan 3 Summary: Handlebars Template & PDF Renderer

## What was done

- Installed `handlebars` and `puppeteer` as server dependencies
- Created `server/src/templates/report.hbs` — full Handlebars HTML template with inline CSS for A4 print layout, containing all sections:
  1. Cover Page (logo/text, domain, company, date, accent color)
  2. Executive Summary (AI-generated)
  3. Health Score Overview (circular score, priority badge, category bar charts)
  4. Performance Details (PSI grid: Performance, Accessibility, SEO, Best Practices)
  5. Security Analysis (SSL status, issuer, expiry, protocol, vulnerabilities)
  6. WordPress Health (conditional — version, theme, plugins table, exposure warnings)
  7. SEO Overview (score, meta description, page title)
  8. Recommendations (AI-generated)
  9. About / CTA (AI pitch, branding CTA, contact grid)
  10. Disclaimer footer
- Created `server/src/services/report/pdf-renderer.ts` with:
  - Puppeteer browser lifecycle management (initBrowser, closeBrowser, lazy init)
  - Template compilation with caching (re-reads in dev)
  - Handlebars helpers: if_eq, if_lt, or, score_color, score_color_100, score_color_pct, score_bar, format_date, format_number
  - Markdown-to-HTML converter for AI content
  - Template context builder (parses JSON fields, maps branding settings)
  - `renderReportPdf()` — renders HTML → PDF via Puppeteer, saves to `data/reports/`
  - Filename convention: `vimsy-report-{domain}-{YYYY-MM-DD}.pdf`

## Files created
- `server/src/templates/report.hbs`
- `server/src/services/report/pdf-renderer.ts`

## Files modified
- `server/package.json` (added handlebars, puppeteer)

## Verification
- Server TypeScript compiles cleanly
- Dependencies importable
