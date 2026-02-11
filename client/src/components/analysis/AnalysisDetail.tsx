import { useState, useEffect } from 'react';
import { X, RefreshCw, Shield, Lock, Globe, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { ScoreBreakdown } from './ScoreBreakdown';
import { TagBadges } from '../common/TagBadges';
import { api } from '../../lib/api';

interface AnalysisDetailProps {
  siteId: number;
  onClose: () => void;
  onReanalyze: (siteId: number) => void;
}

function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return <span className="text-xs text-gray-400">—</span>;
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-green-100 text-green-700 border-green-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[priority] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

function HealthScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-3xl font-bold text-gray-300">—</span>;
  let color = 'text-green-600';
  if (score < 40) color = 'text-red-600';
  else if (score < 56) color = 'text-orange-600';
  else if (score < 76) color = 'text-yellow-600';
  return <span className={`text-3xl font-bold ${color}`}>{score}</span>;
}

export function AnalysisDetail({ siteId, onClose, onReanalyze }: AnalysisDetailProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getAnalysisSiteDetail(siteId);
        setData(res.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [siteId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="bg-white rounded-xl shadow-xl p-8">
          <Loader2 size={24} className="animate-spin text-primary-600 mx-auto" />
          <p className="text-sm text-gray-500 mt-2">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md">
          <p className="text-sm text-red-600">{error || 'No data available'}</p>
          <button onClick={onClose} className="mt-4 text-sm text-gray-500 hover:text-gray-700">Close</button>
        </div>
      </div>
    );
  }

  const { site, analysis, tags } = data;
  const vulnDetails = analysis?.vulnerability_details ? JSON.parse(analysis.vulnerability_details) : null;
  const plugins = analysis?.wpscan_plugins ? JSON.parse(analysis.wpscan_plugins) : [];
  const users = analysis?.wpscan_users ? JSON.parse(analysis.wpscan_users) : [];
  const configBackups = analysis?.wpscan_config_backups ? JSON.parse(analysis.wpscan_config_backups) : [];
  const dbExports = analysis?.wpscan_db_exports ? JSON.parse(analysis.wpscan_db_exports) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{site.domain}</h2>
              <div className="flex items-center gap-2 mt-1">
                <PriorityBadge priority={analysis?.priority_classification} />
                <TagBadges tags={tags || []} size="sm" />
                {analysis?.analyzed_at && (
                  <span className="text-[10px] text-gray-400">
                    Analyzed {new Date(analysis.analyzed_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onReanalyze(siteId)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw size={12} />
              Re-analyze
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Overall Score */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <HealthScoreBadge score={analysis?.health_score ?? null} />
              <p className="text-xs text-gray-500 mt-1">Health Score</p>
            </div>
            <div className="text-xs text-gray-500">
              {analysis?.health_score !== null && analysis?.health_score < 40 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  <CheckCircle size={12} /> Auto-Qualified for Outreach
                </span>
              )}
              {analysis?.health_score !== null && analysis?.health_score >= 40 && analysis?.health_score < 75 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                  <AlertTriangle size={12} /> Needs Manual Review
                </span>
              )}
            </div>
          </div>

          {/* Score Breakdown */}
          <ScoreBreakdown
            securityScore={analysis?.security_score ?? null}
            performanceScore={analysis?.performance_score ?? null}
            seoScore={analysis?.seo_score ?? analysis?.wp_health_score ?? null}
            availabilityScore={analysis?.availability_score ?? null}
            healthScore={analysis?.health_score ?? null}
            priorityClassification={analysis?.priority_classification ?? null}
          />

          {/* Security Details */}
          <section className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <Shield size={14} className="text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">Security Details</h3>
            </div>
            <div className="p-4 space-y-3">
              {/* SSL */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-gray-500">SSL Status</p>
                  <p className="font-medium flex items-center gap-1">
                    {analysis?.ssl_valid ? (
                      <><CheckCircle size={12} className="text-green-500" /> Valid</>
                    ) : (
                      <><XCircle size={12} className="text-red-500" /> Invalid</>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Issuer</p>
                  <p className="font-medium">{analysis?.ssl_issuer || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Expires</p>
                  <p className="font-medium">
                    {analysis?.ssl_expiry_date ? new Date(analysis.ssl_expiry_date).toLocaleDateString() : '—'}
                    {analysis?.ssl_days_until_expiry !== null && (
                      <span className={`ml-1 ${analysis.ssl_days_until_expiry <= 30 ? 'text-red-500' : 'text-gray-400'}`}>
                        ({analysis.ssl_days_until_expiry}d)
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Protocol</p>
                  <p className="font-medium">{analysis?.ssl_protocol_version || '—'}</p>
                </div>
              </div>

              {/* Vulnerabilities */}
              {vulnDetails && vulnDetails.totalVulnerabilities > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Vulnerabilities Found: {vulnDetails.totalVulnerabilities}
                  </p>
                  <div className="flex gap-2 mb-2">
                    {vulnDetails.criticalCount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">{vulnDetails.criticalCount} Critical</span>}
                    {vulnDetails.highCount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">{vulnDetails.highCount} High</span>}
                    {vulnDetails.mediumCount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">{vulnDetails.mediumCount} Medium</span>}
                    {vulnDetails.lowCount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">{vulnDetails.lowCount} Low</span>}
                  </div>
                  {vulnDetails.matches?.slice(0, 5).map((m: any, i: number) => (
                    <div key={i} className="text-[11px] text-gray-600 py-1 border-b border-gray-50 last:border-0">
                      <span className="font-medium">{m.software_slug}</span>
                      <span className="text-gray-400 ml-1">({m.software_type})</span>
                      <span className="text-gray-400 ml-1">— {m.vulnerabilities.length} vuln(s)</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Config/DB exposure */}
              <div className="flex gap-4 text-xs mt-2">
                <div className="flex items-center gap-1">
                  {configBackups.length === 0 ? (
                    <><CheckCircle size={12} className="text-green-500" /> No config backups exposed</>
                  ) : (
                    <><AlertTriangle size={12} className="text-red-500" /> {configBackups.length} config backup(s) exposed</>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {dbExports.length === 0 ? (
                    <><CheckCircle size={12} className="text-green-500" /> No DB exports exposed</>
                  ) : (
                    <><AlertTriangle size={12} className="text-red-500" /> {dbExports.length} DB export(s) exposed</>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Performance Details */}
          <section className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <Globe size={14} className="text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">Performance Details (PageSpeed Insights)</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Performance', value: analysis?.psi_performance_score },
                  { label: 'Accessibility', value: analysis?.psi_accessibility_score },
                  { label: 'SEO', value: analysis?.psi_seo_score },
                  { label: 'Best Practices', value: analysis?.psi_best_practices_score },
                ].map(item => (
                  <div key={item.label} className="text-center">
                    <p className="text-2xl font-bold" style={{ color: getScoreTextColor(item.value) }}>
                      {item.value !== null && item.value !== undefined ? Math.round(item.value) : '—'}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* WordPress Health Details */}
          {site.is_wordpress && (
            <section className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <Lock size={14} className="text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">WordPress Health</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-gray-500">WP Version</p>
                    <p className="font-medium">{analysis?.wpscan_wp_version || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Version Status</p>
                    <p className="font-medium">
                      <WPVersionStatusBadge status={analysis?.wpscan_wp_version_status} />
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Theme</p>
                    <p className="font-medium">
                      {analysis?.wpscan_theme || '—'}
                      {analysis?.wpscan_theme_version && <span className="text-gray-400 ml-1">v{analysis.wpscan_theme_version}</span>}
                    </p>
                  </div>
                </div>

                {/* Plugins */}
                {plugins.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-700 mb-1">Plugins ({plugins.length})</p>
                    <div className="max-h-32 overflow-y-auto space-y-0.5">
                      {plugins.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-[11px] py-0.5">
                          <span className="text-gray-700">{p.slug || p.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">{p.version || '?'}</span>
                            {p.outdated && <span className="text-[10px] px-1 py-0.5 rounded bg-orange-100 text-orange-600 font-medium">outdated</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Users */}
                {users.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-700">
                      <AlertTriangle size={12} className="inline text-orange-500 mr-1" />
                      {users.length} user(s) enumerated: {users.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function WPVersionStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400">—</span>;
  const colors: Record<string, string> = {
    latest: 'text-green-600',
    outdated: 'text-orange-600',
    insecure: 'text-red-600',
  };
  return <span className={`font-medium ${colors[status] || 'text-gray-600'}`}>{status}</span>;
}

function getScoreTextColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return '#9ca3af';
  if (score < 40) return '#dc2626';
  if (score < 56) return '#ea580c';
  if (score < 76) return '#ca8a04';
  return '#16a34a';
}
