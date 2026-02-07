import { StatusBadge } from './StatusBadge';

interface JobProgressProps {
  job: {
    id: string;
    status: string;
    provider: string;
    progress: number;
    processed_items: number;
    total_items: number;
    error?: string | null;
    created_at: string;
  };
  onCancel?: (id: string) => void;
}

export function JobProgress({ job, onCancel }: JobProgressProps) {
  const isRunning = job.status === 'running' || job.status === 'pending';

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusBadge status={job.status} />
          <span className="text-sm font-medium text-gray-700">{job.provider}</span>
          <span className="text-xs text-gray-400">{job.id.slice(0, 8)}</span>
        </div>
        {isRunning && onCancel && (
          <button
            onClick={() => onCancel(job.id)}
            className="text-xs text-red-600 hover:text-red-800 font-medium"
          >
            Cancel
          </button>
        )}
      </div>

      {(job.status === 'running' || job.status === 'completed') && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{job.processed_items} / {job.total_items} processed</span>
            <span>{job.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                job.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(job.progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {job.error && (
        <p className="mt-2 text-xs text-red-600">{job.error}</p>
      )}

      <p className="mt-2 text-xs text-gray-400">
        Created: {new Date(job.created_at).toLocaleString()}
      </p>
    </div>
  );
}
