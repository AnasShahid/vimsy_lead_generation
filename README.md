# Vimsy Lead Generation Platform

Automated lead generation pipeline for Vimsy, a WordPress maintenance service. Discovers WordPress sites, enriches contacts, analyzes technical health, and prepares personalized outreach — so the team closes deals instead of finding them.

## Pipeline

| # | Step | Status |
|---|------|--------|
| 1 | **Discovery** — WordPress sites via URL entry, CSV import, BuiltWith, Wappalyzer, Hunter.io. AI-enriched with industry, fit reasoning, priority. | Done |
| 2 | **Contact Enrichment** — Decision-maker emails via Hunter.io domain search. | Done |
| 3 | **Technical Analysis** — PageSpeed, SSL/TLS, security headers, availability, HTTP-based WordPress scanning, vulnerability matching. Deduction-based 0-100 health score with auto-priority classification. | Done |
| 4 | **PDF Reports** — Branded per-site report with findings and Vimsy value prop. | Planned |
| 5 | **Cold Email Outreach** — 4-sequence campaign via Instantly.ai with personalization and tracking. | Planned |
| 6 | **Dashboard & Metrics** — Pipeline funnel, conversion rates, time-series charts. | Planned |

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Server** | Node.js 20, Express 4, TypeScript, SQLite (better-sqlite3) |
| **Client** | React 18, Vite 5, Tailwind CSS 3, React Router, Lucide icons |
| **AI** | OpenRouter SDK (GPT-4o, Gemini, Claude) |
| **Infra** | Docker Compose — server, client (Nginx), optional WPScan container |
| **Monorepo** | npm workspaces: `client/`, `server/`, `shared/` |

## Setup

### Development

```bash
npm install
cp .env.example .env   # fill in API keys
npm run dev             # client :5173, server :3001
```

### Production (Docker)

```bash
npm run docker:up       # client :3000, server :3001
```

### API Keys

All optional — configure in `.env` based on which pipeline steps you use:

| Variable | Service | Step |
|----------|---------|------|
| `BUILTWITH_API_KEY` | [BuiltWith](https://builtwith.com/api) | Discovery |
| `WAPPALYZER_API_KEY` | [Wappalyzer](https://www.wappalyzer.com/api) | Discovery |
| `HUNTER_API_KEY` | [Hunter.io](https://hunter.io/api) | Discovery, Enrichment |
| `OPENROUTER_API_KEY` | [OpenRouter](https://openrouter.ai/keys) | AI Analysis |
| `GOOGLE_API_KEY` | [Google Cloud](https://console.cloud.google.com/) | PageSpeed Insights |
| `WPSCAN_API_TOKEN` | [WPScan](https://wpscan.com/register) | Enhanced WP scanning (optional — HTTP scanner works without it) |

## Project Structure

```
├── client/             # React + Vite frontend
│   └── src/
│       ├── components/ # UI components
│       ├── hooks/      # Custom React hooks
│       └── data/       # Static data / constants
├── server/             # Express + SQLite backend
│   └── src/
│       ├── db/         # Schema & queries
│       ├── routes/     # API endpoints
│       └── services/   # Discovery, enrichment, analysis logic
├── shared/             # Shared TypeScript types
├── docker/             # Dockerfiles, Nginx config
├── directives/         # Markdown SOPs for AI agent workflows
├── data/               # SQLite database (gitignored)
└── CLAUDE.md           # AI agent operating instructions
```

## License & Usage Restrictions

**This project cannot be used for commercial distribution or resale.**

Several third-party APIs and tools integrated into this pipeline have license terms that prohibit or restrict commercial redistribution:

- **WPScan** — Licensed under a [non-commercial license](https://github.com/wpscanteam/wpscan/blob/master/LICENSE). Commercial use requires a separate license from WPScan/Automattic.
- **Hunter.io** — [Terms of service](https://hunter.io/terms-of-service) restrict commercial redistribution of data obtained through their API.
- **BuiltWith** — [Usage terms](https://builtwith.com/terms) govern commercial redistribution of data from their service.
- **Google PageSpeed Insights** — Subject to [Google API Terms of Service](https://developers.google.com/terms) with restrictions on commercial redistribution of results.

This is an **internal tool** for Vimsy's lead generation team. If you fork or adapt this codebase for commercial purposes, you must independently review and comply with each integrated API's license and terms of service.
