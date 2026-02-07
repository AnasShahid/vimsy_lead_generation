import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { runMigrations } from './migrations';

const DATA_DIR = path.resolve(__dirname, '../../../data');
const DB_PATH = path.join(DATA_DIR, 'vimsy.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Run migrations to add any missing columns to existing tables
    // Must run before schema.sql so indexes on new columns don't fail
    runMigrations(db);

    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    // Execute schema line-by-line so individual CREATE INDEX failures don't block everything
    for (const stmt of schema.split(';').map(s => s.trim()).filter(Boolean)) {
      try {
        db.exec(stmt);
      } catch (err: any) {
        // Ignore errors for CREATE TABLE IF NOT EXISTS (table already exists)
        // and CREATE INDEX IF NOT EXISTS (already exists)
        if (!err.message.includes('already exists')) {
          console.error(`[DB] Schema error: ${err.message}`);
        }
      }
    }
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
