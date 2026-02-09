// ============================================================
// Shared types for Vimsy Lead Gen Platform
// ============================================================

// --- Job Types ---

export type JobType = 'discovery' | 'enrichment' | 'analysis' | 'report' | 'outreach';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type DiscoveryProvider = 'manual' | 'builtwith' | 'wappalyzer' | 'hunter';
export type SiteStatus = 'pending' | 'active' | 'inactive' | 'error';
export type PipelineStage = 'discovered' | 'enriched' | 'analyzed' | 'reported' | 'contacted';
export type LeadPriority = 'hot' | 'warm' | 'cold';
export type OutreachStatus = 'not_started' | 'in_progress' | 'done';

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  provider: DiscoveryProvider | null;
  config: Record<string, unknown> | null;
  progress: number;
  total_items: number;
  processed_items: number;
  error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// --- Site Types ---

export interface Site {
  id: number;
  url: string;
  domain: string;
  is_wordpress: boolean;
  wp_version: string | null;
  detected_theme: string | null;
  detected_plugins: string | null;
  discovery_source: DiscoveryProvider;
  discovery_job_id: string | null;
  discovery_date: string;
  country: string | null;
  industry_guess: string | null;
  has_contact_page: boolean;
  contact_page_url: string | null;
  status: SiteStatus;
  http_status_code: number | null;
  ssl_valid: boolean | null;
  response_time_ms: number | null;
  meta_description: string | null;
  page_title: string | null;
  pipeline_stage: PipelineStage;
  company_name: string | null;
  industry_segment: string | null;
  ai_fit_reasoning: string | null;
  emails_available_count: number;
  priority: LeadPriority;
  outreach_status: OutreachStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// --- CSV Schema ---

export interface SiteCSVRow {
  url: string;
  domain: string;
  is_wordpress: string; // 'true'/'false'
  wp_version: string;
  detected_theme: string;
  detected_plugins: string;
  discovery_source: string;
  discovery_date: string;
  country: string;
  industry_guess: string;
  has_contact_page: string; // 'true'/'false'
  contact_page_url: string;
  status: string;
  http_status_code: string;
  ssl_valid: string; // 'true'/'false'
  response_time_ms: string;
  meta_description: string;
  page_title: string;
  company_name: string;
  industry_segment: string;
  ai_fit_reasoning: string;
  emails_available_count: string;
  priority: string;
  outreach_status: string;
  notes: string;
}

export const CSV_COLUMNS: (keyof SiteCSVRow)[] = [
  'url', 'domain', 'is_wordpress', 'wp_version', 'detected_theme',
  'detected_plugins', 'discovery_source', 'discovery_date', 'country',
  'industry_guess', 'has_contact_page', 'contact_page_url', 'status',
  'http_status_code', 'ssl_valid', 'response_time_ms', 'meta_description',
  'page_title', 'company_name', 'industry_segment', 'ai_fit_reasoning',
  'emails_available_count', 'priority', 'outreach_status', 'notes',
];

// --- Enriched Lead Row (vimsy_cold_outreach_leads format) ---

export interface EnrichedLeadRow {
  '#'?: string;
  'Company Name': string;
  'Domain': string;
  'Industry / Segment': string;
  'Why They\'re a Good Fit': string;
  'Emails Available': string;
  'Priority': string;
  'Outreach Status': string;
  'Notes': string;
}

// --- Discovery Provider Config ---

export interface ManualProviderConfig {
  urls: string[];
}

export interface BuiltWithProviderConfig {
  apiKey: string;
  technology: string;  // e.g. 'WordPress'
  country?: string;
  maxResults: number;
}

export interface WappalyzerProviderConfig {
  apiKey: string;
  urls: string[];  // URLs to check
}

export interface HunterDiscoverProviderConfig {
  apiKey: string;
  filters: HunterDiscoverFilters;
  page?: number;       // UI page number (1-indexed), translated to offset
  limit?: number;      // items per page, default 100
}

export interface HunterDiscoverFilters {
  query?: string;
  similar_to?: string[];
  headquarters_location?: {
    include?: Array<{ continent?: string; business_region?: string; country?: string; state?: string; city?: string }>;
    exclude?: Array<{ continent?: string; business_region?: string; country?: string; state?: string; city?: string }>;
  };
  industry?: {
    include?: string[];
    exclude?: string[];
  };
  headcount?: string[];
  company_type?: {
    include?: string[];
    exclude?: string[];
  };
  year_founded?: {
    from?: number;
    to?: number;
  };
  keywords?: {
    include?: string[];
    exclude?: string[];
    match?: 'any' | 'all';
  };
  technology?: {
    include?: string[];
    exclude?: string[];
    match?: 'any' | 'all';
  };
  funding?: {
    series?: string[];
    amount?: { from?: number; to?: number };
    date?: { from?: string; to?: string };
  };
}

export type ProviderConfig =
  | ManualProviderConfig
  | BuiltWithProviderConfig
  | WappalyzerProviderConfig
  | HunterDiscoverProviderConfig;

// --- Hunter.io Discover Response ---

export interface HunterDiscoverCompany {
  domain: string;
  organization: string;
  emails_count: {
    personal: number;
    generic: number;
    total: number;
  };
}

// --- WordPress Detection ---

export interface WPDetectionResult {
  url: string;
  is_wordpress: boolean;
  confidence: number;        // 0-100
  wp_version: string | null;
  detected_theme: string | null;
  detected_plugins: string[];
  checks: {
    meta_generator: boolean;
    wp_content_paths: boolean;
    wp_json_endpoint: boolean;
    readme_html: boolean;
    x_powered_by: boolean;
    link_header: boolean;
  };
  page_title: string | null;
  meta_description: string | null;
  has_contact_page: boolean;
  contact_page_url: string | null;
  http_status_code: number | null;
  ssl_valid: boolean | null;
  response_time_ms: number | null;
}

// --- API Response Types ---

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// --- Discovery Job Request ---

export interface CreateDiscoveryJobRequest {
  provider: DiscoveryProvider;
  config: ProviderConfig;
}

// --- Site Filter Params ---

export interface SiteFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  is_wordpress?: boolean;
  discovery_source?: DiscoveryProvider;
  status?: SiteStatus;
  pipeline_stage?: PipelineStage;
  job_id?: string;
  priority?: LeadPriority;
  country?: string;
  english_markets_only?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// --- Progress Callback ---

export type ProgressCallback = (processed: number, total: number) => void;

// --- Discovered URL (raw output from providers before WP detection) ---

export interface DiscoveredUrl {
  url: string;
  source: DiscoveryProvider;
  metadata?: Record<string, unknown>;
}
