-- Vimsy Lead Gen - Database Schema

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT,
  config TEXT,
  progress INTEGER DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  error TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  is_wordpress INTEGER DEFAULT 0,
  wp_version TEXT,
  detected_theme TEXT,
  detected_plugins TEXT,
  discovery_source TEXT,
  discovery_job_id TEXT REFERENCES jobs(id),
  discovery_date TEXT DEFAULT (datetime('now')),
  country TEXT,
  industry_guess TEXT,
  has_contact_page INTEGER DEFAULT 0,
  contact_page_url TEXT,
  status TEXT DEFAULT 'pending',
  http_status_code INTEGER,
  ssl_valid INTEGER,
  response_time_ms INTEGER,
  meta_description TEXT,
  page_title TEXT,
  pipeline_stage TEXT DEFAULT 'discovered',
  company_name TEXT,
  industry_segment TEXT,
  ai_fit_reasoning TEXT,
  emails_available_count INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'cold',
  outreach_status TEXT DEFAULT 'not_started',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sites_domain ON sites(domain);
CREATE INDEX IF NOT EXISTS idx_sites_is_wordpress ON sites(is_wordpress);
CREATE INDEX IF NOT EXISTS idx_sites_pipeline_stage ON sites(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_sites_discovery_job ON sites(discovery_job_id);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
CREATE INDEX IF NOT EXISTS idx_sites_priority ON sites(priority);
CREATE INDEX IF NOT EXISTS idx_sites_country ON sites(country);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
