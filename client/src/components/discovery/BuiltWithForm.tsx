import { useState } from 'react';

interface BuiltWithFormProps {
  onSubmit: (config: { apiKey: string; technology: string; country?: string; maxResults: number }) => void;
  loading?: boolean;
}

export function BuiltWithForm({ onSubmit, loading }: BuiltWithFormProps) {
  const [apiKey, setApiKey] = useState('');
  const [technology, setTechnology] = useState('WordPress');
  const [country, setCountry] = useState('');
  const [maxResults, setMaxResults] = useState(100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onSubmit({
        apiKey: apiKey.trim(),
        technology,
        country: country || undefined,
        maxResults,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">BuiltWith API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="Enter your BuiltWith API key"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Technology</label>
          <input
            type="text"
            value={technology}
            onChange={e => setTechnology(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <input
            type="text"
            value={country}
            onChange={e => setCountry(e.target.value)}
            placeholder="e.g., us, uk"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Results</label>
          <input
            type="number"
            min={1}
            max={10000}
            value={maxResults}
            onChange={e => setMaxResults(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!apiKey.trim() || loading}
          className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Starting...' : 'Search BuiltWith'}
        </button>
      </div>
    </form>
  );
}
