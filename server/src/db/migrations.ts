import type Database from 'better-sqlite3';

/**
 * Safely add columns to existing databases.
 * SQLite doesn't support IF NOT EXISTS on ALTER TABLE,
 * so we catch errors for columns that already exist.
 */
export function runMigrations(db: Database.Database): void {
  const newColumns = [
    { name: 'company_name', sql: 'ALTER TABLE sites ADD COLUMN company_name TEXT' },
    { name: 'industry_segment', sql: 'ALTER TABLE sites ADD COLUMN industry_segment TEXT' },
    { name: 'ai_fit_reasoning', sql: 'ALTER TABLE sites ADD COLUMN ai_fit_reasoning TEXT' },
    { name: 'emails_available_count', sql: 'ALTER TABLE sites ADD COLUMN emails_available_count INTEGER DEFAULT 0' },
    { name: 'priority', sql: "ALTER TABLE sites ADD COLUMN priority TEXT DEFAULT 'cold'" },
    { name: 'outreach_status', sql: "ALTER TABLE sites ADD COLUMN outreach_status TEXT DEFAULT 'not_started'" },
    { name: 'notes', sql: 'ALTER TABLE sites ADD COLUMN notes TEXT' },
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
}
