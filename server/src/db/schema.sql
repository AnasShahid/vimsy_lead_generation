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
  enrichment_status TEXT,
  analysis_status TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  position TEXT,
  position_raw TEXT,
  seniority TEXT,
  department TEXT,
  type TEXT,
  confidence INTEGER,
  linkedin_url TEXT,
  twitter TEXT,
  phone_number TEXT,
  verification_status TEXT,
  verification_date TEXT,
  enrichment_source TEXT,
  enrichment_job_id TEXT REFERENCES jobs(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(site_id, email)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS site_analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  analysis_job_id TEXT REFERENCES jobs(id),
  status TEXT NOT NULL DEFAULT 'pending',
  -- Composite score
  health_score INTEGER,
  priority_classification TEXT,
  -- Performance (PSI)
  psi_performance_score REAL,
  psi_accessibility_score REAL,
  psi_seo_score REAL,
  psi_best_practices_score REAL,
  psi_raw_data TEXT,
  -- SSL/TLS
  ssl_valid INTEGER,
  ssl_issuer TEXT,
  ssl_expiry_date TEXT,
  ssl_days_until_expiry INTEGER,
  ssl_protocol_version TEXT,
  ssl_cipher TEXT,
  ssl_chain_valid INTEGER,
  ssl_raw_data TEXT,
  -- WordPress (WPScan)
  wpscan_wp_version TEXT,
  wpscan_wp_version_status TEXT,
  wpscan_theme TEXT,
  wpscan_theme_version TEXT,
  wpscan_plugins TEXT,
  wpscan_users TEXT,
  wpscan_config_backups TEXT,
  wpscan_db_exports TEXT,
  wpscan_raw_data TEXT,
  -- Vulnerability matching
  vulnerabilities_found INTEGER DEFAULT 0,
  vulnerability_details TEXT,
  -- Sub-scores
  security_score REAL,
  performance_score REAL,
  wp_health_score REAL,
  -- Timestamps
  analyzed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(site_id, analysis_job_id)
);

CREATE TABLE IF NOT EXISTS site_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  assigned_at TEXT DEFAULT (datetime('now')),
  UNIQUE(site_id, tag)
);

CREATE TABLE IF NOT EXISTS wp_vulnerabilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  cve_id TEXT,
  cvss_score REAL,
  cvss_rating TEXT,
  software_name TEXT,
  software_type TEXT,
  software_slug TEXT,
  affected_versions TEXT,
  patched_status TEXT,
  remediation TEXT,
  description TEXT,
  published_date TEXT,
  last_updated_date TEXT,
  imported_at TEXT DEFAULT (datetime('now'))
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
CREATE INDEX IF NOT EXISTS idx_contacts_site_id ON contacts(site_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_verification ON contacts(verification_status);
CREATE INDEX IF NOT EXISTS idx_sites_enrichment_status ON sites(enrichment_status);
CREATE INDEX IF NOT EXISTS idx_sites_analysis_status ON sites(analysis_status);
CREATE INDEX IF NOT EXISTS idx_site_analyses_site_id ON site_analyses(site_id);
CREATE INDEX IF NOT EXISTS idx_site_analyses_job_id ON site_analyses(analysis_job_id);
CREATE INDEX IF NOT EXISTS idx_site_analyses_status ON site_analyses(status);
CREATE INDEX IF NOT EXISTS idx_site_analyses_priority ON site_analyses(priority_classification);
CREATE INDEX IF NOT EXISTS idx_site_tags_site_id ON site_tags(site_id);
CREATE INDEX IF NOT EXISTS idx_site_tags_tag ON site_tags(tag);
CREATE INDEX IF NOT EXISTS idx_wp_vulns_slug ON wp_vulnerabilities(software_slug);
CREATE INDEX IF NOT EXISTS idx_wp_vulns_type ON wp_vulnerabilities(software_type);
CREATE INDEX IF NOT EXISTS idx_wp_vulns_cvss ON wp_vulnerabilities(cvss_rating);
