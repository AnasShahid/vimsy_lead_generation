# Todo: OpenRouter AI Analysis + Settings Screen

**Created:** 2026-02-09
**Area:** ai-analysis, settings, discovery
**Priority:** high

## Description

Customize AI analysis in Phase 1 with the following requirements:

### 1. OpenRouter Integration
- Replace direct OpenAI integration with OpenRouter API (`https://openrouter.ai/api/v1`)
- OpenRouter allows using different models/providers with a single API key
- `OPENROUTER_API_KEY` in `.env` file (replaces `OPENAI_API_KEY`)

### 2. Platform Settings Screen
- New settings page/screen in the platform UI
- Accessible from the navigation/sidebar
- Stores settings in the SQLite database (new `settings` table)

### 3. AI Analysis Settings Section
- **Model selector dropdown** — list of flagship and fast models:
  - OpenAI: `gpt-4o`, `gpt-4o-mini`
  - Gemini: `google/gemini-2.0-flash`, `google/gemini-2.5-pro`
  - Claude: `anthropic/claude-sonnet-4`, `anthropic/claude-3-5-haiku`
- **Analysis prompt editor** — textarea to view/modify the AI analysis prompt
- **Default Vimsy prompt** — craft a best-practice prompt for Vimsy's use case (WordPress maintenance service targeting businesses that depend on their WP site but lack dedicated dev teams)
- Save button persists model + prompt to DB
- During AI analysis, the service reads the saved model and prompt from DB

### 4. Database Storage
- New `settings` table with key-value pairs
- Keys: `ai_model`, `ai_analysis_prompt`
- Settings API endpoints (GET/PUT)

## Context

User request during Phase 1 verification. The current AI analyzer uses hardcoded OpenAI with `gpt-4o-mini` and a static prompt. This todo makes it configurable via UI.

## Related Files

- `server/src/services/ai-analyzer.ts` — Current AI analysis service (uses OpenAI directly)
- `.env.example` — Currently has `OPENAI_API_KEY` and `AI_MODEL`
- `client/src/pages/DiscoveryPage.tsx` — Discovery page (settings link needed)
- `server/src/db/schema.sql` — Will need `settings` table

## Notes

- OpenRouter is API-compatible with OpenAI SDK, so the migration should be straightforward (change base URL + API key)
- The prompt should follow best practices: role definition, structured output format, few-shot examples, Vimsy business context
- Settings should have sensible defaults so the platform works out of the box
