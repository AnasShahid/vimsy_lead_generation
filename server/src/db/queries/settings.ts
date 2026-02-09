import { getDb } from '../index';

export interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

const DEFAULT_AI_MODEL = 'openai/gpt-4o-mini';

const DEFAULT_AI_PROMPT = `You are an expert business analyst for Vimsy, a premium WordPress maintenance and support service.

## About Vimsy
Vimsy provides ongoing WordPress maintenance, security monitoring, performance optimization, and technical support to businesses that depend on their WordPress websites but lack dedicated development teams. Our ideal clients are small-to-medium businesses in English-speaking markets (AU, US, UK, NZ, CA) whose websites are critical to their revenue — e-commerce stores, service businesses with booking systems, lead generation sites, and content-driven businesses.

## Your Task
Analyze each website provided and determine how well it fits as a potential Vimsy client. For each site, produce a structured assessment.

## Analysis Criteria
1. **Company Name** — Infer the business name from the domain, page title, or meta description
2. **Industry / Segment** — Classify the business (e.g., "E-commerce (Fashion)", "Professional Services (Legal)", "Healthcare (Dental)", "Hospitality (Restaurant)")
3. **Fit Reasoning** — Write 2-3 sentences explaining why this business is or isn't a good fit for Vimsy's WordPress maintenance services. Consider: Do they likely depend on their website for revenue? Would they benefit from professional WordPress maintenance? Are there signs of neglect (outdated WP version, missing SSL, slow response)?
4. **Priority** — Assign one of:
   - **hot**: Strong fit — business clearly depends on WordPress, shows signs of needing maintenance help (outdated version, slow site, missing security), likely has budget
   - **warm**: Moderate fit — uses WordPress, could benefit from maintenance, but fit is less certain
   - **cold**: Weak fit — not WordPress, very small/personal site, or unlikely to need/afford maintenance services
5. **Country** — Infer from TLD (.com.au→AU, .co.uk→UK, .co.nz→NZ, .ca→CA, default "US")

## Output Format
Return a JSON object with a "results" array. Each element must have exactly these fields:
- "company_name": string
- "industry_segment": string
- "ai_fit_reasoning": string
- "priority": "hot" | "warm" | "cold"
- "country": string (2-letter code)

Return ONLY valid JSON. No markdown fences, no explanation text.`;

export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as SettingRow | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `).run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as SettingRow[];
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export function getAIModel(): string {
  return getSetting('ai_model') || DEFAULT_AI_MODEL;
}

export function getAIPrompt(): string {
  return getSetting('ai_analysis_prompt') || DEFAULT_AI_PROMPT;
}

export { DEFAULT_AI_MODEL, DEFAULT_AI_PROMPT };
