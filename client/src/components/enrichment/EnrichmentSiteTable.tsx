import { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { ContactDetailsPanel } from './ContactDetailsPanel';

interface EnrichmentSite {
  id: number;
  url: string;
  domain: string;
  company_name: string | null;
  enrichment_status: string | null;
  contact_count: number;
  updated_at: string;
  pipeline_stage: string | null;
  emails_available_count: number;
}

function EnrichmentStatusBadge({ status }: { status: string | null }) {
  if (!status || status === 'pending') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">Pending</span>;
  }
  if (status === 'enriching') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
        <Loader2 size={10} className="animate-spin" />
        Enriching
      </span>
    );
  }
  if (status === 'enriched') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">Enriched</span>;
  }
  if (status === 'error') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">Error</span>;
  }
  return <span className="text-xs text-gray-400">-</span>;
}

interface EnrichmentSiteTableProps {
  sites: EnrichmentSite[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  selectedIds: Set<number>;
  onSelectionChange: (ids: Set<number>) => void;
}

export function EnrichmentSiteTable({
  sites,
  total,
  page,
  pageSize,
  onPageChange,
  selectedIds,
  onSelectionChange,
}: EnrichmentSiteTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const allSelected = sites.length > 0 && sites.every(s => selectedIds.has(s.id));

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(sites.map(s => s.id)));
    }
  };

  const toggleOne = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const toggleExpand = (id: number) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const totalPages = Math.ceil(total / pageSize);

  if (sites.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">No sites in enrichment stage yet.</p>
        <p className="text-xs text-gray-400 mt-1">Move sites from Discovery to start enriching contacts.</p>
      </div>
    );
  }

  return (
    <div>
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
              <th className="px-2 py-3 w-8" />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacts</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emails Available</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sites.map(site => (
              <>
                <tr
                  key={site.id}
                  className={`hover:bg-gray-50 cursor-pointer ${selectedIds.has(site.id) ? 'bg-primary-50' : ''} ${expandedId === site.id ? 'bg-gray-50' : ''}`}
                  onClick={() => toggleExpand(site.id)}
                >
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(site.id)}
                      onChange={() => toggleOne(site.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-2 py-3 text-gray-400">
                    {expandedId === site.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[180px] block" title={site.company_name || site.domain}>
                      {site.company_name || site.domain}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:text-primary-800"
                      onClick={e => e.stopPropagation()}
                    >
                      {site.domain}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <EnrichmentStatusBadge status={site.enrichment_status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-700">{site.contact_count}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">{site.emails_available_count || 0}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">
                      {site.updated_at ? new Date(site.updated_at).toLocaleDateString() : '-'}
                    </span>
                  </td>
                </tr>
                {expandedId === site.id && (
                  <tr key={`${site.id}-contacts`}>
                    <td colSpan={8} className="p-0">
                      <ContactDetailsPanel siteId={site.id} />
                    </td>
                  </tr>
                )}
              </>
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
