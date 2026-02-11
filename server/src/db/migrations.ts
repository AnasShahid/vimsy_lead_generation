import type Database from 'better-sqlite3';

/**
 * Safely add columns to existing databases.
 * SQLite doesn't support IF NOT EXISTS on ALTER TABLE,
 * so we catch errors for columns that already exist.
 */
export function runMigrations(db: Database.Database): void {
  // Check if the sites table exists — if not, this is a fresh DB and schema.sql will create it
  const tableExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='sites'"
  ).get();

  if (!tableExists) {
    return; // Fresh DB — schema.sql will create the table with all columns
  }

  const newColumns = [
    { name: 'company_name', sql: 'ALTER TABLE sites ADD COLUMN company_name TEXT' },
    { name: 'industry_segment', sql: 'ALTER TABLE sites ADD COLUMN industry_segment TEXT' },
    { name: 'ai_fit_reasoning', sql: 'ALTER TABLE sites ADD COLUMN ai_fit_reasoning TEXT' },
    { name: 'emails_available_count', sql: 'ALTER TABLE sites ADD COLUMN emails_available_count INTEGER DEFAULT 0' },
    { name: 'priority', sql: "ALTER TABLE sites ADD COLUMN priority TEXT DEFAULT 'cold'" },
    { name: 'outreach_status', sql: "ALTER TABLE sites ADD COLUMN outreach_status TEXT DEFAULT 'not_started'" },
    { name: 'notes', sql: 'ALTER TABLE sites ADD COLUMN notes TEXT' },
    { name: 'enrichment_status', sql: 'ALTER TABLE sites ADD COLUMN enrichment_status TEXT' },
  ];

  for (const col of newColumns) {
    try {
      db.exec(col.sql);
      console.log(`[DB] Migration: added column '${col.name}' to sites`);
    } catch (err: any) {
      if (err.message.includes('duplicate column name')) {
        // Column already exists, skip
      } else {
        console.error(`[DB] Migration error for '${col.name}': ${err.message}`);
      }
    }
  }

  // Add new indexes (IF NOT EXISTS is supported for indexes)
  db.exec('CREATE INDEX IF NOT EXISTS idx_sites_priority ON sites(priority)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_sites_country ON sites(country)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_sites_enrichment_status ON sites(enrichment_status)');

  // Create contacts table if it doesn't exist (for existing DBs)
  db.exec(`
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
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_site_id ON contacts(site_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_contacts_verification ON contacts(verification_status)');

  // Phase 3: Add analysis_status column to sites
  const analysisColumns = [
    { name: 'analysis_status', sql: 'ALTER TABLE sites ADD COLUMN analysis_status TEXT' },
  ];

  for (const col of analysisColumns) {
    try {
      db.exec(col.sql);
      console.log(`[DB] Migration: added column '${col.name}' to sites`);
    } catch (err: any) {
      if (err.message.includes('duplicate column name')) {
        // Column already exists, skip
      } else {
        console.error(`[DB] Migration error for '${col.name}': ${err.message}`);
      }
    }
  }

  db.exec('CREATE INDEX IF NOT EXISTS idx_sites_analysis_status ON sites(analysis_status)');

  // Phase 3: Create site_analyses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      analysis_job_id TEXT REFERENCES jobs(id),
      status TEXT NOT NULL DEFAULT 'pending',
      health_score INTEGER,
      priority_classification TEXT,
      psi_performance_score REAL,
      psi_accessibility_score REAL,
      psi_seo_score REAL,
      psi_best_practices_score REAL,
      psi_raw_data TEXT,
      ssl_valid INTEGER,
      ssl_issuer TEXT,
      ssl_expiry_date TEXT,
      ssl_days_until_expiry INTEGER,
      ssl_protocol_version TEXT,
      ssl_cipher TEXT,
      ssl_chain_valid INTEGER,
      ssl_raw_data TEXT,
      wpscan_wp_version TEXT,
      wpscan_wp_version_status TEXT,
      wpscan_theme TEXT,
      wpscan_theme_version TEXT,
      wpscan_plugins TEXT,
      wpscan_users TEXT,
      wpscan_config_backups TEXT,
      wpscan_db_exports TEXT,
      wpscan_raw_data TEXT,
      vulnerabilities_found INTEGER DEFAULT 0,
      vulnerability_details TEXT,
      security_score REAL,
      performance_score REAL,
      wp_health_score REAL,
      analyzed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(site_id, analysis_job_id)
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_site_analyses_site_id ON site_analyses(site_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_site_analyses_job_id ON site_analyses(analysis_job_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_site_analyses_status ON site_analyses(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_site_analyses_priority ON site_analyses(priority_classification)');

  // Phase 3.1: Add availability_score column to site_analyses
  const analysisNewColumns = [
    { name: 'availability_score', sql: 'ALTER TABLE site_analyses ADD COLUMN availability_score REAL' },
    { name: 'seo_score', sql: 'ALTER TABLE site_analyses ADD COLUMN seo_score REAL' },
    { name: 'action_status', sql: 'ALTER TABLE site_analyses ADD COLUMN action_status TEXT' },
  ];
  for (const col of analysisNewColumns) {
    try {
      db.exec(col.sql);
      console.log(`[DB] Migration: added column '${col.name}' to site_analyses`);
    } catch (err: any) {
      if (err.message.includes('duplicate column name')) {
        // Column already exists, skip
      } else {
        console.error(`[DB] Migration error for '${col.name}': ${err.message}`);
      }
    }
  }

  // Phase 3: Create site_tags table
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      assigned_at TEXT DEFAULT (datetime('now')),
      UNIQUE(site_id, tag)
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_site_tags_site_id ON site_tags(site_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_site_tags_tag ON site_tags(tag)');

  // Phase 3: Create wp_vulnerabilities table
  db.exec(`
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
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_wp_vulns_slug ON wp_vulnerabilities(software_slug)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_wp_vulns_type ON wp_vulnerabilities(software_type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_wp_vulns_cvss ON wp_vulnerabilities(cvss_rating)');
}
