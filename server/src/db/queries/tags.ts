import { getDb } from '../index';
import type { SiteTag } from '@vimsy/shared';

export function addTag(siteId: number, tag: string): void {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO site_tags (site_id, tag) VALUES (?, ?)
  `).run(siteId, tag);
}

export function addTagsBatch(siteIds: number[], tag: string): void {
  const db = getDb();
  const stmt = db.prepare('INSERT OR IGNORE INTO site_tags (site_id, tag) VALUES (?, ?)');
  const transaction = db.transaction((ids: number[]) => {
    for (const id of ids) {
      stmt.run(id, tag);
    }
  });
  transaction(siteIds);
}

export function removeTag(siteId: number, tag: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM site_tags WHERE site_id = ? AND tag = ?').run(siteId, tag);
  return result.changes > 0;
}

export function getTagsForSite(siteId: number): string[] {
  const db = getDb();
  const rows = db.prepare('SELECT tag FROM site_tags WHERE site_id = ? ORDER BY assigned_at ASC').all(siteId) as any[];
  return rows.map(r => r.tag);
}

export function getTagsForSites(siteIds: number[]): Record<number, string[]> {
  const db = getDb();
  if (siteIds.length === 0) return {};

  const placeholders = siteIds.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT site_id, tag FROM site_tags WHERE site_id IN (${placeholders}) ORDER BY assigned_at ASC`
  ).all(...siteIds) as any[];

  const result: Record<number, string[]> = {};
  for (const id of siteIds) {
    result[id] = [];
  }
  for (const row of rows) {
    if (!result[row.site_id]) {
      result[row.site_id] = [];
    }
    result[row.site_id].push(row.tag);
  }
  return result;
}

export function listSiteIdsByTag(tag: string): number[] {
  const db = getDb();
  const rows = db.prepare('SELECT site_id FROM site_tags WHERE tag = ?').all(tag) as any[];
  return rows.map(r => r.site_id);
}

export function getAllTags(): Array<{ tag: string; count: number }> {
  const db = getDb();
  const rows = db.prepare(
    'SELECT tag, COUNT(*) as count FROM site_tags GROUP BY tag ORDER BY count DESC'
  ).all() as any[];
  return rows;
}
