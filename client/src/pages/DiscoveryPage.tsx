import { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/layout/Header';
import { ManualInput } from '../components/discovery/ManualInput';
import { DirectorySearchForm } from '../components/discovery/DirectorySearchForm';
import { BuiltWithForm } from '../components/discovery/BuiltWithForm';
import { WappalyzerForm } from '../components/discovery/WappalyzerForm';
import { DiscoveryJobList } from '../components/discovery/DiscoveryJobList';
import { SiteResultsTable } from '../components/discovery/SiteResultsTable';
import { CSVImport } from '../components/shared/CSVImport';
import { CSVExport } from '../components/shared/CSVExport';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';
import { HunterLeadsForm } from '../components/discovery/HunterLeadsForm';
import { Search, FolderOpen, Zap, Radar, UserSearch, FileSpreadsheet } from 'lucide-react';

type ProviderTab = 'manual' | 'hunter' | 'directory' | 'builtwith' | 'wappalyzer' | 'import' | 'import-enriched';

const TABS: { key: ProviderTab; label: string; icon: React.ReactNode }[] = [
  { key: 'manual', label: 'Manual URLs', icon: <Search size={16} /> },
  { key: 'hunter', label: 'Hunter.io Leads', icon: <UserSearch size={16} /> },
  { key: 'directory', label: 'Directories', icon: <FolderOpen size={16} /> },
  { key: 'builtwith', label: 'BuiltWith', icon: <Zap size={16} /> },
  { key: 'wappalyzer', label: 'Wappalyzer', icon: <Radar size={16} /> },
  { key: 'import', label: 'Import CSV', icon: <Search size={16} /> },
  { key: 'import-enriched', label: 'Import Leads', icon: <FileSpreadsheet size={16} /> },
];

export function DiscoveryPage() {
  const [activeTab, setActiveTab] = useState<ProviderTab>('manual');
  const [jobs, setJobs] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState({
    search: '',
    is_wordpress: '' as string,
    status: '',
    market: '' as string,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.listJobs();
      setJobs(res.data || []);
    } catch {
      // silent
    }
  }, []);

  const fetchSites = useCallback(async () => {
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        page,
        pageSize,
        sortBy,
        sortOrder,
      };
      if (filters.search) params.search = filters.search;
      if (filters.is_wordpress) params.is_wordpress = filters.is_wordpress;
      if (filters.status) params.status = filters.status;
      if (filters.market === 'english') {
        params.english_markets_only = true;
      } else if (filters.market) {
        params.country = filters.market;
      }

      const res = await api.listSites(params);
      setSites(res.data || []);
      setTotal(res.total || 0);
    } catch {
      // silent
    }
  }, [page, pageSize, sortBy, sortOrder, filters]);

  useEffect(() => { fetchJobs(); fetchSites(); }, [fetchJobs, fetchSites]);

  const hasActiveJobs = jobs.some(j => j.status === 'pending' || j.status === 'running');
  usePolling(() => { fetchJobs(); fetchSites(); }, 2000, hasActiveJobs);

  const handleCreateJob = async (provider: string, config: Record<string, unknown>) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.createJob(provider, config);
      await fetchJobs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelJob = async (id: string) => {
    try {
      await api.cancelJob(id);
      await fetchJobs();
    } catch {
      // silent
    }
  };

  const handleImportFile = async (file: File) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.importCsv(file);
      await fetchJobs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportEnrichedFile = async (file: File) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.importEnrichedFile(file);
      await fetchSites();
      setError(null);
      alert(`Imported ${result.data.imported} leads (${result.data.skipped} skipped)`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportText = async (text: string) => {
    // Convert plain text URLs to CSV format
    const lines = text.split(/[\n,]+/).map(u => u.trim()).filter(u => u.length > 0);
    const csvText = 'url\n' + lines.join('\n');
    setSubmitting(true);
    setError(null);
    try {
      await api.importCsvText(csvText);
      await fetchJobs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  };

  return (
    <div>
      <Header
        title="Step 1: WordPress Discovery"
        subtitle="Find WordPress websites using multiple sources"
        actions={<CSVExport filters={{}} />}
      />

      <div className="p-6 space-y-6">
        {/* Discovery Input Section */}
        <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {activeTab === 'manual' && (
              <ManualInput
                onSubmit={urls => handleCreateJob('manual', { urls })}
                loading={submitting}
              />
            )}
            {activeTab === 'hunter' && (
              <HunterLeadsForm
                onSubmit={config => handleCreateJob('hunter', config)}
                loading={submitting}
              />
            )}
            {activeTab === 'directory' && (
              <DirectorySearchForm
                onSubmit={config => handleCreateJob('directory', config)}
                loading={submitting}
              />
            )}
            {activeTab === 'builtwith' && (
              <BuiltWithForm
                onSubmit={config => handleCreateJob('builtwith', config)}
                loading={submitting}
              />
            )}
            {activeTab === 'wappalyzer' && (
              <WappalyzerForm
                onSubmit={config => handleCreateJob('wappalyzer', config)}
                loading={submitting}
              />
            )}
            {activeTab === 'import' && (
              <CSVImport
                onImportFile={handleImportFile}
                onImportText={handleImportText}
                loading={submitting}
              />
            )}
            {activeTab === 'import-enriched' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Import pre-analyzed leads in Vimsy format (Company Name, Domain, Industry, Priority, etc.).
                  Accepts <strong>.xlsx</strong> or <strong>.csv</strong> files.
                </p>
                <div>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleImportEnrichedFile(file);
                    }}
                    disabled={submitting}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 disabled:opacity-50"
                  />
                </div>
                {submitting && (
                  <p className="text-sm text-primary-600">Importing leads...</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Jobs Section */}
        {jobs.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Discovery Jobs ({jobs.length})
            </h3>
            <DiscoveryJobList jobs={jobs} onCancel={handleCancelJob} />
          </section>
        )}

        {/* Filters */}
        <section className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
                placeholder="Search by URL, domain, or title..."
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">WordPress</label>
              <select
                value={filters.is_wordpress}
                onChange={e => { setFilters(f => ({ ...f, is_wordpress: e.target.value })); setPage(1); }}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All</option>
                <option value="true">WordPress Only</option>
                <option value="false">Non-WordPress</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="error">Error</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Market</label>
              <select
                value={filters.market}
                onChange={e => { setFilters(f => ({ ...f, market: e.target.value })); setPage(1); }}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All</option>
                <option value="english">English Markets Only</option>
                <option value="AU">Australia</option>
                <option value="US">United States</option>
                <option value="UK">United Kingdom</option>
                <option value="NZ">New Zealand</option>
                <option value="CA">Canada</option>
              </select>
            </div>
            <button
              onClick={() => fetchSites()}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
            >
              Refresh
            </button>
          </div>
        </section>

        {/* Results Table */}
        <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              Discovered Sites ({total})
            </h3>
          </div>
          <SiteResultsTable
            sites={sites}
            total={total}
            page={page}
            pageSize={pageSize}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onPageChange={setPage}
            onSort={handleSort}
            onRefresh={fetchSites}
          />
        </section>
      </div>
    </div>
  );
}
