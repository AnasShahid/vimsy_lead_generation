# Phase 4: PDF Report Generation — Context

**Captured:** 2026-02-11

## Vision

Generate branded, detailed PDF reports per analyzed site that showcase all findings from the technical analysis — security, performance, SEO, WordPress health, availability — along with AI-generated personalized sections (executive summary, recommendations, Vimsy pitch). Reports are the key deliverable attached to outreach emails and must look professional, be fully configurable in branding, and have dynamic content editable from the Settings panel without touching code.

## User Experience

- **After analysis completes**, a report generation job is automatically queued as a background task for that site
- **Analysis screen** stays unlocked and usable — shows "Analyzed" status alongside a "Generating Report" indicator when the report job is running
- **Reports screen** shows all sites with finished analysis, with report status (queued / generating / completed / failed)
- Reports can be **opened and viewed in-browser** (inline PDF viewer or HTML preview) and **downloaded as PDF**
- **Manual trigger**: user can generate a report for any analyzed site at any time, or bulk-generate for selected sites
- **Regenerate**: a "Regenerate Report" button re-runs the entire report pipeline (re-reads latest analysis data, re-generates AI sections, re-renders PDF) and replaces the stored version
- The report is **tied to the site record** so it can be attached to outreach emails in Phase 5

## Essentials

Things that MUST be true:
- Report covers all analysis dimensions: security (SSL, headers, vulnerabilities), performance (PSI scores), SEO (score, meta, sitemap), WordPress health (version, plugins, theme, exposure), availability (uptime, response time)
- AI-generated sections are personalized using business context already in DB: `company_name`, `industry_segment`, `ai_fit_reasoning`, `page_title`, `meta_description`, `country`, plus all analysis scores and findings
- Three AI-generated sections: **Executive Summary** (key findings overview), **Recommendations** (actionable fixes), **Vimsy Pitch** (personalized CTA explaining how Vimsy can help)
- AI content is generated once at report creation time and stored in DB (not on-the-fly)
- Regenerate re-runs everything from scratch using latest data
- HTML template lives on disk as Handlebars (`.hbs`) files — layout and structure managed as code
- Dynamic content (logo, brand color, company name, disclaimer, CTA text, contact info) configurable from Settings panel and stored in DB
- PDF rendered via Puppeteer (HTML → PDF)
- Reports stored on disk (or as blobs) and downloadable from UI
- Report generation is a background job — does not block the UI
- Auto-queued after analysis completes; also manually triggerable (single + bulk)
- Analysis screen shows report generation status without blocking interaction

## Boundaries

Things to explicitly AVOID:
- Do NOT make the HTML template editable from the UI — templates are files on disk, only content/branding settings are in the UI
- Do NOT require a fixed page count (no "7-page" constraint) — report length adapts to the data available
- Do NOT generate AI content on every PDF view/download — generate once, store, serve from cache
- Do NOT block the analysis screen while reports generate — fully async background jobs
- Do NOT store reports only in memory — they must persist to disk/DB for later download and email attachment

## Implementation Notes

Specific technical preferences mentioned:
- **Puppeteer** for HTML-to-PDF rendering
- **Handlebars** (or similar) for HTML templating with placeholders
- Template files on disk (e.g., `server/src/templates/report.hbs`)
- Settings panel gets a new **"Report Branding"** tab with fields:
  - Logo URL / image upload
  - Primary brand color
  - Company name (default: "Vimsy")
  - Disclaimer text
  - CTA / pitch closing paragraph (default text, AI can augment)
  - Contact info (email, phone, website)
- AI generation uses **OpenRouter** (same as existing AI analyzer) with a report-specific prompt
- Report data model: `site_reports` table with columns for site_id, status, pdf_path, ai_executive_summary, ai_recommendations, ai_pitch, generated_at, etc.
- Background job system: reuse existing job infrastructure (same pattern as analysis jobs)
- API endpoints needed:
  - `POST /api/reports/generate` — trigger report generation (single or bulk)
  - `GET /api/reports/:siteId` — get report metadata + download URL
  - `GET /api/reports/:siteId/pdf` — serve the PDF file
  - `POST /api/reports/:siteId/regenerate` — regenerate report
  - `GET /api/reports` — list all reports with status
- Client: new Reports page/tab showing report queue and completed reports, with view + download actions

## Open Questions

Things to decide during planning:
- Exact report section ordering and visual layout (can be iterated during implementation)
- Whether to store PDFs on disk as files or as BLOBs in SQLite (disk files likely better for size)
- AI prompt design for the three generated sections — what tone, length, and structure
- Whether the in-browser viewer should render the PDF directly or show an HTML preview
- Report filename convention (e.g., `vimsy-report-{domain}-{date}.pdf`)

---
*This context informs planning. The planner will honor these preferences.*
