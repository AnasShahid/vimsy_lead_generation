import { JobProgress } from '../shared/JobProgress';

interface Job {
  id: string;
  status: string;
  provider: string;
  progress: number;
  processed_items: number;
  total_items: number;
  error?: string | null;
  created_at: string;
}

interface DiscoveryJobListProps {
  jobs: Job[];
  onCancel: (id: string) => void;
}

export function DiscoveryJobList({ jobs, onCancel }: DiscoveryJobListProps) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        No discovery jobs yet. Start one above.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map(job => (
        <JobProgress key={job.id} job={job} onCancel={onCancel} />
      ))}
    </div>
  );
}
