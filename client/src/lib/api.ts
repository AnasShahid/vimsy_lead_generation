const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

// Discovery Jobs
export const api = {
  // Jobs
  createJob: (provider: string, config: Record<string, unknown>) =>
    request<any>('/discovery/jobs', {
      method: 'POST',
      body: JSON.stringify({ provider, config }),
    }),

  listJobs: (status?: string) =>
    request<any>(`/discovery/jobs${status ? `?status=${status}` : ''}`),

  getJob: (id: string) =>
    request<any>(`/discovery/jobs/${id}`),

  cancelJob: (id: string) =>
    request<any>(`/discovery/jobs/${id}`, { method: 'DELETE' }),

  // Sites
  listSites: (params: Record<string, string | number | boolean | undefined> = {}) => {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    return request<any>(`/sites${query ? `?${query}` : ''}`);
  },

  getSite: (id: number) =>
    request<any>(`/sites/${id}`),

  deleteSite: (id: number) =>
    request<any>(`/sites/${id}`, { method: 'DELETE' }),

  // Detection
  detectUrl: (url: string) =>
    request<any>('/discovery/detect', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  // AI Analysis
  analyzeSites: (body: { siteIds?: number[]; all?: boolean; filters?: Record<string, any> }) =>
    request<any>('/sites/analyze', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  analyzeSingleSite: (id: number) =>
    request<any>(`/sites/${id}/analyze`, { method: 'POST' }),

  // CSV
  importCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/csv/import`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Import failed');
    }
    return data;
  },

  importCsvText: (csvText: string) =>
    request<any>('/csv/import', {
      method: 'POST',
      body: JSON.stringify({ csvText }),
    }),

  importEnrichedFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/csv/import-enriched`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Enriched import failed');
    }
    return data;
  },

  exportCsvUrl: (params: Record<string, string> = {}) => {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    return `${BASE_URL}/csv/export${query ? `?${query}` : ''}`;
  },

  // Settings
  getSettings: () => request<any>('/settings'),

  getAIModels: () => request<any>('/settings/ai-models'),

  updateSettings: (body: { ai_model?: string; ai_analysis_prompt?: string }) =>
    request<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  resetPrompt: () =>
    request<any>('/settings/reset-prompt', { method: 'POST' }),

  // WordPress Analysis
  wpAnalyzeSites: (siteIds: number[]) =>
    request<any>('/sites/wp-analyze', {
      method: 'POST',
      body: JSON.stringify({ siteIds }),
    }),

  // Batch site operations
  batchDeleteSites: (siteIds: number[]) =>
    request<any>('/sites/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ siteIds }),
    }),

  batchUpdateSites: (siteIds: number[], updates: Record<string, any>) =>
    request<any>('/sites/batch-update', {
      method: 'POST',
      body: JSON.stringify({ siteIds, updates }),
    }),

  // Enrichment
  moveToEnrichment: (siteIds: number[]) =>
    request<any>('/enrichment/move', {
      method: 'POST',
      body: JSON.stringify({ siteIds }),
    }),

  getEnrichmentSites: (params: Record<string, string | number | boolean | undefined> = {}) => {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    return request<any>(`/enrichment/sites${query ? `?${query}` : ''}`);
  },

  getContactsForSite: (siteId: number) =>
    request<any>(`/enrichment/sites/${siteId}/contacts`),

  createEnrichmentJob: (data: { siteIds: number[]; provider: string; apiKey: string; filters: Record<string, any> }) =>
    request<any>('/enrichment/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getEnrichmentJobs: () =>
    request<any>('/enrichment/jobs'),

  getEnrichmentJob: (id: string) =>
    request<any>(`/enrichment/jobs/${id}`),

  cancelEnrichmentJob: (id: string) =>
    request<any>(`/enrichment/jobs/${id}`, { method: 'DELETE' }),

  // Analysis
  getAnalysisSites: (params: Record<string, string | number | boolean | undefined> = {}) => {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    return request<any>(`/analysis/sites${query ? `?${query}` : ''}`);
  },

  getAnalysisSiteDetail: (id: number) =>
    request<any>(`/analysis/sites/${id}`),

  createAnalysisJob: (siteIds: number[]) =>
    request<any>('/analysis/jobs', {
      method: 'POST',
      body: JSON.stringify({ siteIds }),
    }),

  getAnalysisJobs: () =>
    request<any>('/analysis/jobs'),

  getAnalysisJob: (id: string) =>
    request<any>(`/analysis/jobs/${id}`),

  cancelAnalysisJob: (id: string) =>
    request<any>(`/analysis/jobs/${id}`, { method: 'DELETE' }),

  moveToAnalysis: (siteIds: number[]) =>
    request<any>('/analysis/move', {
      method: 'POST',
      body: JSON.stringify({ siteIds }),
    }),

  reanalyzeSites: (siteIds: number[]) =>
    request<any>('/analysis/reanalyze', {
      method: 'POST',
      body: JSON.stringify({ siteIds }),
    }),

  updateActionStatus: (siteId: number, action_status: string) =>
    request<any>(`/analysis/sites/${siteId}/action`, {
      method: 'PATCH',
      body: JSON.stringify({ action_status }),
    }),

  // Tags
  getTagsForSites: (ids: number[]) =>
    request<any>(`/tags/sites?ids=${ids.join(',')}`),

  getAllTags: () =>
    request<any>('/tags'),

  // Vulnerability DB
  getVulnDbStatus: () =>
    request<any>('/settings/vuln-db/status'),

  updateVulnDb: () =>
    request<any>('/settings/vuln-db/update', { method: 'POST' }),

  // Report Settings
  getReportSettings: () =>
    request<any>('/settings/report'),

  updateReportSettings: (body: Record<string, string>) =>
    request<any>('/settings/report', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  // Reports
  getReports: (params?: { status?: string; page?: number; pageSize?: number; sortBy?: string; sortOrder?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
    const qs = query.toString();
    return request<any>(`/reports${qs ? `?${qs}` : ''}`);
  },

  getReport: (siteId: number) =>
    request<any>(`/reports/${siteId}`),

  generateReports: (siteIds: number[]) =>
    request<any>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ siteIds }),
    }),

  regenerateReport: (siteId: number) =>
    request<any>(`/reports/${siteId}/regenerate`, { method: 'POST' }),

  getReportJobs: () =>
    request<any>('/reports/jobs'),

  cancelReportJob: (jobId: string) =>
    request<any>(`/reports/jobs/${jobId}`, { method: 'DELETE' }),

  getReportPdfUrl: (siteId: number) => `${BASE_URL}/reports/${siteId}/pdf`,

  getReportDownloadUrl: (siteId: number) => `${BASE_URL}/reports/${siteId}/download`,

  getReportSignedUrl: (siteId: number, disposition: 'inline' | 'attachment' = 'inline') =>
    request<any>(`/reports/${siteId}/signed-url?disposition=${disposition}`),

  // Leads
  getLeads: (params: Record<string, string | number | boolean | undefined> = {}) => {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    return request<any>(`/leads${query ? `?${query}` : ''}`);
  },

  getLeadDetail: (id: number) =>
    request<any>(`/leads/${id}`),

  getLeadStats: () =>
    request<any>('/leads/stats'),
};
