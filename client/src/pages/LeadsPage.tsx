import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Search,
  RefreshCw,
  Activity,
  FileText,
  ChevronDown,
  ChevronRight,
  Users,
  Mail,
  Target,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { LeadDetailPanel } from '../components/leads/LeadDetailPanel';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';

type QuickFilter = 'all' | 'enriched' | 'analyzed' | 'reported' | 'outreach_pending';

interface LeadFilters {
  enrichment_status: string;
  analysis_status: string;
  report_status: string;
  outreach_status: string;
  priority: string;
  search: string;
}

const DEFAULT_FILTERS: LeadFilters = {
  enrichment_status: '',
  analysis_status: '',
  report_status: '',
  outreach_status: '',
  priority: '',
  search: '',
};

function EnrichmentStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-gray-400">—</span>;
  const config: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    enriching: { label: 'Enriching', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    enriched: { label: 'Enriched', color: 'bg-green-100 text-green-700 border-green-200' },
    error: { label: 'Error', color: 'bg-red-100 text-red-700 border-red-200' },
  };
  const c = config[status] || { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${c.color}`}>
      {status === 'enriching' && <Loader2 size={10} className="animate-spin mr-1" />}
      {c.label}
    </span>
  );
}

function AnalysisStatusBadge({ status, healthScore }: { status: string | null; healthScore: number | null }) {
  if (!status) return <span className="text-xs text-gray-400">—</span>;
  const config: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    analyzing: { label: 'Analyzing', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    analyzed: { label: 'Done', color: 'bg-green-100 text-green-700 border-green-200' },
    error: { label: 'Error', color: 'bg-red-100 text-red-700 border-red-200' },
  };
  const c = config[status] || { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200' };

  if (status === 'analyzed' && healthScore !== null) {
    let scoreColor = 'text-green-700';
    if (healthScore <= 40) scoreColor = 'text-red-700';
    else if (healthScore <= 60) scoreColor = 'text-orange-700';
    else if (healthScore <= 75) scoreColor = 'text-yellow-700';
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${c.color}`}>
        <span className={`font-bold ${scoreColor}`}>{healthScore}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${c.color}`}>
      {status === 'analyzing' && <Loader2 size={10} className="animate-spin mr-1" />}
      {c.label}
    </span>
  );
}

function ReportStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-gray-400">—</span>;
  const config: Record<string, { label: string; color: string }> = {
    pending: { label: 'Queued', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    generating: { label: 'Generating', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    completed: { label: 'Ready', color: 'bg-green-100 text-green-700 border-green-200' },
    error: { label: 'Error', color: 'bg-red-100 text-red-700 border-red-200' },
  };
  const c = config[status] || { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${c.color}`}>
      {status === 'generating' && <Loader2 size={10} className="animate-spin mr-1" />}
      {c.label}
    </span>
  );
}

function OutreachStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    not_started: { label: 'Not Started', color: 'bg-gray-100 text-gray-500 border-gray-200' },
    in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    done: { label: 'Done', color: 'bg-green-100 text-green-700 border-green-200' },
  };
  const c = config[status] || { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${c.color}`}>
      {c.label}
    </span>
  );
}

function LeadPriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { color: string }> = {
    hot: { color: 'bg-red-100 text-red-700 border-red-200' },
    warm: { color: 'bg-orange-100 text-orange-700 border-orange-200' },
    cold: { color: 'bg-blue-100 text-blue-700 border-blue-200' },
  };
  const c = config[priority] || { color: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${c.color}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
        <Icon size={16} className="text-white" />
      </div>
      <div>
        <p className="text-lg font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      title={label}
    >
      <option value="">{label}: All</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState<LeadFilters>(DEFAULT_FILTERS);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const buildApiParams = useCallback(() => {
    const params: Record<string, string | number> = { page, pageSize };

    // Quick filter overrides
    if (quickFilter === 'enriched') params.enrichment_status = 'enriched';
    else if (quickFilter === 'analyzed') params.analysis_status = 'analyzed';
    else if (quickFilter === 'reported') params.report_status = 'completed';
    else if (quickFilter === 'outreach_pending') params.outreach_status = 'not_started';

    // Granular filters (only apply if quick filter is 'all')
    if (quickFilter === 'all') {
      if (filters.enrichment_status) params.enrichment_status = filters.enrichment_status;
      if (filters.analysis_status) params.analysis_status = filters.analysis_status;
      if (filters.report_status) params.report_status = filters.report_status;
      if (filters.outreach_status) params.outreach_status = filters.outreach_status;
      if (filters.priority) params.priority = filters.priority;
    }

    if (filters.search) params.search = filters.search;

    return params;
  }, [page, pageSize, quickFilter, filters]);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await api.getLeads(buildApiParams());
      setLeads(res.data || []);
      setTotal(res.total || 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [buildApiParams]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.getLeadStats();
      setStats(res.data || null);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { fetchLeads(); fetchStats(); }, [fetchLeads, fetchStats]);

  // Poll when there are active processing leads
  const hasActiveProcessing = leads.some((l: any) =>
    l.enrichment_status === 'enriching' ||
    l.analysis_status === 'analyzing' ||
    l.report_status === 'pending' ||
    l.report_status === 'generating'
  );
  usePolling(() => { fetchLeads(); fetchStats(); }, 5000, hasActiveProcessing);

  const allSelected = leads.length > 0 && leads.every(l => selectedIds.has(l.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l: any) => l.id)));
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
    setSubmitting('analyze');
    setError(null);
    try {
      await api.createAnalysisJob(ids);
      setSelectedIds(new Set());
      await fetchLeads();
      await fetchStats();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(null);
    }
  };

  const handleGenerateReports = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setSubmitting('reports');
    setError(null);
    try {
      await api.generateReports(ids);
      setSelectedIds(new Set());
      await fetchLeads();
      await fetchStats();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(null);
    }
  };

  const handleQuickFilterChange = (qf: QuickFilter) => {
    setQuickFilter(qf);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleFilterChange = (key: keyof LeadFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
    setSelectedIds(new Set());
  };

  const totalPages = Math.ceil(total / pageSize);

  const quickFilterTabs: { key: QuickFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: stats?.total || 0 },
    { key: 'enriched', label: 'Enriched', count: stats?.enriched || 0 },
    { key: 'analyzed', label: 'Analyzed', count: stats?.analyzed || 0 },
    { key: 'reported', label: 'Reported', count: stats?.reports_ready || 0 },
    { key: 'outreach_pending', label: 'Outreach Pending', count: stats ? (stats.total - (stats.outreach_sent || 0)) : 0 },
  ];

  if (loading) {
    return (
      <div>
        <Header title="Leads" subtitle="Track all leads through the pipeline" />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-lg" />)}
            </div>
            <div className="h-10 bg-gray-200 rounded w-1/3" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Leads" subtitle="Track all leads through the pipeline" />

      <div className="p-6 space-y-4">
        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-5 gap-4">
            <StatCard label="Total Leads" value={stats.total || 0} icon={Target} color="bg-gray-700" />
            <StatCard label="Enriched" value={stats.enriched || 0} icon={Users} color="bg-purple-500" />
            <StatCard label="Analyzed" value={stats.analyzed || 0} icon={Activity} color="bg-indigo-500" />
            <StatCard label="Reports Ready" value={stats.reports_ready || 0} icon={FileText} color="bg-orange-500" />
            <StatCard label="Outreach Sent" value={stats.outreach_sent || 0} icon={Mail} color="bg-green-500" />
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
              disabled={selectedIds.size === 0 || submitting !== null}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting === 'analyze' ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
              Analyze ({selectedIds.size})
            </button>
            <button
              onClick={handleGenerateReports}
              disabled={selectedIds.size === 0 || submitting !== null}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting === 'reports' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              Reports ({selectedIds.size})
            </button>
            <button
              onClick={() => { fetchLeads(); fetchStats(); }}
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
              placeholder="Search domains or companies..."
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-72"
            />
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {quickFilterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleQuickFilterChange(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                quickFilter === tab.key
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  quickFilter === tab.key ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Granular Filters Row */}
        {quickFilter === 'all' && (
          <div className="flex items-center gap-2 flex-wrap">
            <FilterSelect
              label="Enrichment"
              value={filters.enrichment_status}
              onChange={v => handleFilterChange('enrichment_status', v)}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'enriching', label: 'Enriching' },
                { value: 'enriched', label: 'Enriched' },
                { value: 'error', label: 'Error' },
              ]}
            />
            <FilterSelect
              label="Analysis"
              value={filters.analysis_status}
              onChange={v => handleFilterChange('analysis_status', v)}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'analyzing', label: 'Analyzing' },
                { value: 'analyzed', label: 'Analyzed' },
                { value: 'error', label: 'Error' },
              ]}
            />
            <FilterSelect
              label="Report"
              value={filters.report_status}
              onChange={v => handleFilterChange('report_status', v)}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'generating', label: 'Generating' },
                { value: 'completed', label: 'Completed' },
                { value: 'error', label: 'Error' },
              ]}
            />
            <FilterSelect
              label="Outreach"
              value={filters.outreach_status}
              onChange={v => handleFilterChange('outreach_status', v)}
              options={[
                { value: 'not_started', label: 'Not Started' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'done', label: 'Done' },
              ]}
            />
            <FilterSelect
              label="Priority"
              value={filters.priority}
              onChange={v => handleFilterChange('priority', v)}
              options={[
                { value: 'hot', label: 'Hot' },
                { value: 'warm', label: 'Warm' },
                { value: 'cold', label: 'Cold' },
              ]}
            />
            {(filters.enrichment_status || filters.analysis_status || filters.report_status || filters.outreach_status || filters.priority) && (
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Leads Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              Leads ({total})
            </h3>
            {selectedIds.size > 0 && (
              <span className="text-xs text-primary-600 font-medium">{selectedIds.size} selected</span>
            )}
          </div>

          {leads.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Target size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No leads found.</p>
              <p className="text-xs text-gray-400 mt-1">Move sites from Discovery to Enrichment to start tracking leads.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 w-10">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Contacts</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrichment</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Analysis</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outreach</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th className="px-3 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leads.map((lead: any) => (
                    <>
                      <tr
                        key={lead.id}
                        className={`hover:bg-gray-50 ${selectedIds.has(lead.id) ? 'bg-primary-50' : ''} ${expandedId === lead.id ? 'bg-gray-50' : ''}`}
                      >
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(lead.id)}
                            onChange={() => toggleOne(lead.id)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <a href={lead.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:text-primary-800 font-medium">
                            {lead.domain}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600 truncate max-w-[150px] block">{lead.company_name || '—'}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-xs font-medium ${lead.contact_count > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                            {lead.contact_count > 0 ? lead.contact_count : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <EnrichmentStatusBadge status={lead.enrichment_status} />
                        </td>
                        <td className="px-3 py-3">
                          <AnalysisStatusBadge status={lead.analysis_status} healthScore={lead.analysis?.health_score ?? null} />
                        </td>
                        <td className="px-3 py-3">
                          <ReportStatusBadge status={lead.report?.report_status ?? lead.report_status} />
                        </td>
                        <td className="px-3 py-3">
                          <OutreachStatusBadge status={lead.outreach_status} />
                        </td>
                        <td className="px-3 py-3">
                          <LeadPriorityBadge priority={lead.priority} />
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                            title="Expand details"
                          >
                            {expandedId === lead.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                      </tr>
                      {expandedId === lead.id && (
                        <tr key={`detail-${lead.id}`}>
                          <td colSpan={10} className="p-0">
                            <LeadDetailPanel siteId={lead.id} onAction={() => { fetchLeads(); fetchStats(); }} />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-xs text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
