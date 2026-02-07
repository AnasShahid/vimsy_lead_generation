import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { api } from '../lib/api';
import {
  Search,
  Users,
  Activity,
  FileText,
  Mail,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

interface Stats {
  totalSites: number;
  wordpressSites: number;
  activeSites: number;
  activeJobs: number;
}

const PIPELINE_STEPS = [
  { step: 1, label: 'Discovery', icon: Search, path: '/discovery', color: 'bg-blue-500', description: 'Find WordPress websites' },
  { step: 2, label: 'Enrichment', icon: Users, path: '/enrichment', color: 'bg-purple-500', description: 'Get contact information' },
  { step: 3, label: 'Analysis', icon: Activity, path: '/analysis', color: 'bg-indigo-500', description: 'Technical site analysis' },
  { step: 4, label: 'Reports', icon: FileText, path: '/reports', color: 'bg-orange-500', description: 'Generate PDF reports' },
  { step: 5, label: 'Outreach', icon: Mail, path: '/outreach', color: 'bg-green-500', description: 'Cold email sequences' },
  { step: 6, label: 'Tracking', icon: BarChart3, path: '/tracking', color: 'bg-teal-500', description: 'Monitor responses' },
];

export function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalSites: 0,
    wordpressSites: 0,
    activeSites: 0,
    activeJobs: 0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [sitesRes, jobsRes] = await Promise.all([
          api.listSites({ pageSize: 1 }),
          api.listJobs(),
        ]);

        const totalSites = sitesRes.total || 0;
        const activeJobs = (jobsRes.data || []).filter(
          (j: any) => j.status === 'running' || j.status === 'pending'
        ).length;

        // Get WordPress count
        let wordpressSites = 0;
        try {
          const wpRes = await api.listSites({ pageSize: 1, is_wordpress: true });
          wordpressSites = wpRes.total || 0;
        } catch { /* ignore */ }

        // Get active count
        let activeSites = 0;
        try {
          const activeRes = await api.listSites({ pageSize: 1, status: 'active' });
          activeSites = activeRes.total || 0;
        } catch { /* ignore */ }

        setStats({ totalSites, wordpressSites, activeSites, activeJobs });
      } catch { /* ignore */ }
    }

    loadStats();
  }, []);

  return (
    <div>
      <Header title="Dashboard" subtitle="Vimsy Lead Generation Pipeline" />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Sites" value={stats.totalSites} />
          <StatCard label="WordPress Sites" value={stats.wordpressSites} />
          <StatCard label="Active Sites" value={stats.activeSites} />
          <StatCard label="Active Jobs" value={stats.activeJobs} />
        </div>

        {/* Pipeline Steps */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Steps</h3>
          <div className="grid grid-cols-3 gap-4">
            {PIPELINE_STEPS.map(({ step, label, icon: Icon, path, color, description }) => (
              <Link
                key={step}
                to={path}
                className="block border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
                    <Icon size={16} className="text-white" />
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">Step {step}</span>
                    <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
                  </div>
                  <ArrowRight size={16} className="ml-auto text-gray-300 group-hover:text-primary-500 transition-colors" />
                </div>
                <p className="text-xs text-gray-500">{description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value.toLocaleString()}</p>
    </div>
  );
}
