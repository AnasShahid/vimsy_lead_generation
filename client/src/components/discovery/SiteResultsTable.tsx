import { useState, useMemo } from 'react';
import { ExternalLink, Check, X, Sparkles, Trash2, Edit3, ArrowRight, ChevronUp, ChevronDown, Globe } from 'lucide-react';
import { api } from '../../lib/api';

interface Site {
  id: number;
  url: string;
  domain: string;
  is_wordpress: boolean;
  wp_version: string | null;
  detected_theme: string | null;
  detected_plugins: string | null;
  discovery_source: string;
  status: string;
  http_status_code: number | null;
  ssl_valid: boolean | null;
  response_time_ms: number | null;
  page_title: string | null;
  company_name: string | null;
  industry_segment: string | null;
  ai_fit_reasoning: string | null;
  emails_available_count: number;
  priority: string | null;
  outreach_status: string | null;
  pipeline_stage: string | null;
}

interface SiteResultsTableProps {
  sites: Site[];
  total: number;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onSort: (key: string, order: 'asc' | 'desc') => void;
  onRefresh?: () => void;
}

function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority || priority === 'cold') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Cold</span>;
  }
  if (priority === 'warm') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">Warm</span>;
  }
  if (priority === 'hot') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Hot</span>;
  }
  return <span className="text-xs text-gray-400">-</span>;
}

function OutreachBadge({ status }: { status: string | null }) {
  if (!status || status === 'not_started') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Not Started</span>;
  }
  if (status === 'in_progress') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">In Progress</span>;
  }
  if (status === 'done') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Done</span>;
  }
  return <span className="text-xs text-gray-400">-</span>;
}

export function SiteResultsTable({
  sites,
  total,
  page,
  pageSize,
  sortBy,
  sortOrder,
  onPageChange,
  onSort,
  onRefresh,
}: SiteResultsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [wpAnalyzing, setWpAnalyzing] = useState(false);
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [batchPriority, setBatchPriority] = useState('');
  const [batchOutreach, setBatchOutreach] = useState('');
  const [batchPipeline, setBatchPipeline] = useState('');

  const allSelected = sites.length > 0 && sites.every(s => selectedIds.has(s.id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sites.map(s => s.id)));
    }
  };

  const toggleOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);

  const handleRunAnalysis = async () => {
    const ids = selectedArray.length > 0 ? selectedArray : sites.map(s => s.id);
    if (ids.length === 0) return;
    setAnalyzing(true);
    try {
      await api.analyzeSites({ siteIds: ids });
      onRefresh?.();
    } catch (err: any) {
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedArray.length === 0) return;
    if (!confirm(`Delete ${selectedArray.length} selected site(s)? This cannot be undone.`)) return;
    try {
      await api.batchDeleteSites(selectedArray);
      setSelectedIds(new Set());
      onRefresh?.();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleWpAnalyze = async () => {
    const ids = selectedArray.length > 0 ? selectedArray : sites.map(s => s.id);
    if (ids.length === 0) return;
    setWpAnalyzing(true);
    try {
      await api.wpAnalyzeSites(ids);
      onRefresh?.();
    } catch (err: any) {
      alert(`WP Analysis failed: ${err.message}`);
    } finally {
      setWpAnalyzing(false);
    }
  };

  const handleBatchUpdate = async () => {
    if (selectedArray.length === 0) return;
    const updates: Record<string, string> = {};
    if (batchPriority) updates.priority = batchPriority;
    if (batchOutreach) updates.outreach_status = batchOutreach;
    if (batchPipeline) updates.pipeline_stage = batchPipeline;
    if (Object.keys(updates).length === 0) {
      alert('Select at least one field to update');
      return;
    }
    try {
      await api.batchUpdateSites(selectedArray, updates);
      setShowBatchEdit(false);
      setBatchPriority('');
      setBatchOutreach('');
      setBatchPipeline('');
      onRefresh?.();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleSort = (key: string) => {
    const newOrder = sortBy === key && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(key, newOrder);
  };

  const totalPages = Math.ceil(total / pageSize);

  if (sites.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No sites discovered yet. Start a discovery job or import a CSV.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {someSelected && (
            <>
              <span className="text-xs font-medium text-gray-600">
                {selectedIds.size} selected
              </span>
              <div className="w-px h-4 bg-gray-300" />
              <button
                onClick={handleRunAnalysis}
                disabled={analyzing}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 disabled:opacity-50"
              >
                <Sparkles size={12} />
                {analyzing ? 'Analyzing...' : 'AI Analyze'}
              </button>
              <button
                onClick={handleWpAnalyze}
                disabled={wpAnalyzing}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 disabled:opacity-50"
              >
                <Globe size={12} />
                {wpAnalyzing ? 'Checking...' : 'WP Analyze'}
              </button>
              <button
                onClick={() => setShowBatchEdit(!showBatchEdit)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
              >
                <Edit3 size={12} />
                Edit
              </button>
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
              >
                <Trash2 size={12} />
                Delete
              </button>
              <button
                onClick={() => {
                  if (selectedArray.length === 0) return;
                  api.moveToEnrichment(selectedArray)
                    .then(() => {
                      setSelectedIds(new Set());
                      onRefresh?.();
                    })
                    .catch((err: any) => alert(err.message));
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
              >
                <ArrowRight size={12} />
                Move to Enrichment
              </button>
            </>
          )}
        </div>
        {!someSelected && (
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing || sites.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={14} />
            {analyzing ? 'Analyzing...' : 'Run AI Analysis (All)'}
          </button>
        )}
      </div>

      {/* Batch Edit Panel */}
      {showBatchEdit && someSelected && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">Priority</label>
            <select value={batchPriority} onChange={e => setBatchPriority(e.target.value)} className="border border-blue-300 rounded px-2 py-1 text-xs">
              <option value="">No change</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">Outreach</label>
            <select value={batchOutreach} onChange={e => setBatchOutreach(e.target.value)} className="border border-blue-300 rounded px-2 py-1 text-xs">
              <option value="">No change</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">Pipeline Stage</label>
            <select value={batchPipeline} onChange={e => setBatchPipeline(e.target.value)} className="border border-blue-300 rounded px-2 py-1 text-xs">
              <option value="">No change</option>
              <option value="discovered">Discovered</option>
              <option value="enrichment">Enrichment</option>
              <option value="analysis">Analysis</option>
              <option value="outreach">Outreach</option>
            </select>
          </div>
          <button
            onClick={handleBatchUpdate}
            className="px-3 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Apply to {selectedIds.size} site(s)
          </button>
          <button
            onClick={() => setShowBatchEdit(false)}
            className="px-3 py-1 text-xs font-medium rounded text-blue-600 hover:bg-blue-100"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              {[
                { key: 'company_name', label: 'Company', sortable: true },
                { key: 'domain', label: 'Domain', sortable: true },
                { key: 'industry_segment', label: 'Industry', sortable: false },
                { key: 'priority', label: 'Priority', sortable: true },
                { key: 'ai_fit_reasoning', label: 'Fit Reasoning', sortable: false },
                { key: 'emails_available_count', label: 'Emails', sortable: false },
                { key: 'is_wordpress', label: 'WP', sortable: true },
                { key: 'wp_version', label: 'Ver', sortable: false },
                { key: 'outreach_status', label: 'Outreach', sortable: false },
              ].map(col => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortBy === col.key && (
                      sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sites.map(row => (
              <tr key={row.id} className={`hover:bg-gray-50 ${selectedIds.has(row.id) ? 'bg-primary-50' : ''}`}>
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.id)}
                    onChange={() => toggleOne(row.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-gray-900 truncate max-w-[150px] block" title={row.company_name || row.domain}>
                    {row.company_name || row.domain}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800 text-xs">
                      {row.domain}
                    </a>
                    <ExternalLink size={10} className="text-gray-400" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-600 truncate max-w-[120px] block" title={row.industry_segment || ''}>
                    {row.industry_segment || '-'}
                  </span>
                </td>
                <td className="px-4 py-3"><PriorityBadge priority={row.priority} /></td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-500 truncate max-w-[200px] block cursor-help" title={row.ai_fit_reasoning || ''}>
                    {row.ai_fit_reasoning ? (row.ai_fit_reasoning.length > 80 ? row.ai_fit_reasoning.slice(0, 80) + '...' : row.ai_fit_reasoning) : '-'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-500">{row.emails_available_count || 0}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  {row.is_wordpress ? <Check size={14} className="text-green-600 mx-auto" /> : <X size={14} className="text-red-400 mx-auto" />}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-500">{row.wp_version || '-'}</span>
                </td>
                <td className="px-4 py-3"><OutreachBadge status={row.outreach_status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
