// ============================================================
// Shared types for Vimsy Lead Gen Platform
// ============================================================

// --- Job Types ---

export type JobType = 'discovery' | 'enrichment' | 'analysis' | 'report' | 'outreach';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type DiscoveryProvider = 'manual' | 'builtwith' | 'wappalyzer' | 'hunter';
export type SiteStatus = 'pending' | 'active' | 'inactive' | 'error';
export type PipelineStage = 'discovered' | 'enrichment' | 'enriched' | 'analysis' | 'analyzed' | 'reported' | 'contacted';
export type EnrichmentProvider = 'hunter' | 'snov';
export type EnrichmentStatus = 'pending' | 'enriching' | 'enriched' | 'error';
export type AnalysisStatus = 'pending' | 'analyzing' | 'analyzed' | 'error';
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'error';
export type AnalysisPriority = 'critical' | 'high' | 'medium' | 'low';
export type AnalysisAction = 'qualified' | 'manual_review' | 'maintenance';
export type LeadPriority = 'hot' | 'warm' | 'cold';
export type OutreachStatus = 'not_started' | 'in_progress' | 'done';

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  provider: DiscoveryProvider | EnrichmentProvider | null;
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
  enrichment_status: EnrichmentStatus | null;
  analysis_status: AnalysisStatus | null;
  report_status: ReportStatus | null;
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

// --- Contact Types ---

export interface Contact {
  id: number;
  site_id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  position: string | null;
  position_raw: string | null;
  seniority: string | null;
  department: string | null;
  type: string | null;  // 'personal' or 'generic'
  confidence: number | null;
  linkedin_url: string | null;
  twitter: string | null;
  phone_number: string | null;
  verification_status: string | null;  // 'valid', 'invalid', 'accept_all', 'unknown'
  verification_date: string | null;
  enrichment_source: EnrichmentProvider;
  enrichment_job_id: string | null;
  created_at: string;
  updated_at: string;
}

// --- Hunter.io Domain Search Config ---

export interface HunterDomainSearchConfig {
  domain: string;
  company?: string;
  type?: 'personal' | 'generic';
  seniority?: string[];   // 'junior', 'senior', 'executive'
  department?: string[];   // 'executive', 'it', 'finance', 'management', 'sales', etc.
  required_field?: 'full_name' | 'position' | 'phone_number';
  limit?: number;          // 1-100, default 5
  offset?: number;
  location?: {
    include?: Array<{ continent?: string; business_region?: string; country?: string; state?: string; city?: string }>;
    exclude?: Array<{ continent?: string; business_region?: string; country?: string; state?: string; city?: string }>;
  };
  job_titles?: string[];
}

export interface HunterDomainSearchResult {
  domain: string;
  organization: string | null;
  pattern: string | null;
  emails: HunterEmailResult[];
  totalResults: number;
}

export interface HunterEmailResult {
  value: string;
  type: 'personal' | 'generic';
  confidence: number;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  position_raw: string | null;
  seniority: string | null;
  department: string | null;
  linkedin: string | null;
  twitter: string | null;
  phone_number: string | null;
  verification: {
    date: string | null;
    status: string | null;  // 'valid', 'invalid', 'accept_all', 'unknown'
  } | null;
}

// --- Enrichment Job Config ---

export interface EnrichmentJobConfig {
  siteIds: number[];
  provider: EnrichmentProvider;
  apiKey: string;
  filters: HunterDomainSearchConfig;
}

// --- Analysis Types ---

export interface AnalysisJobConfig {
  siteIds: number[];
}

export interface ReportJobConfig {
  siteIds: number[];
}

export interface SiteReport {
  id: number;
  site_id: number;
  report_job_id: string | null;
  status: ReportStatus;
  pdf_filename: string | null;
  pdf_path: string | null;
  ai_executive_summary: string | null;
  ai_recommendations: string | null;
  ai_pitch: string | null;
  health_score: number | null;
  priority_classification: string | null;
  error: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteAnalysis {
  id: number;
  site_id: number;
  analysis_job_id: string | null;
  status: string;
  health_score: number | null;
  priority_classification: AnalysisPriority | null;
  // Performance (PSI)
  psi_performance_score: number | null;
  psi_accessibility_score: number | null;
  psi_seo_score: number | null;
  psi_best_practices_score: number | null;
  psi_raw_data: string | null;
  // SSL/TLS
  ssl_valid: boolean | null;
  ssl_issuer: string | null;
  ssl_expiry_date: string | null;
  ssl_days_until_expiry: number | null;
  ssl_protocol_version: string | null;
  ssl_cipher: string | null;
  ssl_chain_valid: boolean | null;
  ssl_raw_data: string | null;
  // WordPress (WPScan)
  wpscan_wp_version: string | null;
  wpscan_wp_version_status: string | null;
  wpscan_theme: string | null;
  wpscan_theme_version: string | null;
  wpscan_plugins: string | null;
  wpscan_users: string | null;
  wpscan_config_backups: string | null;
  wpscan_db_exports: string | null;
  wpscan_raw_data: string | null;
  // Vulnerability matching
  vulnerabilities_found: number;
  vulnerability_details: string | null;
  // Sub-scores (actual category points retained)
  security_score: number | null;
  performance_score: number | null;
  wp_health_score: number | null;
  availability_score: number | null;
  seo_score: number | null;
  // Action status (auto-assigned, manually overridable)
  action_status: AnalysisAction | null;
  // Timestamps
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteTag {
  id: number;
  site_id: number;
  tag: string;
  assigned_at: string;
}

export interface WpVulnerability {
  id: number;
  title: string | null;
  cve_id: string | null;
  cvss_score: number | null;
  cvss_rating: string | null;
  software_name: string | null;
  software_type: string | null;
  software_slug: string | null;
  affected_versions: string | null;
  patched_status: string | null;
  remediation: string | null;
  description: string | null;
  published_date: string | null;
  last_updated_date: string | null;
  imported_at: string;
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
