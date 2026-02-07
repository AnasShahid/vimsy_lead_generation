# Coding Conventions

**Analysis Date:** 2026-02-07

## Naming Patterns

**Files:**
- Backend: camelCase for utility/helper files (e.g., `rate-limiter.ts`, `wordpress-detector.ts`), PascalCase for class-based service files (e.g., discovery providers)
- Frontend: PascalCase for component files (e.g., `GoogleSearchForm.tsx`, `DiscoveryPage.tsx`)
- React components: Always PascalCase for both files and exported function names
- Utilities: camelCase with hyphens for multiword utilities (e.g., `rate-limiter.ts`, `http.ts`)

**Functions:**
- camelCase for all functions: `fetchUrl()`, `normalizeUrl()`, `detectWordPress()`, `upsertSite()`, `getProvider()`
- React hooks: `useApi()`, `usePolling()` - camelCase with `use` prefix per React conventions
- Async functions: No special prefix, handled with `async` keyword

**Variables:**
- camelCase for local variables and constants: `pollTimer`, `validProviders`, `selectedTab`
- Database column names: snake_case in queries and type definitions (e.g., `discovery_source`, `wp_version`, `is_wordpress`)
- State variables in React: camelCase (e.g., `activeTab`, `submitting`, `hasActiveJobs`)

**Types:**
- PascalCase for interfaces: `HttpResponse`, `IDiscoveryProvider`, `Job`, `Site`, `DiscoveryProvider`
- camelCase for type aliases: `ProviderConfig`, `ProgressCallback`
- Prefix interfaces with `I` when defining contracts: `IDiscoveryProvider`
- Use `type` for unions and aliases, `interface` for object contracts

## Code Style

**Formatting:**
- No ESLint or Prettier config detected - relies on TypeScript compiler settings
- 2-space indentation (inferred from package.json and source files)
- Semicolons present throughout - enforced via TypeScript

**Linting:**
- TypeScript strict mode enabled in all workspaces
- `noUnusedLocals: true` in client tsconfig (enforced)
- `noUnusedParameters: true` in client tsconfig (enforced)
- `noFallthroughCasesInSwitch: true` in client tsconfig (enforced)
- Server uses strict mode: `"strict": true`

**Import Organization:**
- Order: external packages first, then relative imports
- Type imports use `import type` keyword (preferred pattern)
- Example from `http.ts`:
  ```typescript
  import https from 'https';
  import http from 'http';
  import { URL } from 'url';

  export interface HttpResponse { ... }
  export async function fetchUrl(...) { ... }
  ```

**Path Aliases:**
- Workspace imports use scoped packages: `import type { Site } from '@vimsy/shared'`
- Projects defined as workspaces in root `package.json`: `shared`, `server`, `client`

## Error Handling

**Patterns:**
- Try-catch for async operations and data access
- Error messages propagated as strings: `err.message`
- In route handlers: caught errors returned as JSON with `success: false` and `error` field
- Route pattern from `discovery.ts`:
  ```typescript
  try {
    // operation
    return res.status(201).json({ success: true, data: job });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
  ```
- In React components: errors captured in state and displayed or silently logged
- Silent catch blocks used in polling/background fetches where failures are expected to be temporary

## Logging

**Framework:** console (console.log, console.error)

**Patterns:**
- Prefixed log messages with bracketed scope: `[Server]`, `[DB]`, `[Worker]`, `[HTTP]`
- Used in critical paths: server startup, database initialization, worker events
- Example: `console.log('[Server] Running on http://localhost:${PORT}')`
- Error logging with context: `console.error('[Worker] Job ${job.id} failed: ${err.message}')`
- No centralized logging framework; direct console usage throughout

## Comments

**When to Comment:**
- Comments sparse in main logic but present for clarification
- Rate limiter has explanatory header: `/** Simple token-bucket rate limiter. */`
- Validation logic documented with inline comments for provider configuration validation
- Provider methods documented with JSDoc-style comments describing discovery and validation

**JSDoc/TSDoc:**
- Used for public method contracts in service classes
- Example from `base.ts`:
  ```typescript
  /**
   * Discover URLs. These may or may not be WordPress sites —
   * WordPress detection is handled separately by WordPressDetector.
   */
  discover(config: ProviderConfig, signal: AbortSignal, onProgress: ProgressCallback): Promise<DiscoveredUrl[]>;
  ```
- TSDoc rarely used; comments rely on TypeScript type hints

## Function Design

**Size:** Functions kept under 80 lines typically; utility functions under 40 lines

**Parameters:**
- Named parameters for readability: avoid positional params beyond 2-3
- Objects used for config: `{ timeout?, followRedirects?, maxRedirects? }`
- Required params first, optional params second
- Signal parameter used for cancellation in async discovery: `signal: AbortSignal`

**Return Values:**
- Promise-based for async operations
- Objects returned with full state: `{ valid: boolean; errors: string[] }` for validation
- Type-safe returns using generics: `Promise<DiscoveredUrl[]>`
- Nullable returns use `| null` explicitly: `Site | null`

## Module Design

**Exports:**
- Named exports preferred: `export function getDb()`, `export const api = { ... }`
- Type exports use `export type` or `export interface`
- Barrel exports in index files: `export { IDiscoveryProvider }` from `src/services/discovery/index.ts`

**Barrel Files:**
- Used in `src/services/discovery/index.ts` to expose discovery providers
- Used in client page imports (implicit via routing)
- Database query functions grouped in `db/queries/` directory with barrel access pattern

**Constants:**
- Shared constants defined at module top or in separate config sections
- Rate limiter configuration: `export const rateLimiters = { scraping: ..., builtwith: ..., ... }`
- Poll intervals: `const POLL_INTERVAL_MS = 2000`
- Valid provider lists: `const VALID_PROVIDERS: DiscoveryProvider[] = [...]`

## Database Conventions

**Query Building:**
- Parameterized queries used throughout: `db.prepare('...').get(...params)`
- SQL string literals with placeholders: `?` for parameters
- No string concatenation for dynamic fields except in allowlisted column names
- Safe sort/order building: `allowedSortColumns.includes(sortBy)` check in `sites.ts`

**Data Normalization:**
- Helper function `normalizeSiteRow()` converts database booleans (0/1) to proper booleans
- Conversion pattern: `is_wordpress: Boolean(row.is_wordpress)`

## React Component Patterns

**Functional Components:**
- All React components are functional (no class components)
- Hooks used for state management: `useState`, `useCallback`, `useEffect`
- Custom hooks in `src/hooks/`: `useApi`, `usePolling`

**Props:**
- Interface-based prop definitions: `interface GoogleSearchFormProps { ... }`
- Destructured in component signature: `export function GoogleSearchForm({ onSubmit, loading }: GoogleSearchFormProps)`

**Tailwind Styling:**
- All styling via Tailwind CSS utility classes
- Responsive classes used: `grid grid-cols-3`
- Spacing utilities: `space-y-3`, `gap-3`, `px-3`, `py-2`
- Form styling: `focus:ring-2 focus:ring-primary-500 focus:border-primary-500`

---

*Convention analysis: 2026-02-07*
