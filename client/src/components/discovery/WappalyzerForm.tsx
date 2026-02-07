import { useState } from 'react';

interface WappalyzerFormProps {
  onSubmit: (config: { apiKey: string; urls: string[] }) => void;
  loading?: boolean;
}

export function WappalyzerForm({ onSubmit, loading }: WappalyzerFormProps) {
  const [apiKey, setApiKey] = useState('');
  const [urlText, setUrlText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const urls = urlText.split(/[\n,]+/).map(u => u.trim()).filter(u => u.length > 0);
    if (apiKey.trim() && urls.length > 0) {
      onSubmit({ apiKey: apiKey.trim(), urls });
    }
  };

  const urlCount = urlText.split(/[\n,]+/).filter(u => u.trim().length > 0).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Wappalyzer API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="Enter your Wappalyzer API key"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">URLs to Check</label>
        <textarea
          value={urlText}
          onChange={e => setUrlText(e.target.value)}
          placeholder="https://example.com&#10;https://another-site.com"
          className="w-full h-28 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          {urlCount} URL{urlCount !== 1 ? 's' : ''} | Free tier: 50 lookups/month
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!apiKey.trim() || urlCount === 0 || loading}
          className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Starting...' : 'Check with Wappalyzer'}
        </button>
      </div>
    </form>
  );
}
