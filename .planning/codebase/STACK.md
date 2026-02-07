# Technology Stack

**Analysis Date:** 2026-02-07

## Languages

**Primary:**
- TypeScript 5.3.3 - Server and client application logic
- JavaScript - Runtime execution

**Secondary:**
- Python - Optional for advanced data processing (listed in requirements.txt but not integrated into main codebase)
- SQL - Database schema and queries

## Runtime

**Environment:**
- Node.js 20 (Alpine-based in Docker)
- Browser runtime for client

**Package Manager:**
- npm 10.x (inferred from Node.js 20)
- Lockfile: package-lock.json (present)

## Frameworks

**Core:**
- Express 4.18.2 - REST API server framework
- React 18.2.0 - UI component library
- React Router DOM 6.21.1 - Client-side routing

**Build/Dev:**
- Vite 5.0.8 - Client bundler and dev server
- TypeScript Compiler (tsc) - TypeScript compilation
- tsx 4.7.0 - TypeScript runtime for development

**Build/CSS:**
- Tailwind CSS 3.4.0 - Utility-first CSS framework
- PostCSS 8.4.32 - CSS transformation pipeline
- Autoprefixer 10.4.16 - Browser vendor prefixing

## Key Dependencies

**Critical:**
- better-sqlite3 11.7.0 - Local embedded SQLite database with Node.js bindings
- cheerio 1.0.0 - jQuery-like HTML parsing (used for web scraping)
- csv-parse 5.5.3 - CSV parsing utility
- csv-stringify 6.4.5 - CSV stringification utility
- express 4.18.2 - Web framework
- uuid 9.0.0 - Unique identifier generation

**HTTP & Network:**
- cors 2.8.5 - Cross-Origin Resource Sharing middleware

**File Upload:**
- multer 1.4.5-lts.1 - Multipart form data handling for file uploads

**UI Components:**
- lucide-react 0.303.0 - Icon library

**Dev Tools:**
- concurrently 8.2.2 - Run multiple npm scripts concurrently
- @types packages - TypeScript type definitions for dependencies
- @vitejs/plugin-react 4.2.1 - Vite plugin for React support

## Configuration

**Environment:**
- `.env.example` contains required configuration template
- Environment variables configurable at runtime via `.env` file
- Key configs include:
  - `PORT` (default 3001 for server, 3000 for client)
  - `NODE_ENV` (development/production)
  - API keys for BuiltWith, Wappalyzer, Hunter.io, Clearbit, Google Cloud
  - Google OAuth credentials path

**Build:**
- TypeScript configs per workspace: `server/tsconfig.json`, `client/tsconfig.json`, `shared/tsconfig.json`
- Vite config: `client/vite.config.ts`
- Docker: `docker/Dockerfile.server`, `docker/Dockerfile.client`
- Nginx: `docker/nginx.conf`

## Platform Requirements

**Development:**
- Node.js 20+ (LTS)
- npm 10.x
- Recommended: macOS/Linux/WSL2 (for native better-sqlite3 compilation)

**Production:**
- Docker (Docker Compose for orchestration)
- Container runtime (Docker daemon)
- Nginx for reverse proxy (in client container)
- Node.js runtime in Alpine container

## Workspace Structure

The project uses npm workspaces with three independent packages:

**Shared Package (@vimsy/shared):**
- Location: `shared/`
- Purpose: Shared TypeScript type definitions
- Main export: `types.ts` compiled to `dist/types.d.ts`

**Server Package (@vimsy/server):**
- Location: `server/`
- Dependencies: better-sqlite3, cheerio, express, cors, csv-parse/stringify, uuid, dotenv
- Entry point: `src/index.ts` → compiled to `dist/index.js`

**Client Package (@vimsy/client):**
- Location: `client/`
- Dependencies: React, React Router, Lucide React, Tailwind CSS
- Entry point: `src/main.tsx` (Vite default)
- ESM module type

## Database

**Storage:**
- SQLite via better-sqlite3
- Database location: `data/vimsy.db` (local filesystem)
- Schema: `server/src/db/schema.sql`
- Tables: `jobs`, `sites`
- Features: WAL (Write-Ahead Logging), foreign key constraints enabled
- Data persisted in Docker volume: `./data:/app/data`

---

*Stack analysis: 2026-02-07*
