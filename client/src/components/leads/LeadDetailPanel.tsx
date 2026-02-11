import { useState, useEffect } from 'react';
import {
  Loader2,
  Mail,
  Shield,
  Zap,
  Search as SearchIcon,
  Globe,
  Bug,
  FileText,
  Download,
  Eye,
  Activity,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../lib/api';

interface LeadDetailPanelProps {
  siteId: number;
  onAction?: () => void;
}

function ScoreBar({ label, score, max, icon: Icon }: { label: string; score: number | null; max: number; icon: any }) {
  if (score === null || score === undefined) {
    return (
      <div className="flex items-center gap-2">
        <Icon size={12} className="text-gray-400" />
        <span className="text-xs text-gray-500 w-24">{label}</span>
        <span className="text-xs text-gray-400">—</span>
      </div>
    );
  }
  const pct = Math.min(100, Math.max(0, (score / max) * 100));
  let barColor = 'bg-green-500';
  if (pct <= 40) barColor = 'bg-red-500';
  else if (pct <= 60) barColor = 'bg-orange-500';
  else if (pct <= 75) barColor = 'bg-yellow-500';

  return (
    <div className="flex items-center gap-2">
      <Icon size={12} className="text-gray-400 shrink-0" />
      <span className="text-xs text-gray-500 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 w-8 text-right">{score}</span>
    </div>
  );
}

function VerificationBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-[10px] text-gray-400">—</span>;
  const config: Record<string, string> = {
    valid: 'text-green-600',
    invalid: 'text-red-600',
    accept_all: 'text-yellow-600',
    unknown: 'text-gray-500',
  };
  return (
    <span className={`text-[10px] font-medium ${config[status] || 'text-gray-500'}`}>
      {status}
    </span>
  );
}

function PipelineTimeline({ site }: { site: any }) {
  const steps = [
    { label: 'Enrichment', status: site.enrichment_status, active: !!site.enrichment_status },
    { label: 'Analysis', status: site.analysis_status, active: !!site.analysis_status },
    { label: 'Report', status: site.report_status, active: !!site.report_status },
    { label: 'Outreach', status: site.outreach_status !== 'not_started' ? site.outreach_status : null, active: site.outreach_status !== 'not_started' },
  ];

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        let dotColor = 'bg-gray-300';
        if (step.status === 'enriched' || step.status === 'analyzed' || step.status === 'completed' || step.status === 'done') {
          dotColor = 'bg-green-500';
        } else if (step.status === 'enriching' || step.status === 'analyzing' || step.status === 'generating' || step.status === 'in_progress') {
          dotColor = 'bg-blue-500 animate-pulse';
        } else if (step.status === 'error') {
          dotColor = 'bg-red-500';
        } else if (step.status === 'pending') {
          dotColor = 'bg-yellow-400';
        }

        return (
          <div key={step.label} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <div className={`w-2 h-2 rounded-full ${dotColor}`} title={`${step.label}: ${step.status || 'not started'}`} />
              <span className="text-[9px] text-gray-400 mt-0.5">{step.label}</span>
            </div>
            {i < steps.length - 1 && <div className="w-4 h-px bg-gray-300 mb-3" />}
          </div>
        );
      })}
    </div>
  );
}

export function LeadDetailPanel({ siteId, onAction }: LeadDetailPanelProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getLeadDetail(siteId).then(res => {
      if (!cancelled) {
        setData(res.data);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [siteId]);

  const handleAnalyze = async () => {
    setActionLoading('analyze');
    try {
      await api.createAnalysisJob([siteId]);
      onAction?.();
      const res = await api.getLeadDetail(siteId);
      setData(res.data);
    } catch { /* silent */ }
    finally { setActionLoading(null); }
  };

  const handleGenerateReport = async () => {
    setActionLoading('report');
    try {
      await api.generateReports([siteId]);
      onAction?.();
      const res = await api.getLeadDetail(siteId);
      setData(res.data);
    } catch { /* silent */ }
    finally { setActionLoading(null); }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-8 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading details...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-6 text-center text-sm text-gray-500">
        Failed to load lead details.
      </div>
    );
  }

  const { site, contacts, analysis, report, tags } = data;

  return (
    <div className="bg-gray-50 border-t border-gray-200 px-6 py-5">
      <div className="grid grid-cols-3 gap-6">
        {/* Column 1: Contacts */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Mail size={12} />
            Contacts ({contacts?.length || 0})
          </h4>
          {!contacts || contacts.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No contacts found</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {contacts.map((c: any) => (
                <div key={c.id} className="bg-white rounded-lg border border-gray-200 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-800">
                      {c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || '—'}
                    </span>
                    {c.confidence !== null && (
                      <span className="text-[10px] text-gray-400">{c.confidence}%</span>
                    )}
                  </div>
                  <a href={`mailto:${c.email}`} className="text-[11px] text-primary-600 hover:text-primary-800 break-all">
                    {c.email}
                  </a>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {c.position && <span className="text-[10px] text-gray-500">{c.position}</span>}
                    {c.seniority && <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">{c.seniority}</span>}
                    {c.department && <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">{c.department}</span>}
                    <VerificationBadge status={c.verification_status} />
                  </div>
                  {c.linkedin_url && (
                    <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:text-blue-800 mt-1">
                      <ExternalLink size={8} /> LinkedIn
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Analysis Summary */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Activity size={12} />
            Analysis
          </h4>
          {!analysis ? (
            <div className="text-center py-4">
              <p className="text-xs text-gray-400 mb-3">Not analyzed yet</p>
              <button
                onClick={handleAnalyze}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {actionLoading === 'analyze' ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />}
                Analyze
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Health Score */}
              <div className="flex items-center gap-3">
                <div className={`text-2xl font-bold ${
                  (analysis.health_score ?? 0) <= 40 ? 'text-red-600' :
                  (analysis.health_score ?? 0) <= 60 ? 'text-orange-600' :
                  (analysis.health_score ?? 0) <= 75 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {analysis.health_score ?? '—'}
                </div>
                <div>
                  <span className="text-xs text-gray-500">Health Score</span>
                  {analysis.priority_classification && (
                    <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                      analysis.priority_classification === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
                      analysis.priority_classification === 'high' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                      analysis.priority_classification === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                      'bg-green-100 text-green-700 border-green-200'
                    }`}>
                      {analysis.priority_classification}
                    </span>
                  )}
                </div>
              </div>

              {/* Sub-scores */}
              <div className="space-y-1.5">
                <ScoreBar label="Performance" score={analysis.performance_score} max={30} icon={Zap} />
                <ScoreBar label="Security" score={analysis.security_score} max={30} icon={Shield} />
                <ScoreBar label="SEO" score={analysis.seo_score} max={20} icon={SearchIcon} />
                <ScoreBar label="Availability" score={analysis.availability_score} max={20} icon={Globe} />
              </div>

              {/* Vulns */}
              {analysis.vulnerabilities_found > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-red-600">
                  <Bug size={12} />
                  {analysis.vulnerabilities_found} vulnerabilities found
                </div>
              )}

              {/* Analyzed date */}
              {analysis.analyzed_at && (
                <p className="text-[10px] text-gray-400">
                  Analyzed: {new Date(analysis.analyzed_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Column 3: Report & Actions */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <FileText size={12} />
            Report & Status
          </h4>

          {/* Report actions */}
          <div className="space-y-3">
            {report && report.status === 'completed' ? (
              <div className="bg-white rounded-lg border border-green-200 px-3 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                    Report Ready
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={api.getReportPdfUrl(siteId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 border border-primary-200 rounded hover:bg-primary-50"
                  >
                    <Eye size={10} /> View
                  </a>
                  <a
                    href={api.getReportDownloadUrl(siteId)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    <Download size={10} /> Download
                  </a>
                </div>
                {report.generated_at && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Generated: {new Date(report.generated_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : report && (report.status === 'pending' || report.status === 'generating') ? (
              <div className="bg-white rounded-lg border border-blue-200 px-3 py-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                  <Loader2 size={10} className="animate-spin" />
                  {report.status === 'pending' ? 'Queued' : 'Generating'}
                </span>
              </div>
            ) : report && report.status === 'error' ? (
              <div className="bg-white rounded-lg border border-red-200 px-3 py-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200 mb-2">
                  Report Error
                </span>
                <button
                  onClick={handleGenerateReport}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-800 border border-red-200 rounded hover:bg-red-50 mt-1"
                >
                  Retry
                </button>
              </div>
            ) : analysis ? (
              <button
                onClick={handleGenerateReport}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {actionLoading === 'report' ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                Generate Report
              </button>
            ) : (
              <p className="text-xs text-gray-400 italic">Analyze first to generate a report</p>
            )}

            {/* Pipeline Timeline */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Pipeline</p>
              <PipelineTimeline site={site} />
            </div>

            {/* Tags */}
            {tags && tags.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Tag size={9} /> Tags
                </p>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag: string) => (
                    <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
