import { useState } from 'react';
import { DataTable } from '../shared/DataTable';
import { ExternalLink, Check, X, Sparkles } from 'lucide-react';
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
  const [analyzing, setAnalyzing] = useState(false);

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      const siteIds = sites.map(s => s.id);
      await api.analyzeSites({ siteIds });
      onRefresh?.();
    } catch (err: any) {
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const columns = [
    {
      key: 'company_name',
      label: 'Company',
      sortable: true,
      render: (row: Site) => (
        <span className="text-sm font-medium text-gray-900 truncate max-w-[150px] block" title={row.company_name || row.domain}>
          {row.company_name || row.domain}
        </span>
      ),
    },
    {
      key: 'domain',
      label: 'Domain',
      sortable: true,
      render: (row: Site) => (
        <div className="flex items-center gap-1">
          <a
            href={row.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-800 text-xs"
          >
            {row.domain}
          </a>
          <ExternalLink size={10} className="text-gray-400" />
        </div>
      ),
    },
    {
      key: 'industry_segment',
      label: 'Industry',
      render: (row: Site) => (
        <span className="text-xs text-gray-600 truncate max-w-[120px] block" title={row.industry_segment || ''}>
          {row.industry_segment || '-'}
        </span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (row: Site) => <PriorityBadge priority={row.priority} />,
    },
    {
      key: 'ai_fit_reasoning',
      label: 'Fit Reasoning',
      render: (row: Site) => (
        <span
          className="text-xs text-gray-500 truncate max-w-[200px] block cursor-help"
          title={row.ai_fit_reasoning || ''}
        >
          {row.ai_fit_reasoning ? (row.ai_fit_reasoning.length > 80 ? row.ai_fit_reasoning.slice(0, 80) + '...' : row.ai_fit_reasoning) : '-'}
        </span>
      ),
    },
    {
      key: 'emails_available_count',
      label: 'Emails',
      render: (row: Site) => (
        <span className="text-xs text-gray-500">{row.emails_available_count || 0}</span>
      ),
    },
    {
      key: 'is_wordpress',
      label: 'WP',
      sortable: true,
      className: 'w-12 text-center',
      render: (row: Site) =>
        row.is_wordpress ? (
          <Check size={14} className="text-green-600 mx-auto" />
        ) : (
          <X size={14} className="text-red-400 mx-auto" />
        ),
    },
    {
      key: 'wp_version',
      label: 'Ver',
      render: (row: Site) => (
        <span className="text-xs text-gray-500">{row.wp_version || '-'}</span>
      ),
    },
    {
      key: 'outreach_status',
      label: 'Outreach',
      render: (row: Site) => <OutreachBadge status={row.outreach_status} />,
    },
  ];

  return (
    <div>
      <div className="px-4 py-2 border-b border-gray-100 flex justify-end">
        <button
          onClick={handleRunAnalysis}
          disabled={analyzing || sites.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles size={14} />
          {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
        </button>
      </div>
      <DataTable
        columns={columns}
        data={sites}
        total={total}
        page={page}
        pageSize={pageSize}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onPageChange={onPageChange}
        onSort={onSort}
        emptyMessage="No sites discovered yet. Start a discovery job or import a CSV."
      />
    </div>
  );
}
