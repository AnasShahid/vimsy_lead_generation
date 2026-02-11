interface QueueFilterCounts {
  all: number;
  qualified: number;
  manualReview: number;
  maintenance: number;
  pending: number;
  errors: number;
}

type QueueFilter = 'all' | 'qualified' | 'manual_review' | 'maintenance' | 'pending' | 'errors';

interface QueueFiltersProps {
  activeFilter: QueueFilter;
  onFilterChange: (filter: QueueFilter) => void;
  counts: QueueFilterCounts;
}

const FILTERS: { key: QueueFilter; label: string; emoji: string; countKey: keyof QueueFilterCounts }[] = [
  { key: 'all', label: 'All', emoji: '', countKey: 'all' },
  { key: 'qualified', label: 'Qualified', emoji: '🔥', countKey: 'qualified' },
  { key: 'manual_review', label: 'Manual Review', emoji: '⚡', countKey: 'manualReview' },
  { key: 'maintenance', label: 'Maintenance', emoji: '✅', countKey: 'maintenance' },
  { key: 'pending', label: 'Pending', emoji: '', countKey: 'pending' },
  { key: 'errors', label: 'Errors', emoji: '', countKey: 'errors' },
];

const FILTER_COLORS: Record<QueueFilter, string> = {
  all: 'border-primary-600 text-primary-700 bg-primary-50',
  qualified: 'border-red-600 text-red-700 bg-red-50',
  manual_review: 'border-yellow-600 text-yellow-700 bg-yellow-50',
  maintenance: 'border-green-600 text-green-700 bg-green-50',
  pending: 'border-blue-600 text-blue-700 bg-blue-50',
  errors: 'border-red-600 text-red-700 bg-red-50',
};

export function QueueFilters({ activeFilter, onFilterChange, counts }: QueueFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map(f => {
        const count = counts[f.countKey];
        const isActive = activeFilter === f.key;

        return (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              isActive
                ? FILTER_COLORS[f.key]
                : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            {f.emoji && <span>{f.emoji}</span>}
            {f.label}
            <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
              isActive ? 'bg-white/60' : 'bg-gray-100'
            }`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export type { QueueFilter, QueueFilterCounts };
