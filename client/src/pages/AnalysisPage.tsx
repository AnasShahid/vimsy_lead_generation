import { useState, useEffect, useCallback } from 'react';
import { Loader2, Search, RefreshCw, Eye, Play } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { QueueFilters } from '../components/analysis/QueueFilters';
import { AnalysisDetail } from '../components/analysis/AnalysisDetail';
import { TagBadges } from '../components/common/TagBadges';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';
import type { QueueFilter, QueueFilterCounts } from '../components/analysis/QueueFilters';

function HealthScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return <span className="text-xs text-gray-400">—</span>;
  let color = 'bg-green-100 text-green-700 border-green-200';
  if (score < 40) color = 'bg-red-100 text-red-700 border-red-200';
  else if (score < 56) color = 'bg-orange-100 text-orange-700 border-orange-200';
  else if (score < 76) color = 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${color}`}>
      {score}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return <span className="text-xs text-gray-400">—</span>;
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-green-100 text-green-700 border-green-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[priority] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
      {priority === 'critical' && <span className="ml-1 text-[10px]">✓ Auto-Qualified</span>}
    </span>
  );
}

function AnalysisStatusBadge({ status }: { status: string | null }) {
  if (!status || status === 'pending') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">Pending</span>;
  }
  if (status === 'analyzing') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
        <Loader2 size={10} className="animate-spin" />
        Analyzing
      </span>
    );
  }
  if (status === 'analyzed') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">Analyzed</span>;
  }
  if (status === 'error') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">Error</span>;
  }
  return <span className="text-xs text-gray-400">—</span>;
}

function ScoreCell({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) return <span className="text-xs text-gray-400">—</span>;
  const rounded = Math.round(score);
  let color = 'text-green-600';
  if (rounded < 40) color = 'text-red-600';
  else if (rounded < 56) color = 'text-orange-600';
  else if (rounded < 76) color = 'text-yellow-600';
  return <span className={`text-xs font-medium ${color}`}>{rounded}</span>;
}

export function AnalysisPage() {
  const [sites, setSites] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [jobs, setJobs] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<QueueFilter>('all');
  const [detailSiteId, setDetailSiteId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSites = useCallback(async () => {
    try {
      const res = await api.getAnalysisSites({ page, pageSize, search: search || undefined });
      setSites(res.data || []);
      setTotal(res.total || 0);
    } catch {
      // silent
    }
  }, [page, pageSize, search]);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.getAnalysisJobs();
      setJobs(res.data || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { fetchSites(); fetchJobs(); }, [fetchSites, fetchJobs]);

  const hasActiveJobs = jobs.some((j: any) => j.status === 'pending' || j.status === 'running');
  usePolling(() => { fetchSites(); fetchJobs(); }, 3000, hasActiveJobs);

  // Filter sites client-side based on queue filter
  const filteredSites = sites.filter(s => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return s.analysis_status === 'pending' || s.analysis_status === 'analyzing';
    if (activeFilter === 'errors') return s.analysis_status === 'error';
    if (activeFilter === 'auto_qualified') return s.analysis?.priority_classification === 'critical' || s.analysis?.priority_classification === 'high';
    if (activeFilter === 'manual_review') return s.analysis?.priority_classification === 'medium';
    if (activeFilter === 'low_priority') return s.analysis?.priority_classification === 'low';
    return true;
  });

  // Calculate counts for queue filters
  const counts: QueueFilterCounts = {
    all: sites.length,
    autoQualified: sites.filter(s => s.analysis?.priority_classification === 'critical' || s.analysis?.priority_classification === 'high').length,
    manualReview: sites.filter(s => s.analysis?.priority_classification === 'medium').length,
    lowPriority: sites.filter(s => s.analysis?.priority_classification === 'low').length,
    pending: sites.filter(s => s.analysis_status === 'pending' || s.analysis_status === 'analyzing').length,
    errors: sites.filter(s => s.analysis_status === 'error').length,
  };

  const allSelected = filteredSites.length > 0 && filteredSites.every(s => selectedIds.has(s.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSites.map(s => s.id)));
    }
  };

  const toggleOne = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleAnalyzeSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createAnalysisJob(ids);
      setSelectedIds(new Set());
      await fetchJobs();
      await fetchSites();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReanalyze = async (siteId: number) => {
    try {
      await api.reanalyzeSites([siteId]);
      await fetchJobs();
      await fetchSites();
      setDetailSiteId(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const activeJob = jobs.find((j: any) => j.status === 'running');
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <Header title="Step 3: Technical Analysis" subtitle="Performance, security, and SEO scoring" />

      <div className="p-6 space-y-4">
        {/* Active Job Progress */}
        {activeJob && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <Loader2 size={16} className="animate-spin text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">Analysis in progress...</p>
              <p className="text-xs text-blue-600">
                {activeJob.processed_items} / {activeJob.total_items} sites processed ({activeJob.progress}%)
              </p>
            </div>
            <div className="w-32 h-2 bg-blue-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${activeJob.progress}%` }} />
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
              onClick={handleAnalyzeSelected}
              disabled={selectedIds.size === 0 || submitting}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Analyze Selected ({selectedIds.size})
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
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-64"
            />
          </div>
        </div>

        {/* Queue Filters */}
        <QueueFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} counts={counts} />

        {/* Sites Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              Sites in Analysis ({filteredSites.length}{filteredSites.length !== total ? ` of ${total}` : ''})
            </h3>
          </div>

          {filteredSites.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">No sites match the current filter.</p>
              <p className="text-xs text-gray-400 mt-1">Move sites from Enrichment to start analyzing.</p>
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Health</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Security</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perf</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SEO</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSites.map(site => (
                      <tr key={site.id} className={`hover:bg-gray-50 ${selectedIds.has(site.id) ? 'bg-primary-50' : ''}`}>
                        <td className="px-3 py-3">
                          <input type="checkbox" checked={selectedIds.has(site.id)} onChange={() => toggleOne(site.id)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                        </td>
                        <td className="px-4 py-3">
                          <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:text-primary-800 font-medium">
                            {site.domain}
                          </a>
                        </td>
                        <td className="px-4 py-3"><HealthScoreBadge score={site.analysis?.health_score ?? null} /></td>
                        <td className="px-4 py-3"><PriorityBadge priority={site.analysis?.priority_classification ?? null} /></td>
                        <td className="px-4 py-3"><ScoreCell score={site.analysis?.security_score} /></td>
                        <td className="px-4 py-3"><ScoreCell score={site.analysis?.performance_score} /></td>
                        <td className="px-4 py-3"><ScoreCell score={site.analysis?.seo_score ?? site.analysis?.wp_health_score} /></td>
                        <td className="px-4 py-3"><AnalysisStatusBadge status={site.analysis_status} /></td>
                        <td className="px-4 py-3"><TagBadges tags={site.tags || []} size="sm" /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setDetailSiteId(site.id)}
                              className="p-1 text-gray-400 hover:text-primary-600 rounded hover:bg-gray-100"
                              title="View Detail"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleReanalyze(site.id)}
                              className="p-1 text-gray-400 hover:text-primary-600 rounded hover:bg-gray-100"
                              title="Re-analyze"
                            >
                              <RefreshCw size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                    <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {detailSiteId !== null && (
        <AnalysisDetail
          siteId={detailSiteId}
          onClose={() => setDetailSiteId(null)}
          onReanalyze={handleReanalyze}
        />
      )}
    </div>
  );
}
