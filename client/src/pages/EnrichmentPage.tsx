import { useState, useEffect, useCallback } from 'react';
import { UserSearch, Mail, Loader2 } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { EnrichmentSiteTable } from '../components/enrichment/EnrichmentSiteTable';
import { HunterEnrichmentForm } from '../components/enrichment/HunterEnrichmentForm';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';

type EnrichmentTab = 'hunter' | 'snov';

const TABS: { key: EnrichmentTab; label: string; icon: React.ReactNode }[] = [
  { key: 'hunter', label: 'Hunter.io', icon: <UserSearch size={16} /> },
  { key: 'snov', label: 'Snov.io', icon: <Mail size={16} /> },
];

export function EnrichmentPage() {
  const [activeTab, setActiveTab] = useState<EnrichmentTab>('hunter');
  const [sites, setSites] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [jobs, setJobs] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSites = useCallback(async () => {
    try {
      const res = await api.getEnrichmentSites({ page, pageSize });
      setSites(res.data || []);
      setTotal(res.total || 0);
    } catch {
      // silent
    }
  }, [page, pageSize]);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.getEnrichmentJobs();
      setJobs(res.data || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { fetchSites(); fetchJobs(); }, [fetchSites, fetchJobs]);

  const hasActiveJobs = jobs.some((j: any) => j.status === 'pending' || j.status === 'running');
  usePolling(() => { fetchSites(); fetchJobs(); }, 2000, hasActiveJobs);

  const handleEnrich = async (filters: Record<string, any>, apiKey: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      await api.createEnrichmentJob({
        siteIds: ids,
        provider: 'hunter',
        apiKey,
        filters,
      });
      setSelectedIds(new Set());
      await fetchJobs();
      await fetchSites();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Active enrichment job progress
  const activeJob = jobs.find((j: any) => j.status === 'running');

  return (
    <div>
      <Header title="Step 2: Contact Enrichment" subtitle="Find decision-maker emails and company data" />

      <div className="p-6 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Hunter.io Tab */}
        {activeTab === 'hunter' && (
          <div className="space-y-4">
            {/* Active Job Progress */}
            {activeJob && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
                <Loader2 size={16} className="animate-spin text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800">
                    Enrichment in progress...
                  </p>
                  <p className="text-xs text-blue-600">
                    {activeJob.processed_items} / {activeJob.total_items} sites processed ({activeJob.progress}%)
                  </p>
                </div>
                <div className="w-32 h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${activeJob.progress}%` }}
                  />
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

            {/* Filter Form */}
            <HunterEnrichmentForm
              selectedCount={selectedIds.size}
              onEnrich={handleEnrich}
              loading={submitting}
            />

            {/* Sites Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">
                  Sites in Enrichment ({total})
                </h3>
                <button
                  onClick={fetchSites}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Refresh
                </button>
              </div>
              <EnrichmentSiteTable
                sites={sites}
                total={total}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />
            </div>
          </div>
        )}

        {/* Snov.io Tab */}
        {activeTab === 'snov' && (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <Mail size={32} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Snov.io Integration</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Snov.io email enrichment is coming soon. This tab will allow you to find
              contacts using Snov.io's email finder and verification APIs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
