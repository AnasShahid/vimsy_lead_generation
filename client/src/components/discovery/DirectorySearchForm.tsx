import { useState } from 'react';

interface DirectorySearchFormProps {
  onSubmit: (config: { directories: string[]; maxPages: number; industry?: string }) => void;
  loading?: boolean;
}

const DEFAULT_DIRECTORIES = [
  'https://developer.wordpress.org/showcase/',
];

export function DirectorySearchForm({ onSubmit, loading }: DirectorySearchFormProps) {
  const [directories, setDirectories] = useState(DEFAULT_DIRECTORIES.join('\n'));
  const [maxPages, setMaxPages] = useState(5);
  const [industry, setIndustry] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dirs = directories.split('\n').map(d => d.trim()).filter(d => d.length > 0);
    if (dirs.length > 0) {
      onSubmit({
        directories: dirs,
        maxPages,
        industry: industry || undefined,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Directory URLs (one per line)
        </label>
        <textarea
          value={directories}
          onChange={e => setDirectories(e.target.value)}
          placeholder="https://directory-site.com/wordpress-themes/"
          className="w-full h-24 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Pages per Directory</label>
          <input
            type="number"
            min={1}
            max={20}
            value={maxPages}
            onChange={e => setMaxPages(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Industry Filter</label>
          <input
            type="text"
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            placeholder="e.g., legal, medical"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Starting...' : 'Start Directory Scrape'}
        </button>
      </div>
    </form>
  );
}
