import { useState } from 'react';

interface HunterLeadList {
  id: number;
  name: string;
  leads_count: number;
}

interface HunterLeadsFormProps {
  onSubmit: (config: { apiKey: string; listId: number }) => void;
  loading?: boolean;
}

export function HunterLeadsForm({ onSubmit, loading }: HunterLeadsFormProps) {
  const [apiKey, setApiKey] = useState('');
  const [lists, setLists] = useState<HunterLeadList[]>([]);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [loadingLists, setLoadingLists] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listsFetched, setListsFetched] = useState(false);

  const handleFetchLists = async () => {
    if (!apiKey.trim()) return;
    setLoadingLists(true);
    setError(null);
    setLists([]);
    setSelectedListId(null);
    setListsFetched(false);

    try {
      const res = await fetch(`/api/discovery/hunter/lists?apiKey=${encodeURIComponent(apiKey.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch lead lists');
      }

      setLists(data.data || []);
      setListsFetched(true);

      if (data.data && data.data.length > 0) {
        setSelectedListId(data.data[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingLists(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim() && selectedListId) {
      onSubmit({ apiKey: apiKey.trim(), listId: selectedListId });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Hunter.io API Key</label>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setListsFetched(false); }}
            placeholder="Enter your Hunter.io API key"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <button
            type="button"
            onClick={handleFetchLists}
            disabled={!apiKey.trim() || loadingLists}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loadingLists ? 'Loading...' : 'Fetch Lists'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {listsFetched && lists.length === 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
          No lead lists found. Create a lead list in Hunter.io first.
        </div>
      )}

      {lists.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Lead List</label>
          <select
            value={selectedListId || ''}
            onChange={e => setSelectedListId(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {lists.map(list => (
              <option key={list.id} value={list.id}>
                {list.name} ({list.leads_count} leads)
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!apiKey.trim() || !selectedListId || loading}
          className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Importing...' : 'Import Leads'}
        </button>
      </div>
    </form>
  );
}
