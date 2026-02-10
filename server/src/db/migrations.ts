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
}
