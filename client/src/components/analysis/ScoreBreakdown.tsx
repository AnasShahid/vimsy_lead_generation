import { Shield, Gauge, Search, Wifi } from 'lucide-react';

interface ScoreBreakdownProps {
  securityScore: number | null;
  performanceScore: number | null;
  wpHealthScore: number | null;
  healthScore: number | null;
  priorityClassification: string | null;
}

function getScoreColor(score: number | null): { text: string; bg: string; ring: string } {
  if (score === null) return { text: 'text-gray-400', bg: 'bg-gray-50', ring: 'text-gray-300' };
  if (score < 40) return { text: 'text-red-600', bg: 'bg-red-50', ring: 'text-red-400' };
  if (score < 56) return { text: 'text-orange-600', bg: 'bg-orange-50', ring: 'text-orange-400' };
  if (score < 76) return { text: 'text-yellow-600', bg: 'bg-yellow-50', ring: 'text-yellow-400' };
  return { text: 'text-green-600', bg: 'bg-green-50', ring: 'text-green-400' };
}

function ScoreCard({
  label,
  weight,
  score,
  icon,
}: {
  label: string;
  weight: string;
  score: number | null;
  icon: React.ReactNode;
}) {
  const colors = getScoreColor(score);
  const pct = score !== null ? Math.min(100, Math.max(0, score)) : 0;

  return (
    <div className={`rounded-lg border p-3 ${colors.bg} border-gray-200`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={colors.text}>{icon}</span>
          <div>
            <p className="text-xs font-medium text-gray-800">{label}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">{weight}</p>
          </div>
        </div>
        <span className={`text-xl font-bold ${colors.text}`}>
          {score !== null ? score : '—'}
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${score !== null ? colors.ring.replace('text-', 'bg-') : 'bg-gray-300'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ScoreBreakdown({
  securityScore,
  performanceScore,
  wpHealthScore,
}: ScoreBreakdownProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <ScoreCard
        label="Performance"
        weight="30 pts"
        score={performanceScore}
        icon={<Gauge size={16} />}
      />
      <ScoreCard
        label="Security"
        weight="30 pts"
        score={securityScore}
        icon={<Shield size={16} />}
      />
      <ScoreCard
        label="SEO"
        weight="20 pts"
        score={wpHealthScore}
        icon={<Search size={16} />}
      />
      <ScoreCard
        label="Availability"
        weight="20 pts"
        score={null}
        icon={<Wifi size={16} />}
      />
    </div>
  );
}
