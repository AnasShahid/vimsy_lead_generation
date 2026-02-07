# Agentic Automation System

A 3-layer architecture for reliable AI-powered automation.

## Architecture

- **Layer 1: Directives** (`directives/`) - SOPs in Markdown defining what to do
- **Layer 2: Orchestration** - AI agent making intelligent routing decisions
- **Layer 3: Execution** (`execution/`) - Deterministic Python scripts doing the work

## Setup

1. Copy `.env.example` to `.env` and fill in your API keys
2. Install dependencies: `pip install -r requirements.txt`
3. For Google APIs, place `credentials.json` in the root directory

## Directory Structure

```
.
├── directives/          # Markdown SOPs
├── execution/           # Python scripts
├── .tmp/               # Temporary files (never commit)
├── .env                # Environment variables (never commit)
└── credentials.json    # Google OAuth (never commit)
```

## Usage

See `CLAUDE.md` for detailed agent instructions.
