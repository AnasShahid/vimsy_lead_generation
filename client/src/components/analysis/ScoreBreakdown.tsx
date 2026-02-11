import { Shield, Gauge, Search, Wifi } from 'lucide-react';

interface ScoreBreakdownProps {
  securityScore: number | null;
  performanceScore: number | null;
  seoScore: number | null;
  availabilityScore: number | null;
  healthScore: number | null;
  priorityClassification: string | null;
}

function getScoreColor(score: number | null, max: number): { text: string; bg: string; ring: string } {
  if (score === null) return { text: 'text-gray-400', bg: 'bg-gray-50', ring: 'text-gray-300' };
  const pct = (score / max) * 100;
  if (pct < 40) return { text: 'text-red-600', bg: 'bg-red-50', ring: 'text-red-400' };
  if (pct < 60) return { text: 'text-orange-600', bg: 'bg-orange-50', ring: 'text-orange-400' };
  if (pct < 80) return { text: 'text-yellow-600', bg: 'bg-yellow-50', ring: 'text-yellow-400' };
  return { text: 'text-green-600', bg: 'bg-green-50', ring: 'text-green-400' };
}

function ScoreCard({
  label,
  max,
  score,
  icon,
}: {
  label: string;
  max: number;
  score: number | null;
  icon: React.ReactNode;
}) {
  const colors = getScoreColor(score, max);
  const pct = score !== null ? Math.min(100, Math.max(0, (score / max) * 100)) : 0;

  return (
    <div className={`rounded-lg border p-3 ${colors.bg} border-gray-200`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={colors.text}>{icon}</span>
          <div>
            <p className="text-xs font-medium text-gray-800">{label}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">{max} pts max</p>
          </div>
        </div>
        <span className={`text-xl font-bold ${colors.text}`}>
          {score !== null ? score : '—'}
          <span className="text-xs font-normal text-gray-400">/{max}</span>
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
  seoScore,
  availabilityScore,
}: ScoreBreakdownProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <ScoreCard
        label="Performance"
        max={30}
        score={performanceScore}
        icon={<Gauge size={16} />}
      />
      <ScoreCard
        label="Security"
        max={30}
        score={securityScore}
        icon={<Shield size={16} />}
      />
      <ScoreCard
        label="SEO"
        max={20}
        score={seoScore}
        icon={<Search size={16} />}
      />
      <ScoreCard
        label="Availability"
        max={20}
        score={availabilityScore}
        icon={<Wifi size={16} />}
      />
    </div>
  );
}
