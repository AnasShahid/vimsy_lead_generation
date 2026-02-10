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
};
