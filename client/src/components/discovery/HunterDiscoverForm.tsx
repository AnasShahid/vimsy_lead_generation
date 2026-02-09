import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

// Static data — loaded once from Hunter.io JSON files
const HEADCOUNT_OPTIONS = [
  '1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+',
];

const COMPANY_TYPE_OPTIONS = [
  'educational', 'educational institution', 'government agency', 'non profit',
  'partnership', 'privately held', 'public company', 'self employed', 'self owned', 'sole proprietorship',
];

const FUNDING_SERIES_OPTIONS = [
  'pre_seed', 'seed', 'pre_series_a', 'series_a', 'pre_series_b', 'series_b',
  'pre_series_c', 'series_c+', 'other',
];

const COUNTRY_OPTIONS = [
  { code: 'AU', label: 'Australia' },
  { code: 'US', label: 'United States' },
  { code: 'UK', label: 'United Kingdom' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'CA', label: 'Canada' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'SG', label: 'Singapore' },
  { code: 'IN', label: 'India' },
];

interface HunterDiscoverFormProps {
  onSubmit: (config: Record<string, unknown>) => void;
  loading?: boolean;
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter(v => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left border border-gray-300 rounded px-2.5 py-1.5 text-xs bg-white hover:bg-gray-50 focus:ring-2 focus:ring-primary-500"
      >
        {selected.length > 0 ? (
          <span className="text-gray-800">{selected.length} selected</span>
        ) : (
          <span className="text-gray-400">{placeholder || 'Select...'}</span>
        )}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {options.map(opt => (
            <label
              key={opt}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-xs"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="truncate">{opt}</span>
            </label>
          ))}
          {options.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">Loading...</div>
          )}
        </div>
      )}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selected.slice(0, 5).map(s => (
            <span key={s} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-primary-50 text-primary-700 border border-primary-200">
              {s.length > 25 ? s.slice(0, 25) + '...' : s}
              <button type="button" onClick={() => toggle(s)} className="ml-1 text-primary-400 hover:text-primary-600">&times;</button>
            </span>
          ))}
          {selected.length > 5 && (
            <span className="text-[10px] text-gray-400">+{selected.length - 5} more</span>
          )}
        </div>
      )}
    </div>
  );
}

export function HunterDiscoverForm({ onSubmit, loading }: HunterDiscoverFormProps) {
  const [apiKey, setApiKey] = useState('');

  // Filters
  const [query, setQuery] = useState('');
  const [similarTo, setSimilarTo] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [headcount, setHeadcount] = useState<string[]>([]);
  const [companyTypes, setCompanyTypes] = useState<string[]>([]);
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [keywords, setKeywords] = useState('');
  const [keywordsMatch, setKeywordsMatch] = useState<'any' | 'all'>('any');
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [techMatch, setTechMatch] = useState<'any' | 'all'>('any');
  const [fundingSeries, setFundingSeries] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // Loaded option lists
  const [industryOptions, setIndustryOptions] = useState<string[]>([]);
  const [technologyOptions, setTechnologyOptions] = useState<string[]>([]);

  // Load industries and technologies from Hunter.io
  useEffect(() => {
    fetch('https://hunter.io/files/industries.json')
      .then(r => r.json())
      .then(data => setIndustryOptions(Array.isArray(data) ? data : []))
      .catch(() => {});

    fetch('https://hunter.io/files/technologies.json')
      .then(r => r.json())
      .then(data => setTechnologyOptions(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    const filters: Record<string, any> = {};

    if (query.trim()) filters.query = query.trim();

    if (similarTo.trim()) {
      filters.similar_to = similarTo.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (countries.length > 0) {
      filters.headquarters_location = {
        include: countries.map(c => ({ country: c })),
      };
    }

    if (industries.length > 0) {
      filters.industry = { include: industries };
    }

    if (headcount.length > 0) {
      filters.headcount = headcount;
    }

    if (companyTypes.length > 0) {
      filters.company_type = { include: companyTypes };
    }

    if (yearFrom || yearTo) {
      filters.year_founded = {};
      if (yearFrom) filters.year_founded.from = parseInt(yearFrom);
      if (yearTo) filters.year_founded.to = parseInt(yearTo);
    }

    if (keywords.trim()) {
      const kws = keywords.split(',').map(s => s.trim()).filter(Boolean);
      if (kws.length > 0) {
        filters.keywords = { include: kws, match: keywordsMatch };
      }
    }

    if (technologies.length > 0) {
      filters.technology = { include: technologies, match: techMatch };
    }

    if (fundingSeries.length > 0) {
      filters.funding = { series: fundingSeries };
    }

    // Check at least one filter
    if (Object.keys(filters).length === 0) {
      alert('Please provide at least one filter or search query');
      return;
    }

    onSubmit({
      apiKey: apiKey.trim(),
      filters,
      page,
      limit: 100,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* API Key */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Hunter.io API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="Enter your Hunter.io API key"
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* AI Query (natural language) */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          AI Search Query <span className="text-gray-400">(optional — Hunter AI picks filters)</span>
        </label>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="e.g., Software companies in Australia with 50-200 employees"
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Similar To */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Similar To <span className="text-gray-400">(comma-separated domains)</span>
        </label>
        <input
          type="text"
          value={similarTo}
          onChange={e => setSimilarTo(e.target.value)}
          placeholder="e.g., stripe.com, shopify.com"
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Filter Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Country */}
        <MultiSelect
          label="Country"
          options={COUNTRY_OPTIONS.map(c => c.code)}
          selected={countries}
          onChange={setCountries}
          placeholder="Select countries..."
        />

        {/* Industry */}
        <MultiSelect
          label="Industry"
          options={industryOptions}
          selected={industries}
          onChange={setIndustries}
          placeholder="Select industries..."
        />

        {/* Headcount */}
        <MultiSelect
          label="Headcount"
          options={HEADCOUNT_OPTIONS}
          selected={headcount}
          onChange={setHeadcount}
          placeholder="Employee count..."
        />

        {/* Company Type */}
        <MultiSelect
          label="Company Type"
          options={COMPANY_TYPE_OPTIONS}
          selected={companyTypes}
          onChange={setCompanyTypes}
          placeholder="Select types..."
        />

        {/* Technology */}
        <div>
          <MultiSelect
            label="Technology"
            options={technologyOptions}
            selected={technologies}
            onChange={setTechnologies}
            placeholder="Select technologies..."
          />
          {technologies.length > 1 && (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[10px] text-gray-500">Match:</span>
              <select
                value={techMatch}
                onChange={e => setTechMatch(e.target.value as 'any' | 'all')}
                className="text-[10px] border border-gray-200 rounded px-1 py-0.5"
              >
                <option value="any">Any</option>
                <option value="all">All</option>
              </select>
            </div>
          )}
        </div>

        {/* Funding Series */}
        <MultiSelect
          label="Funding Series"
          options={FUNDING_SERIES_OPTIONS}
          selected={fundingSeries}
          onChange={setFundingSeries}
          placeholder="Select funding..."
        />
      </div>

      {/* Year Founded */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Year Founded From</label>
          <input
            type="number"
            value={yearFrom}
            onChange={e => setYearFrom(e.target.value)}
            placeholder="e.g., 2000"
            min={1900}
            max={2026}
            className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Year Founded To</label>
          <input
            type="number"
            value={yearTo}
            onChange={e => setYearTo(e.target.value)}
            placeholder="e.g., 2024"
            min={1900}
            max={2026}
            className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Keywords <span className="text-gray-400">(comma-separated)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={keywords}
            onChange={e => setKeywords(e.target.value)}
            placeholder="e.g., saas, ecommerce, wordpress"
            className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <select
            value={keywordsMatch}
            onChange={e => setKeywordsMatch(e.target.value as 'any' | 'all')}
            className="border border-gray-300 rounded px-2 py-1.5 text-xs"
          >
            <option value="any">Match Any</option>
            <option value="all">Match All</option>
          </select>
        </div>
      </div>

      {/* Pagination + Submit */}
      <div className="flex items-end justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600">Page:</label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              &laquo;
            </button>
            <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded min-w-[2rem] text-center">
              {page}
            </span>
            <button
              type="button"
              onClick={() => setPage(p => p + 1)}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              &raquo;
            </button>
          </div>
          <span className="text-[10px] text-gray-400">100 results/page</span>
        </div>

        <button
          type="submit"
          disabled={!apiKey.trim() || loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search size={14} />
          {loading ? 'Discovering...' : 'Discover Companies'}
        </button>
      </div>
    </form>
  );
}
