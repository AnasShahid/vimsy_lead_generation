import { getDb } from '../index';
import type { Contact } from '@vimsy/shared';

export function upsertContact(contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Contact {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT INTO contacts (
      site_id, email, first_name, last_name, full_name,
      position, position_raw, seniority, department, type,
      confidence, linkedin_url, twitter, phone_number,
      verification_status, verification_date,
      enrichment_source, enrichment_job_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(site_id, email) DO UPDATE SET
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      full_name = excluded.full_name,
      position = excluded.position,
      position_raw = excluded.position_raw,
      seniority = excluded.seniority,
      department = excluded.department,
      type = excluded.type,
      confidence = excluded.confidence,
      linkedin_url = excluded.linkedin_url,
      twitter = excluded.twitter,
      phone_number = excluded.phone_number,
      verification_status = excluded.verification_status,
      verification_date = excluded.verification_date,
      enrichment_source = excluded.enrichment_source,
      enrichment_job_id = excluded.enrichment_job_id,
      updated_at = datetime('now')
  `);

  const result = stmt.run(
    contact.site_id,
    contact.email,
    contact.first_name || null,
    contact.last_name || null,
    contact.full_name || null,
    contact.position || null,
    contact.position_raw || null,
    contact.seniority || null,
    contact.department || null,
    contact.type || null,
    contact.confidence ?? null,
    contact.linkedin_url || null,
    contact.twitter || null,
    contact.phone_number || null,
    contact.verification_status || null,
    contact.verification_date || null,
    contact.enrichment_source,
    contact.enrichment_job_id || null
  );

  return getContactById(result.lastInsertRowid as number)!;
}

export function getContactById(id: number): Contact | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as any;
  return row || null;
}

export function getContactsBySiteId(siteId: number): Contact[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM contacts WHERE site_id = ? ORDER BY confidence DESC, created_at DESC'
  ).all(siteId) as any[];
  return rows;
}

export function getContactCountBySiteId(siteId: number): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM contacts WHERE site_id = ?').get(siteId) as any;
  return row.count;
}

export function getContactCountsForSites(siteIds: number[]): Record<number, number> {
  if (siteIds.length === 0) return {};
  const db = getDb();
  const placeholders = siteIds.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT site_id, COUNT(*) as count FROM contacts WHERE site_id IN (${placeholders}) GROUP BY site_id`
  ).all(...siteIds) as any[];

  const counts: Record<number, number> = {};
  for (const row of rows) {
    counts[row.site_id] = row.count;
  }
  return counts;
}

export function deleteContactsBySiteId(siteId: number): number {
  const db = getDb();
  const result = db.prepare('DELETE FROM contacts WHERE site_id = ?').run(siteId);
  return result.changes;
}
