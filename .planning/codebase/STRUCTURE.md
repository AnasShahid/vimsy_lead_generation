# Codebase Structure

**Analysis Date:** 2026-02-07

## Directory Layout

```
automate_lead_generation/
├── .planning/              # Planning and analysis documents
│   └── codebase/          # Codebase analysis (ARCHITECTURE.md, STRUCTURE.md, etc.)
├── .tmp/                  # Temporary files (never commit, regenerated)
│   └── [intermediate outputs during processing]
├── .claude/               # Claude-related config
├── client/                # React frontend (Vite)
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   │   ├── layout/    # Layout wrapper, header, sidebar
│   │   │   ├── discovery/ # Discovery-specific components
│   │   │   └── [feature]/ # Feature-specific components
│   │   ├── pages/         # Page components (Dashboard, Discovery, etc.)
│   │   ├── App.tsx        # Main router
│   │   ├── main.tsx       # React bootstrap
│   │   └── index.css      # Global styles
│   ├── package.json       # Client dependencies
│   ├── vite.config.ts     # Vite build config
│   └── dist/              # Built output (not committed)
├── server/                # Express.js backend
│   ├── src/
│   │   ├── index.ts       # Server entry point (bootstrap, worker start)
│   │   ├── app.ts         # Express app setup, route mounting
│   │   ├── db/            # Database layer
│   │   │   ├── index.ts   # Database initialization, connection pooling
│   │   │   ├── schema.sql # SQLite schema
│   │   │   └── queries/   # Prepared queries
│   │   │       ├── jobs.ts  # Job CRUD operations
│   │   │       └── sites.ts # Site CRUD and filtering
│   │   ├── routes/        # Express route handlers
│   │   │   ├── discovery.ts # Job creation, listing, cancellation
│   │   │   ├── sites.ts     # Site queries and filters
│   │   │   └── csv.ts       # CSV export (if implemented)
│   │   ├── services/      # Business logic layer
│   │   │   ├── discovery/ # Discovery orchestration
│   │   │   │   ├── index.ts      # Provider registry
│   │   │   │   └── providers/    # Discovery implementations
│   │   │   │       ├── base.ts   # IDiscoveryProvider interface
│   │   │   │       ├── manual.ts
│   │   │   │       ├── google-search.ts
│   │   │   │       ├── directory.ts
│   │   │   │       ├── builtwith.ts
│   │   │   │       └── wappalyzer.ts
│   │   │   └── wordpress-detector.ts # WordPress detection logic
│   │   ├── workers/       # Background job processing
│   │   │   └── discovery-worker.ts # Poll-based job processor
│   │   ├── utils/         # Utility functions
│   │   │   ├── http.ts         # HTTP helpers
│   │   │   ├── csv.ts          # CSV parsing/generation
│   │   │   └── rate-limiter.ts # Rate limiting utility
│   │   └── types.ts       # Server-only types (if any)
│   ├── package.json       # Server dependencies
│   ├── tsconfig.json      # TypeScript config
│   └── dist/              # Built output (not committed)
├── shared/                # Shared code across workspaces
│   ├── types.ts           # Centralized type definitions
│   ├── package.json       # Shared package (published to other workspaces)
│   └── dist/              # Built types (not committed)
├── execution/             # Python deterministic scripts
│   ├── README.md          # Script patterns and templates
│   └── [future_scripts/]  # Scripts added as needed (e.g., scrape_site.py)
├── directives/            # Markdown SOPs (System Operating Procedures)
│   ├── README.md          # Directive template and guidelines
│   └── step1_discover_wordpress.md # Example directive
├── data/                  # Data storage
│   └── vimsy.db          # SQLite database file
├── docker/                # Docker configuration
│   ├── Dockerfile
│   └── [docker-compose setup files]
├── .env.example          # Environment variable template
├── .env                  # Environment variables (never commit)
├── .gitignore            # Git ignore rules
├── package.json          # Root package.json (workspace definitions)
├── package-lock.json     # Dependency lock file
├── CLAUDE.md             # Agent operating instructions
├── README.md             # Project overview
├── docker-compose.yml    # Docker Compose config
├── prototype.html        # Prototype or reference HTML
└── requirements.txt      # Python dependencies
```

## Directory Purposes

**client/src/components/**
- Purpose: Reusable React components
- Contains: Layout wrappers, discovery forms, results tables, navigation
- Key files: `Layout.tsx` (wrapper), `Header.tsx`, `Sidebar.tsx`

**client/src/pages/**
- Purpose: Full-page components for each main section
- Contains: Dashboard, Discovery, Enrichment, Analysis, Reports, Outreach, Tracking
- Pattern: Each page imports components and manages local state

**server/src/db/**
- Purpose: Database interaction layer
- Contains: SQLite schema, connection management, query builders
- Key files: `index.ts` (initialization), `schema.sql` (structure), `queries/*.ts` (CRUD)

**server/src/services/discovery/providers/**
- Purpose: Discovery strategy implementations
- Contains: Base interface, 5 provider implementations
- Pattern: Each provider fetches URLs from different source, returns standardized format

**server/src/workers/**
- Purpose: Background job processing
- Contains: Discovery job processor, job queue management
- Responsibilities: Poll database, execute jobs, handle cancellation, update progress

**shared/**
- Purpose: Type definitions shared across server and client
- Contains: Job, Site, Provider config, API response types
- Used by: Both client and server code via `@vimsy/shared` alias

**directives/**
- Purpose: SOPs written in Markdown for orchestration layer
- Contains: Step-by-step instructions for complex workflows
- Example: `step1_discover_wordpress.md` defines discovery process

**execution/**
- Purpose: Deterministic Python scripts for heavy lifting
- Contains: Templates and patterns, individual scripts (not yet added)
- Used by: Orchestration layer (Claude AI agent) via subprocess

## Key File Locations

**Entry Points:**
- `server/src/index.ts`: Server bootstrap, starts Express on port 3001 + background worker
- `client/src/main.tsx`: React bootstrap, mounts to DOM
- `client/src/App.tsx`: Router definition and page structure

**Configuration:**
- `.env`: Runtime environment variables (API keys, database path, etc.)
- `.env.example`: Template for required env vars
- `server/tsconfig.json`: TypeScript server config
- `client/vite.config.ts`: Vite dev server and build config
- `docker-compose.yml`: Local development Docker setup

**Core Logic:**
- `server/src/services/wordpress-detector.ts`: WordPress detection algorithm
- `server/src/workers/discovery-worker.ts`: Job queue processing loop
- `server/src/services/discovery/index.ts`: Provider registry and selection
- `shared/types.ts`: Complete type system for jobs, sites, providers

**Database:**
- `server/src/db/schema.sql`: Schema for jobs and sites tables
- `server/src/db/queries/jobs.ts`: Job creation, retrieval, status updates
- `server/src/db/queries/sites.ts`: Site CRUD, filtering, pagination
- `data/vimsy.db`: Actual database file (generated at runtime)

**Testing:**
- No test files found. Testing approach not yet established.

## Naming Conventions

**Files:**
- Route files: `[feature].ts` (e.g., `discovery.ts`, `sites.ts`)
- Service/provider files: Descriptive kebab-case (e.g., `wordpress-detector.ts`, `google-search.ts`)
- Query modules: `[resource].ts` (e.g., `jobs.ts`, `sites.ts`)
- Component files: PascalCase (e.g., `Layout.tsx`, `SiteResultsTable.tsx`)
- Utility files: kebab-case (e.g., `rate-limiter.ts`, `csv.ts`)
- Shared types: Single file `types.ts`

**Directories:**
- Feature grouping: PascalCase plurals (e.g., `components/`, `services/`, `routes/`)
- Sub-features: lowercase (e.g., `discovery/`, `providers/`)
- Query modules: `queries/` subdirectory of db

**Functions:**
- camelCase for all functions and methods
- Async functions prefix with `async` keyword (no naming convention)
- Callback functions named with `on*` pattern (e.g., `onProgress`, `onSuccess`)

**Types/Interfaces:**
- PascalCase for all types and interfaces
- Provider interface: `IDiscoveryProvider` (I prefix for interfaces)
- Config types: `[ProviderName]ProviderConfig` (e.g., `GoogleSearchProviderConfig`)
- Enums/types: All caps with underscores for union types (e.g., `JobStatus`, `DiscoveryProvider`)

## Where to Add New Code

**New Discovery Provider:**
- Implementation: `server/src/services/discovery/providers/[provider-name].ts`
- Must implement: `IDiscoveryProvider` interface from `base.ts`
- Register in: `server/src/services/discovery/index.ts` (add to `providers` object)
- Add type: `[ProviderName]ProviderConfig` in `shared/types.ts`

**New API Endpoint:**
- Create or edit: `server/src/routes/[feature].ts`
- Mount in: `server/src/app.ts` with `app.use('/api/[feature]', [feature]Routes)`
- Database queries: Add to `server/src/db/queries/[resource].ts`
- Types: Add to `shared/types.ts` for request/response shapes

**New Page/Feature (Frontend):**
- Page component: `client/src/pages/[FeatureName]Page.tsx`
- Sub-components: `client/src/components/[feature]/[Component].tsx`
- Add route: `client/src/App.tsx` (add Route entry)
- Add nav link: `client/src/components/layout/Sidebar.tsx` or `Header.tsx`

**New Utility:**
- Shared utility: `server/src/utils/[utility-name].ts`
- HTTP helpers: `server/src/utils/http.ts`
- Database helpers: `server/src/db/queries/` or as standalone in `db/index.ts`

**New Python Script:**
- Template location: `execution/README.md` contains script template
- Save as: `execution/[script_name].py`
- Use: Environment variables from `.env`, write outputs to `.tmp/`
- Document: Add section in relevant directive file

## Special Directories

**`.tmp/`:**
- Purpose: Intermediate files during processing (exports, temp data, logs)
- Generated: Yes, created during runtime
- Committed: No, in .gitignore
- Cleanup: Can be safely deleted, will be regenerated

**`data/`:**
- Purpose: SQLite database storage
- Generated: Yes, created when server starts
- Committed: No, contains user data
- Backup: Include `vimsy.db` in backups before production

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes, from package-lock.json
- Committed: No, in .gitignore
- Regenerate: `npm install` at root

**`.planning/codebase/`:**
- Purpose: Analysis documents for other GSD commands
- Generated: Yes, by mapping agent
- Committed: Yes, part of codebase intelligence
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

**`docker/`:**
- Purpose: Docker configuration files
- Contains: Dockerfile, docker-compose overrides
- Usage: Development environment setup, production container builds

---

*Structure analysis: 2026-02-07*
