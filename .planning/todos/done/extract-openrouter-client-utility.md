# Todo: Extract OpenRouter API into reusable utility class

**Created:** 2026-02-11
**Area:** server/services
**Priority:** high

## Description

Extract the raw `fetch` OpenRouter API call (currently duplicated in `ai-analyzer.ts` and `ai-report-generator.ts`) into a shared utility class/function in a separate file (e.g., `server/src/services/openrouter.ts`).

The utility should:
- Be parameterised: accept model, messages, temperature, response_format, timeout
- Handle auth headers, error handling, rate limit detection, retries internally
- Expose a simple interface like `openrouter.chatCompletion({ model, messages, temperature })` 
- Callers should not need to implement fetch/headers/error-handling boilerplate

## Context

After replacing the broken `@openrouter/sdk` v0.8.0 with raw `fetch`, the same fetch+headers+error-handling code is now duplicated in two files. This should be DRY.

## Related Files

- `server/src/services/ai-analyzer.ts` — Uses raw fetch to OpenRouter (lines 70-96)
- `server/src/services/report/ai-report-generator.ts` — Uses raw fetch to OpenRouter (lines 188-211)

## Notes

- Consider whether to keep `@openrouter/sdk` in package.json or remove it entirely
- The utility should preserve rate-limit (429) detection for the analyzer's retry logic
