# Architecture

**Analysis Date:** 2026-02-07

## Pattern Overview

**Overall:** Monorepo with 3-tier architecture (Directives → Orchestration → Execution). The web platform follows a client-server pattern with asynchronous job processing.

**Key Characteristics:**
- **Workspace monorepo**: Shared types, Node server, React client co-located
- **Async job queue**: Background worker processes discovery jobs sequentially
- **Plugin provider pattern**: Discovery providers implement common interface, pluggable
- **SQLite persistence**: Lightweight persistent database for sites and jobs
- **Two-phase discovery**: URL discovery first, then WordPress detection on each URL

## Layers

**Frontend (Client):**
- Purpose: React UI for managing discovery jobs, viewing results, controlling pipeline
- Location: `client/src/`
- Contains: React components, pages, routing logic
- Depends on: Backend API, React Router, shared types
- Used by: End users via browser

**API Server:**
- Purpose: Express.js REST API handling job management, site queries, provider routing
- Location: `server/src/`
- Contains: Route handlers, service orchestration, database queries
- Depends on: Better-sqlite3, Express, shared types
- Used by: Frontend client, background workers

**Services Layer:**
- Purpose: Business logic for discovery and WordPress detection
- Location: `server/src/services/`
- Contains: Provider implementations, WordPress detection logic
- Depends on: HTTP clients, external APIs
- Used by: Routes and workers

**Worker/Queue Layer:**
- Purpose: Background job processing, handles long-running discovery operations
- Location: `server/src/workers/discovery-worker.ts`
- Contains: Job poll loop, job lifecycle management
- Depends on: Provider services, database queries
- Used by: Started at server initialization, runs continuously

**Data Access Layer:**
- Purpose: Database interaction and query abstraction
- Location: `server/src/db/`
- Contains: Schema, prepared queries for jobs and sites
- Depends on: Better-sqlite3
- Used by: Routes, workers, services

**Shared Types:**
- Purpose: Centralized type definitions across all layers
- Location: `shared/types.ts`
- Contains: Job, Site, Provider configs, API response types
- Depends on: TypeScript only
- Used by: Client, server, all business logic

**Deterministic Execution Scripts:**
- Purpose: External Python tools for complex tasks (future integration)
- Location: `execution/`
- Contains: Template and patterns for Python scripts
- Depends on: Environment variables, external APIs
- Used by: Orchestration layer via subprocess calls

## Data Flow

**Discovery Job Flow:**

1. **User initiates job** → Frontend calls `POST /api/discovery/jobs` with provider and config
2. **Route validates** → `discoveryRoutes.post()` validates provider exists and config is valid
3. **Job created** → `createJob()` inserts pending job into database
4. **Worker polls** → `discovery-worker.ts` checks for pending discovery jobs every 2000ms
5. **Provider executes** → `getProvider()` returns provider instance, calls `discover()` method
6. **URLs discovered** → Provider returns array of `DiscoveredUrl[]`
7. **WordPress detection** → For each discovered URL, calls `detectWordPress()`
8. **Sites saved** → `saveSiteFromDetection()` stores detected sites in database
9. **Job completes** → Status updated to 'completed', progress reaches 100%

**Progress Tracking:**
- Discovery phase: 0-50% (URLs found)
- Detection phase: 50-100% (WordPress checks)
- Frontend polls `GET /api/discovery/jobs/:id` for status updates

**Site Query Flow:**

1. User filters sites on frontend
2. Frontend calls `GET /api/sites` with filter params
3. `sitesRoutes.get()` converts query params to `SiteFilterParams`
4. `listSites()` builds SQL query with WHERE/ORDER clauses
5. Results paginated and returned to frontend

## Key Abstractions

**IDiscoveryProvider Interface:**
- Purpose: Standardizes how discovery sources are integrated
- Examples: `server/src/services/discovery/providers/*.ts` (Manual, GoogleSearch, Directory, BuiltWith, Wappalyzer)
- Pattern: Each provider implements `discover(config, signal, onProgress)` → returns `DiscoveredUrl[]`
- Provider registry: `server/src/services/discovery/index.ts` maps provider name to instance

**Job Queue:**
- Purpose: Reliable async job processing without external queue service
- Pattern: Poll-based (not event-driven), one job at a time, stored in SQLite
- Cancellation: `AbortController` signals job to stop gracefully
- Status tracking: Pending → Running → Completed/Failed/Cancelled

**WordPress Detector:**
- Purpose: Unified detection logic called by both routes and workers
- Location: `server/src/services/wordpress-detector.ts`
- Checks: Meta generator tags, wp-content paths, wp-json endpoint, readme.html, X-Powered-By header
- Returns: `WPDetectionResult` with version, plugins, confidence score

**Database Schema:**
- Jobs table: Tracks job state, progress, provider config
- Sites table: Discovered/enriched sites with WordPress detection results
- Indexes on: domain, is_wordpress, pipeline_stage, status (for query performance)

## Entry Points

**Server Entry Point:**
- Location: `server/src/index.ts`
- Triggers: `npm run start` or `npm run dev:server`
- Responsibilities: Load environment, initialize database, start worker, start Express server on port 3001

**Client Entry Point:**
- Location: `client/src/main.tsx`
- Triggers: `npm run dev:client` (Vite dev server)
- Responsibilities: Bootstrap React app, render to DOM, initialize router

**API Entry Points:**
- `POST /api/discovery/jobs` - Create new discovery job
- `GET /api/discovery/jobs` - List jobs with optional status filter
- `GET /api/discovery/jobs/:id` - Get job details
- `DELETE /api/discovery/jobs/:id` - Cancel running job
- `POST /api/discovery/detect` - One-off WordPress detection (no job created)
- `GET /api/sites` - List sites with filters, pagination
- `GET /api/sites/:id` - Get single site details
- `DELETE /api/sites/:id` - Delete site record

## Error Handling

**Strategy:** Try-catch in routes with error responses, fail-fast in workers with status updates

**Patterns:**
- Routes return `{ success: false, error: "message" }` on exception
- HTTP status codes: 400 (bad request), 404 (not found), 500 (server error)
- Worker catches provider errors and updates job status to 'failed' with error message
- WordPress detection errors are logged but don't stop job (per-URL isolation)
- Provider validation errors returned with detailed messages before job execution

## Cross-Cutting Concerns

**Logging:** Console.log with prefixes (`[Server]`, `[Worker]`, `[DB]`) for traceability

**Validation:** Provider config validated on route creation and again before worker execution. Type safety via TypeScript.

**Authentication:** Not implemented. Routes are publicly accessible. Future: add middleware for API key/JWT.

**Rate Limiting:** Utility exists (`server/src/utils/rate-limiter.ts`) but not applied to routes. External API rate limits handled per-provider.

**CORS:** Enabled globally on Express app for client access

**Database Concurrency:** WAL mode enabled for better concurrent reads while processing

---

*Architecture analysis: 2026-02-07*
