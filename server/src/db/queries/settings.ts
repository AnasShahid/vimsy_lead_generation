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

// --- Report Branding Settings ---

export const DEFAULT_REPORT_SETTINGS: Record<string, string> = {
  report_company_name: 'Vimsy',
  report_logo_url: '',
  report_primary_color: '#4F46E5',
  report_disclaimer: 'This report is generated automatically based on publicly available data. While we strive for accuracy, some findings may require manual verification. This report is intended for informational purposes only.',
  report_cta_text: 'Ready to improve your website? Contact Vimsy for a free consultation.',
  report_contact_email: '',
  report_contact_phone: '',
  report_contact_website: 'https://vimsy.com',
};

export function getReportSettings(): Record<string, string> {
  const result: Record<string, string> = { ...DEFAULT_REPORT_SETTINGS };
  for (const key of Object.keys(DEFAULT_REPORT_SETTINGS)) {
    const val = getSetting(key);
    if (val !== null) {
      result[key] = val;
    }
  }
  return result;
}

export function setReportSettings(settings: Record<string, string>): void {
  for (const [key, value] of Object.entries(settings)) {
    if (key.startsWith('report_')) {
      setSetting(key, value);
    }
  }
}

// --- Report AI Prompt ---

export const DEFAULT_REPORT_PROMPT = `You are a professional technical writer for Vimsy, a premium WordPress maintenance and support service. Your task is to generate three sections for a branded website health report based on the analysis data provided.

## Sections to Generate

### 1. Executive Summary (3-5 paragraphs)
Write a high-level overview of the site's health for a non-technical business owner. Reference the company name, industry, and specific scores. Highlight the most critical findings and convey urgency where appropriate. Be professional but approachable.

### 2. Recommendations (5-10 bullet points)
Provide actionable fixes prioritized by impact. Each recommendation should reference the specific finding (e.g., "Your SSL certificate expires in 12 days — renew immediately"). Group by category: Security, Performance, SEO, WordPress. Start each with a clear action verb.

### 3. Vimsy Pitch (2-3 paragraphs)
Write a personalized call-to-action explaining how Vimsy can solve the specific issues found. Reference the industry and business type. Explain the value of ongoing WordPress maintenance. End with a clear call to action.

## Output Format
Return ONLY valid JSON with exactly these three keys:
{
  "executive_summary": "...",
  "recommendations": "...",
  "pitch": "..."
}

## Style Guidelines
- Use markdown formatting within each section (headers, bold, bullet points)
- Be professional but approachable — avoid excessive jargon
- Reference specific numbers and findings from the data provided
- Keep the tone consultative, not salesy
- Executive summary should feel like a trusted advisor's briefing
- Recommendations should be specific and actionable, not generic
- Pitch should feel personalized, not templated

Return ONLY valid JSON. No markdown fences, no explanation text outside the JSON.`;

export function getReportPrompt(): string {
  return getSetting('report_ai_prompt') || DEFAULT_REPORT_PROMPT;
}

export { DEFAULT_AI_MODEL, DEFAULT_AI_PROMPT };
