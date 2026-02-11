import { useState, useEffect, useCallback } from 'react';
import { Loader2, Search, RefreshCw, FileText, Download, Eye, Play, X } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';

type ReportFilter = 'all' | 'no_report' | 'pending' | 'generating' | 'completed' | 'error';

function ReportStatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">No Report</span>;
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 animate-pulse">
        Queued
      </span>
    );
  }
  if (status === 'generating') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
        <Loader2 size={10} className="animate-spin" />
        Generating
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">
        ✓ Ready
      </span>
    );
  }
  if (status === 'error') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">Error</span>;
  }
  return <span className="text-xs text-gray-400">—</span>;
}

function HealthScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return <span className="text-xs text-gray-400">—</span>;
  let color = 'bg-green-100 text-green-700 border-green-200';
  if (score <= 40) color = 'bg-red-100 text-red-700 border-red-200';
  else if (score <= 60) color = 'bg-orange-100 text-orange-700 border-orange-200';
  else if (score <= 75) color = 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${color}`}>
      {score}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return <span className="text-xs text-gray-400">—</span>;
  const config: Record<string, { color: string }> = {
    critical: { color: 'bg-red-100 text-red-700 border-red-200' },
    high: { color: 'bg-orange-100 text-orange-700 border-orange-200' },
    medium: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    low: { color: 'bg-green-100 text-green-700 border-green-200' },
  };
  const c = config[priority] || { color: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${c.color}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

function ReportViewer({ siteId, domain, onClose }: { siteId: number; domain: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[85vh] mx-4 flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-800">{domain}</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={api.getReportDownloadUrl(siteId)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download size={12} />
              Download
            </a>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <iframe
            src={api.getReportPdfUrl(siteId)}
            className="w-full h-full border-0"
            title={`Report for ${domain}`}
          />
        </div>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const [sites, setSites] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ReportFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [jobs, setJobs] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingSiteId, setViewingSiteId] = useState<number | null>(null);
  const [viewingDomain, setViewingDomain] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSites = useCallback(async () => {
    try {
      const res = await api.getAnalysisSites({ pageSize: 500 });
      setSites(res.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.getReportJobs();
      setJobs(res.data || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { fetchSites(); fetchJobs(); }, [fetchSites, fetchJobs]);

  const hasActiveJobs = jobs.some((j: any) => j.status === 'pending' || j.status === 'running');
  const hasPendingSites = sites.some((s: any) => s.report_status === 'pending' || s.report_status === 'generating');
  usePolling(() => { fetchSites(); fetchJobs(); }, 3000, hasActiveJobs || hasPendingSites);

  // Filter sites: only show analyzed sites
  const analyzedSites = sites.filter((s: any) => s.analysis_status === 'analyzed');

  const filteredSites = analyzedSites.filter(s => {
    // Search filter
    if (search && !s.domain.toLowerCase().includes(search.toLowerCase()) && !(s.company_name || '').toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    // Status filter
    if (filter === 'all') return true;
    if (filter === 'no_report') return !s.report_status;
    return s.report_status === filter;
  });

  // Counts
  const counts = {
    all: analyzedSites.length,
    no_report: analyzedSites.filter(s => !s.report_status).length,
    pending: analyzedSites.filter(s => s.report_status === 'pending').length,
    generating: analyzedSites.filter(s => s.report_status === 'generating').length,
    completed: analyzedSites.filter(s => s.report_status === 'completed').length,
    error: analyzedSites.filter(s => s.report_status === 'error').length,
  };

  const allSelected = filteredSites.length > 0 && filteredSites.every(s => selectedIds.has(s.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSites.map((s: any) => s.id)));
    }
  };

  const toggleOne = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleGenerateSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.generateReports(ids);
      setSelectedIds(new Set());
      await fetchJobs();
      await fetchSites();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegenerate = async (siteId: number) => {
    try {
      await api.regenerateReport(siteId);
      await fetchJobs();
      await fetchSites();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleView = (siteId: number, domain: string) => {
    setViewingSiteId(siteId);
    setViewingDomain(domain);
  };

  const activeJob = jobs.find((j: any) => j.status === 'running');

  const filterTabs: { key: ReportFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'completed', label: 'Completed', count: counts.completed },
    { key: 'pending', label: 'Queued', count: counts.pending },
    { key: 'generating', label: 'Generating', count: counts.generating },
    { key: 'error', label: 'Errors', count: counts.error },
    { key: 'no_report', label: 'No Report', count: counts.no_report },
  ];

  if (loading) {
    return (
      <div>
        <Header title="Step 4: PDF Reports" subtitle="Generate and manage branded analysis reports" />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded w-1/3" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Step 4: PDF Reports" subtitle="Generate and manage branded analysis reports" />

      <div className="p-6 space-y-4">
        {/* Active Job Progress */}
        {activeJob && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <Loader2 size={16} className="animate-spin text-indigo-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-indigo-800">Generating reports...</p>
              <p className="text-xs text-indigo-600">
                {activeJob.processed_items} / {activeJob.total_items} completed ({activeJob.progress}%)
              </p>
            </div>
            <div className="w-32 h-2 bg-indigo-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${activeJob.progress}%` }} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700 font-medium">×</button>
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateSelected}
              disabled={selectedIds.size === 0 || submitting}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Generate Reports ({selectedIds.size})
            </button>
            <button
              onClick={() => { fetchSites(); fetchJobs(); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search domains..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-64"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === tab.key
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  filter === tab.key ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sites Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">
              Analyzed Sites ({filteredSites.length})
            </h3>
          </div>

          {analyzedSites.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No analyzed sites yet.</p>
              <p className="text-xs text-gray-400 mt-1">Run analysis on sites first to generate reports.</p>
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">No sites match the current filter.</p>
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 w-10">
                        <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Health</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSites.map((site: any) => (
                      <tr key={site.id} className={`hover:bg-gray-50 ${selectedIds.has(site.id) ? 'bg-primary-50' : ''}`}>
                        <td className="px-3 py-3">
                          <input type="checkbox" checked={selectedIds.has(site.id)} onChange={() => toggleOne(site.id)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                        </td>
                        <td className="px-4 py-3">
                          <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:text-primary-800 font-medium">
                            {site.domain}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600">{site.company_name || '—'}</span>
                        </td>
                        <td className="px-4 py-3"><HealthScoreBadge score={site.analysis?.health_score ?? null} /></td>
                        <td className="px-4 py-3"><PriorityBadge priority={site.analysis?.priority_classification ?? null} /></td>
                        <td className="px-4 py-3"><ReportStatusBadge status={site.report_status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {site.report_status === 'completed' ? (
                              <>
                                <button
                                  onClick={() => handleView(site.id, site.domain)}
                                  className="p-1 text-gray-400 hover:text-primary-600 rounded hover:bg-gray-100"
                                  title="View Report"
                                >
                                  <Eye size={14} />
                                </button>
                                <a
                                  href={api.getReportDownloadUrl(site.id)}
                                  className="p-1 text-gray-400 hover:text-primary-600 rounded hover:bg-gray-100"
                                  title="Download PDF"
                                >
                                  <Download size={14} />
                                </a>
                                <button
                                  onClick={() => handleRegenerate(site.id)}
                                  className="p-1 text-gray-400 hover:text-primary-600 rounded hover:bg-gray-100"
                                  title="Regenerate"
                                >
                                  <RefreshCw size={14} />
                                </button>
                              </>
                            ) : site.report_status === 'error' ? (
                              <button
                                onClick={() => handleRegenerate(site.id)}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-800 border border-red-200 rounded hover:bg-red-50"
                              >
                                <RefreshCw size={10} />
                                Retry
                              </button>
                            ) : site.report_status === 'pending' || site.report_status === 'generating' ? (
                              <span className="text-xs text-gray-400 italic">Processing...</span>
                            ) : (
                              <button
                                onClick={async () => {
                                  try {
                                    await api.generateReports([site.id]);
                                    await fetchJobs();
                                    await fetchSites();
                                  } catch (err: any) {
                                    setError(err.message);
                                  }
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-primary-600 hover:text-primary-800 border border-primary-200 rounded hover:bg-primary-50"
                              >
                                <FileText size={10} />
                                Generate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {viewingSiteId !== null && (
        <ReportViewer
          siteId={viewingSiteId}
          domain={viewingDomain}
          onClose={() => setViewingSiteId(null)}
        />
      )}
    </div>
  );
}
