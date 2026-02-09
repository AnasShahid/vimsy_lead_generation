# Todo: Rewrite Hunter.io Provider to Use /discover API with Filters

**Created:** 2026-02-09
**Area:** discovery, hunter, api
**Priority:** high

## Description

Replace the current Hunter.io lead list import provider with the Hunter.io `/discover` API endpoint. The current implementation fetches leads from a pre-existing lead list — instead, we want to discover companies dynamically using filter criteria.

The Hunter.io Discover API (`POST https://api.hunter.io/v2/discover`) returns companies matching filters. It is a free endpoint. Each response returns up to 100 companies. Premium users can paginate with `offset` and `limit`.

### Filter Parameters (from API docs)

The Hunter tab in the UI should expose these filters:

- **similar_to** — Domain(s) to find similar companies (text input, comma-separated)
- **headquarters_location** — Country/city/continent/business_region (multi-select with include/exclude)
- **industry** — From [industries.json](https://hunter.io/files/industries.json) (multi-select with include/exclude)
- **headcount** — Employee count ranges: 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5001-10000, 10001+ (multi-select)
- **company_type** — educational, government agency, non profit, partnership, privately held, public company, self employed, self owned, sole proprietorship (multi-select with include/exclude)
- **year_founded** — Range with from/to (number inputs)
- **keywords** — Include/exclude with match mode (any/all) (text input, comma-separated)
- **technology** — From [technologies.json](https://hunter.io/files/technologies.json) (multi-select with include/exclude, match any/all)
- **funding** — Series, amount range, date range (advanced filters)

### Pagination

- Default 100 items per page
- Page number selector in UI (translates to offset = (page-1) * limit)
- Show total results from meta.results

### Post-Discovery Processing

After fetching companies from Discover API:
1. Run WordPress detection/analysis on each domain to populate: is_wordpress, wp_version, detected_theme, detected_plugins, ssl_valid, response_time_ms, page_title, etc.
2. Populate company_name, domain, industry from Discover API response
3. Populate emails_available_count from Discover API response (emails_count.total)
4. Do NOT set priority or ai_fit_reasoning — those come from AI analysis

### API Request Format

```
POST https://api.hunter.io/v2/discover?api_key=API_KEY
Content-Type: application/json

{
  "headquarters_location": { "include": [{ "country": "AU" }] },
  "industry": { "include": ["Software Development"] },
  "headcount": ["11-50", "51-200"],
  "technology": { "match": "any", "include": ["wordpress", "woocommerce"] }
}
```

### API Response Format

```json
{
  "data": [
    {
      "domain": "example.com",
      "organization": "Example Corp",
      "emails_count": { "personal": 10, "generic": 2, "total": 12 }
    }
  ],
  "meta": { "results": 500, "limit": 100, "offset": 0 }
}
```

### Rate Limits

- 5 requests per second, 50 requests per minute

## Context

User found that the current Hunter.io lead list import doesn't return company/domain data as expected. The Discover API is a better fit for finding new leads by criteria.

## Related Files

- `server/src/services/discovery/providers/hunter-leads.ts` — Current provider to rewrite
- `client/src/components/discovery/HunterLeadsForm.tsx` — Current form UI to rewrite with filter dropdowns
- `server/src/routes/discovery.ts` — Route that handles Hunter lead list fetching
- `shared/src/types.ts` — Shared types for HunterLeadsProviderConfig (needs update)

## Notes

- The Discover API is free but pagination requires Premium
- Industries list: https://hunter.io/files/industries.json
- Technologies list: https://hunter.io/files/technologies.json
- The form should use multi-select dropdowns for industry, technology, headcount, company_type
- Single-select or text inputs for similar_to, year_founded, keywords
