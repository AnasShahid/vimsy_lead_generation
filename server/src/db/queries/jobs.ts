import { getDb } from '../index';
import type { Job, JobStatus, JobType } from '@vimsy/shared';

export function createJob(job: Omit<Job, 'created_at' | 'started_at' | 'completed_at'>): Job {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO jobs (id, type, status, provider, config, progress, total_items, processed_items, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    job.id,
    job.type,
    job.status,
    job.provider,
    job.config ? JSON.stringify(job.config) : null,
    job.progress,
    job.total_items,
    job.processed_items,
    job.error
  );
  return getJobById(job.id)!;
}

export function getJobById(id: string): Job | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as any;
  if (!row) return null;
  return {
    ...row,
    config: row.config ? JSON.parse(row.config) : null,
  };
}

export function listJobs(filters?: { type?: JobType; status?: JobStatus; limit?: number }): Job[] {
  const db = getDb();
  let query = 'SELECT * FROM jobs WHERE 1=1';
  const params: any[] = [];

  if (filters?.type) {
    query += ' AND type = ?';
    params.push(filters.type);
  }
  if (filters?.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  query += ' ORDER BY created_at DESC';

  if (filters?.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  const rows = db.prepare(query).all(...params) as any[];
  return rows.map(row => ({
    ...row,
    config: row.config ? JSON.parse(row.config) : null,
  }));
}

/**
 * Return active (pending/running) jobs + the most recent completed/failed jobs.
 * This avoids returning the entire job history during polling.
 */
export function listActiveAndRecentJobs(type: JobType, recentLimit: number = 5): Job[] {
  const db = getDb();

  // Active jobs (pending or running)
  const activeRows = db.prepare(
    `SELECT * FROM jobs WHERE type = ? AND status IN ('pending', 'running') ORDER BY created_at DESC`
  ).all(type) as any[];

  // Recent completed/failed/cancelled jobs
  const recentRows = db.prepare(
    `SELECT * FROM jobs WHERE type = ? AND status NOT IN ('pending', 'running') ORDER BY created_at DESC LIMIT ?`
  ).all(type, recentLimit) as any[];

  const allRows = [...activeRows, ...recentRows];
  // Deduplicate by id (in case a job transitions during the two queries)
  const seen = new Set<string>();
  const unique = allRows.filter(row => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  return unique.map(row => ({
    ...row,
    config: row.config ? JSON.parse(row.config) : null,
  }));
}

export function updateJobStatus(id: string, status: JobStatus, error?: string): void {
  const db = getDb();
  const updates: string[] = ['status = ?'];
  const params: any[] = [status];

  if (status === 'running') {
    updates.push("started_at = datetime('now')");
  }
  if (status === 'completed' || status === 'failed' || status === 'cancelled') {
    updates.push("completed_at = datetime('now')");
  }
  if (error !== undefined) {
    updates.push('error = ?');
    params.push(error);
  }

  params.push(id);
  db.prepare(`UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`).run(...params);
}

export function updateJobProgress(id: string, processed: number, total: number): void {
  const db = getDb();
  const progress = total > 0 ? Math.round((processed / total) * 100) : 0;
  db.prepare(`
    UPDATE jobs SET processed_items = ?, total_items = ?, progress = ? WHERE id = ?
  `).run(processed, total, progress, id);
}

export function getNextPendingJob(type: JobType): Job | null {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM jobs WHERE type = ? AND status = ? ORDER BY created_at ASC LIMIT 1'
  ).get(type, 'pending') as any;
  if (!row) return null;
  return {
    ...row,
    config: row.config ? JSON.parse(row.config) : null,
  };
}

export function deleteJob(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
  return result.changes > 0;
}
