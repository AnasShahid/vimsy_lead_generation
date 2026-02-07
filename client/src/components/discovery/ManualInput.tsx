import { useState } from 'react';

interface ManualInputProps {
  onSubmit: (urls: string[]) => void;
  loading?: boolean;
}

export function ManualInput({ onSubmit, loading }: ManualInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const urls = text
      .split(/[\n,]+/)
      .map(u => u.trim())
      .filter(u => u.length > 0);
    if (urls.length > 0) onSubmit(urls);
  };

  const urlCount = text
    .split(/[\n,]+/)
    .filter(u => u.trim().length > 0).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Enter URLs (one per line or comma-separated)
      </label>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="https://example.com&#10;https://another-site.com&#10;law-firm-website.com"
        className="w-full h-40 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {urlCount} URL{urlCount !== 1 ? 's' : ''} detected
        </span>
        <button
          type="submit"
          disabled={urlCount === 0 || loading}
          className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Starting...' : 'Start Discovery'}
        </button>
      </div>
    </form>
  );
}
