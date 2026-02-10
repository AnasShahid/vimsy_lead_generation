import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Search, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

const SENIORITY_OPTIONS = ['junior', 'senior', 'executive'];

const DEPARTMENT_OPTIONS = [
  'executive', 'it', 'finance', 'management', 'sales', 'legal',
  'support', 'hr', 'marketing', 'communication', 'education',
  'design', 'health', 'operations',
];

const TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'personal', label: 'Personal' },
  { value: 'generic', label: 'Generic' },
];

const REQUIRED_FIELD_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'full_name', label: 'Full Name' },
  { value: 'position', label: 'Position' },
  { value: 'phone_number', label: 'Phone Number' },
];

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
              <span className="truncate capitalize">{opt}</span>
            </label>
          ))}
        </div>
      )}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selected.map(s => (
            <span key={s} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-primary-50 text-primary-700 border border-primary-200 capitalize">
              {s}
              <button
                type="button"
                onClick={() => onChange(selected.filter(v => v !== s))}
                className="ml-1 text-primary-400 hover:text-primary-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface HunterEnrichmentFormProps {
  selectedCount: number;
  onEnrich: (filters: Record<string, any>, apiKey: string) => void;
  loading?: boolean;
}

export function HunterEnrichmentForm({ selectedCount, onEnrich, loading }: HunterEnrichmentFormProps) {
  const [expanded, setExpanded] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [seniority, setSeniority] = useState<string[]>([]);
  const [department, setDepartment] = useState<string[]>([]);
  const [emailType, setEmailType] = useState('');
  const [requiredField, setRequiredField] = useState('');
  const [maxResults, setMaxResults] = useState(5);
  const [locationCountry, setLocationCountry] = useState('');
  const [locationState, setLocationState] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [jobTitles, setJobTitles] = useState('');

  // Load API key from settings
  useEffect(() => {
    api.getSettings()
      .then(res => {
        const settings = res.data || {};
        if (settings.hunter_api_key) {
          setApiKey(settings.hunter_api_key);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = () => {
    const filters: Record<string, any> = {
      limit: maxResults,
    };

    if (seniority.length > 0) filters.seniority = seniority;
    if (department.length > 0) filters.department = department;
    if (emailType) filters.type = emailType;
    if (requiredField) filters.required_field = requiredField;
    if (jobTitles.trim()) {
      filters.job_titles = jobTitles.split(',').map(t => t.trim()).filter(Boolean);
    }

    // Build location filter
    const locationInclude: Record<string, string>[] = [];
    if (locationCountry || locationState || locationCity) {
      const loc: Record<string, string> = {};
      if (locationCountry) loc.country = locationCountry;
      if (locationState) loc.state = locationState;
      if (locationCity) loc.city = locationCity;
      locationInclude.push(loc);
    }
    if (locationInclude.length > 0) {
      filters.location = { include: locationInclude };
    }

    onEnrich(filters, apiKey);
  };

  const filterSummary = [
    seniority.length > 0 ? `Seniority: ${seniority.join(', ')}` : null,
    department.length > 0 ? `Dept: ${department.join(', ')}` : null,
    emailType ? `Type: ${emailType}` : null,
    `Max: ${maxResults}/domain`,
  ].filter(Boolean).join(' · ');

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
          <span className="text-sm font-medium text-gray-700">Hunter.io Enrichment Filters</span>
        </div>
        {!expanded && (
          <span className="text-xs text-gray-400 truncate max-w-md">{filterSummary}</span>
        )}
      </button>

      {/* Form */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
            {/* API Key */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Hunter.io API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Enter your Hunter.io API key"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Max Results */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Results / Domain</label>
              <input
                type="number"
                min={1}
                max={15}
                value={maxResults}
                onChange={e => setMaxResults(Math.min(15, Math.max(1, parseInt(e.target.value) || 5)))}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email Type</label>
              <select
                value={emailType}
                onChange={e => setEmailType(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-primary-500"
              >
                {TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Seniority */}
            <MultiSelect
              label="Seniority"
              options={SENIORITY_OPTIONS}
              selected={seniority}
              onChange={setSeniority}
              placeholder="Any seniority..."
            />

            {/* Department */}
            <MultiSelect
              label="Department"
              options={DEPARTMENT_OPTIONS}
              selected={department}
              onChange={setDepartment}
              placeholder="Any department..."
            />

            {/* Required Field */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Required Field</label>
              <select
                value={requiredField}
                onChange={e => setRequiredField(e.target.value)}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-primary-500"
              >
                {REQUIRED_FIELD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Job Titles */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Job Titles (comma-separated)</label>
              <input
                type="text"
                value={jobTitles}
                onChange={e => setJobTitles(e.target.value)}
                placeholder="e.g. CEO, CTO, Marketing Director"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Country Code</label>
              <input
                type="text"
                value={locationCountry}
                onChange={e => setLocationCountry(e.target.value.toUpperCase())}
                placeholder="e.g. AU, US"
                maxLength={2}
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
              <input
                type="text"
                value={locationState}
                onChange={e => setLocationState(e.target.value)}
                placeholder="e.g. California"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
              <input
                type="text"
                value={locationCity}
                onChange={e => setLocationCity(e.target.value)}
                placeholder="e.g. Sydney"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading || !apiKey.trim() || selectedCount === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Creating job...
                </>
              ) : (
                <>
                  <Search size={14} />
                  Enrich {selectedCount} Site{selectedCount !== 1 ? 's' : ''}
                </>
              )}
            </button>
            {selectedCount === 0 && (
              <span className="text-xs text-gray-400">Select sites above to enrich</span>
            )}
            {selectedCount > 0 && !apiKey.trim() && (
              <span className="text-xs text-red-500">API key required</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
