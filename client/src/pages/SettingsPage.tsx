import { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { api } from '../lib/api';
import { RotateCcw, Save, Check, Shield, Download, Loader2, Brain, Database, FileText } from 'lucide-react';

interface AIModel {
  id: string;
  label: string;
  provider: string;
  tier: string;
}

type SettingsTab = 'ai' | 'security' | 'report';

const TABS: { key: SettingsTab; label: string; icon: React.ReactNode; description: string }[] = [
  { key: 'ai', label: 'AI Analysis', icon: <Brain size={18} />, description: 'Model & prompt configuration' },
  { key: 'security', label: 'Security Database', icon: <Database size={18} />, description: 'Vulnerability data management' },
  { key: 'report', label: 'Report Branding', icon: <FileText size={18} />, description: 'PDF report branding & content' },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');
  const [aiModel, setAiModel] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vulnDbStatus, setVulnDbStatus] = useState<any>(null);
  const [vulnDbUpdating, setVulnDbUpdating] = useState(false);
  const [vulnDbMessage, setVulnDbMessage] = useState<string | null>(null);
  const [reportSettings, setReportSettings] = useState<Record<string, string>>({});
  const [reportSaving, setReportSaving] = useState(false);
  const [reportSaved, setReportSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [settingsRes, modelsRes, vulnRes, reportRes] = await Promise.all([
          api.getSettings(),
          api.getAIModels(),
          api.getVulnDbStatus().catch(() => ({ data: null })),
          api.getReportSettings().catch(() => ({ data: {} })),
        ]);
        setAiModel(settingsRes.data.ai_model);
        setAiPrompt(settingsRes.data.ai_analysis_prompt);
        setModels(modelsRes.data);
        if (vulnRes.data) setVulnDbStatus(vulnRes.data);
        if (reportRes.data) setReportSettings(reportRes.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await api.updateSettings({ ai_model: aiModel, ai_analysis_prompt: aiPrompt });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPrompt = async () => {
    setError(null);
    try {
      const res = await api.resetPrompt();
      setAiPrompt(res.data.ai_analysis_prompt);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReportSave = async () => {
    setReportSaving(true);
    setReportSaved(false);
    setError(null);
    try {
      const res = await api.updateReportSettings(reportSettings);
      setReportSettings(res.data);
      setReportSaved(true);
      setTimeout(() => setReportSaved(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReportSaving(false);
    }
  };

  const handleVulnDbUpdate = async () => {
    setVulnDbUpdating(true);
    setVulnDbMessage(null);
    try {
      const res = await api.updateVulnDb();
      if (res.data?.success) {
        setVulnDbMessage(`Imported ${res.data.totalImported} vulnerabilities`);
        setVulnDbStatus({ lastUpdated: new Date().toISOString(), stats: res.data.stats });
      } else {
        setVulnDbMessage(`Update failed: ${res.data?.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setVulnDbMessage(`Error: ${err.message}`);
    } finally {
      setVulnDbUpdating(false);
      setTimeout(() => setVulnDbMessage(null), 5000);
    }
  };

  if (loading) {
    return (
      <div>
        <Header title="Settings" subtitle="Configure platform settings" />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded w-1/3" />
            <div className="h-40 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Group models by provider
  const groupedModels = models.reduce<Record<string, AIModel[]>>((acc, m) => {
    if (!acc[m.provider]) acc[m.provider] = [];
    acc[m.provider].push(m);
    return acc;
  }, {});

  return (
    <div>
      <Header title="Settings" subtitle="Configure platform settings" />

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-6">
          {/* Tab Navigation — Vertical Sidebar */}
          <nav className="w-56 flex-shrink-0">
            <div className="space-y-1">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.key
                      ? 'bg-primary-50 text-primary-700 border border-primary-200'
                      : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <span className={`mt-0.5 ${activeTab === tab.key ? 'text-primary-600' : 'text-gray-400'}`}>
                    {tab.icon}
                  </span>
                  <div>
                    <p className={`text-sm font-medium ${activeTab === tab.key ? 'text-primary-700' : 'text-gray-700'}`}>
                      {tab.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{tab.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </nav>

          {/* Tab Content */}
          <div className="flex-1 max-w-3xl">
            {/* AI Analysis Tab */}
            {activeTab === 'ai' && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-base font-semibold text-gray-800">AI Analysis — Discovery</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Configure the AI model and prompt used to analyze discovered sites. Powered by OpenRouter.
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Model Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Model
                    </label>
                    <select
                      value={aiModel}
                      onChange={e => setAiModel(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {Object.entries(groupedModels).map(([provider, providerModels]) => (
                        <optgroup key={provider} label={provider}>
                          {providerModels.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.label} ({m.tier})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1.5">
                      Select the model for AI site analysis. Flagship models are more accurate, fast models are cheaper.
                    </p>
                  </div>

                  {/* Prompt Editor */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Analysis Prompt
                      </label>
                      <button
                        onClick={handleResetPrompt}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        <RotateCcw size={12} />
                        Reset to default
                      </button>
                    </div>
                    <textarea
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      rows={18}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono leading-relaxed focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      This prompt is sent as the system message when analyzing sites. It defines how the AI evaluates and categorizes leads.
                    </p>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {saved ? <Check size={16} /> : <Save size={16} />}
                      {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
                    </button>
                    {saved && (
                      <span className="text-sm text-green-600">Settings saved successfully</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Report Branding Tab */}
            {activeTab === 'report' && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-base font-semibold text-gray-800">Report Branding</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Configure the branding and content for generated PDF reports.
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                    <input
                      type="text"
                      value={reportSettings.report_company_name || ''}
                      onChange={e => setReportSettings(s => ({ ...s, report_company_name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Vimsy"
                    />
                  </div>

                  {/* Logo URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                    <input
                      type="text"
                      value={reportSettings.report_logo_url || ''}
                      onChange={e => setReportSettings(s => ({ ...s, report_logo_url: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="https://example.com/logo.png"
                    />
                    {reportSettings.report_logo_url && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <img
                          src={reportSettings.report_logo_url}
                          alt="Logo preview"
                          className="max-h-16 object-contain"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Primary Brand Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Primary Brand Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={reportSettings.report_primary_color || '#4F46E5'}
                        onChange={e => setReportSettings(s => ({ ...s, report_primary_color: e.target.value }))}
                        className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={reportSettings.report_primary_color || ''}
                        onChange={e => setReportSettings(s => ({ ...s, report_primary_color: e.target.value }))}
                        className="w-32 border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="#4F46E5"
                      />
                    </div>
                  </div>

                  {/* Disclaimer Text */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Disclaimer Text</label>
                    <textarea
                      value={reportSettings.report_disclaimer || ''}
                      onChange={e => setReportSettings(s => ({ ...s, report_disclaimer: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
                    />
                  </div>

                  {/* CTA Text */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Call-to-Action Text</label>
                    <textarea
                      value={reportSettings.report_cta_text || ''}
                      onChange={e => setReportSettings(s => ({ ...s, report_cta_text: e.target.value }))}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
                    />
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                      <input
                        type="email"
                        value={reportSettings.report_contact_email || ''}
                        onChange={e => setReportSettings(s => ({ ...s, report_contact_email: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="hello@vimsy.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                      <input
                        type="tel"
                        value={reportSettings.report_contact_phone || ''}
                        onChange={e => setReportSettings(s => ({ ...s, report_contact_phone: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact Website</label>
                      <input
                        type="url"
                        value={reportSettings.report_contact_website || ''}
                        onChange={e => setReportSettings(s => ({ ...s, report_contact_website: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="https://vimsy.com"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                    <button
                      onClick={handleReportSave}
                      disabled={reportSaving}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {reportSaved ? <Check size={16} /> : <Save size={16} />}
                      {reportSaving ? 'Saving...' : reportSaved ? 'Saved!' : 'Save Settings'}
                    </button>
                    {reportSaved && (
                      <span className="text-sm text-green-600">Report settings saved successfully</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Security Database Tab */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-2.5">
                    <Shield size={20} className="text-gray-600" />
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">WordPress Vulnerability Database</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Local copy of the Open WordPress Vulnerability Database (OWVD) used for security analysis.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Status Cards */}
                  <div className="grid grid-cols-2 gap-5">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Last Updated</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {vulnDbStatus?.lastUpdated
                          ? new Date(vulnDbStatus.lastUpdated).toLocaleString()
                          : 'Never updated'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Total Vulnerabilities</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {vulnDbStatus?.stats?.total?.toLocaleString() ?? 0}
                      </p>
                    </div>
                  </div>

                  {/* Breakdown by Type */}
                  {vulnDbStatus?.stats?.byType && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Breakdown by Type</p>
                      <div className="grid grid-cols-3 gap-3">
                        {Object.entries(vulnDbStatus.stats.byType).map(([type, count]: [string, any]) => (
                          <div key={type} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3.5 py-2.5">
                            <span className="text-sm text-gray-600 capitalize">{type}</span>
                            <span className="text-sm font-semibold text-gray-800">{Number(count).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  {vulnDbMessage && (
                    <div className={`text-sm px-4 py-3 rounded-lg ${
                      vulnDbMessage.startsWith('Error') || vulnDbMessage.startsWith('Update failed')
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-green-50 text-green-700 border border-green-200'
                    }`}>
                      {vulnDbMessage}
                    </div>
                  )}

                  {/* Update Button */}
                  <div className="pt-2 border-t border-gray-100">
                    <button
                      onClick={handleVulnDbUpdate}
                      disabled={vulnDbUpdating}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {vulnDbUpdating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      {vulnDbUpdating ? 'Updating database...' : 'Update Now'}
                    </button>
                    <p className="text-xs text-gray-400 mt-2">
                      Downloads the latest vulnerability data from the OWVD and imports it into the local database.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
