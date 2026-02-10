import { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { api } from '../lib/api';
import { RotateCcw, Save, Check, Shield, Download, Loader2 } from 'lucide-react';

interface AIModel {
  id: string;
  label: string;
  provider: string;
  tier: string;
}

export function SettingsPage() {
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

  useEffect(() => {
    async function load() {
      try {
        const [settingsRes, modelsRes, vulnRes] = await Promise.all([
          api.getSettings(),
          api.getAIModels(),
          api.getVulnDbStatus().catch(() => ({ data: null })),
        ]);
        setAiModel(settingsRes.data.ai_model);
        setAiPrompt(settingsRes.data.ai_analysis_prompt);
        setModels(modelsRes.data);
        if (vulnRes.data) setVulnDbStatus(vulnRes.data);
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

      <div className="p-6 max-w-3xl space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* AI Analysis Settings */}
        <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">AI Analysis — Discovery</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure the AI model and prompt used to analyze discovered sites.
              Powered by OpenRouter.
            </p>
          </div>

          <div className="p-5 space-y-5">
            {/* Model Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                AI Model
              </label>
              <select
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
              <p className="text-xs text-gray-400 mt-1">
                Select the model for AI site analysis. Flagship models are more accurate, fast models are cheaper.
              </p>
            </div>

            {/* Prompt Editor */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
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
                rows={16}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono leading-relaxed focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">
                This prompt is sent as the system message when analyzing sites. It defines how the AI evaluates and categorizes leads.
              </p>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saved ? <Check size={16} /> : <Save size={16} />}
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
              </button>
              {saved && (
                <span className="text-sm text-green-600">Settings saved successfully</span>
              )}
            </div>
          </div>
        </section>

        {/* Vulnerability Database */}
        <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-gray-600" />
              <div>
                <h3 className="text-sm font-semibold text-gray-800">WordPress Vulnerability Database</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Local copy of the Open WordPress Vulnerability Database (OWVD) used for security analysis.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Status */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Last Updated</p>
                <p className="font-medium text-gray-800">
                  {vulnDbStatus?.lastUpdated
                    ? new Date(vulnDbStatus.lastUpdated).toLocaleString()
                    : 'Never updated'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Vulnerabilities Tracked</p>
                <p className="font-medium text-gray-800">
                  {vulnDbStatus?.stats?.total ?? 0} total
                  {vulnDbStatus?.stats?.byType && (
                    <span className="text-xs text-gray-400 ml-1">
                      ({Object.entries(vulnDbStatus.stats.byType).map(([type, count]: [string, any]) => `${count} ${type}`).join(', ')})
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Message */}
            {vulnDbMessage && (
              <div className={`text-sm px-3 py-2 rounded-lg ${
                vulnDbMessage.startsWith('Error') || vulnDbMessage.startsWith('Update failed')
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {vulnDbMessage}
              </div>
            )}

            {/* Update Button */}
            <button
              onClick={handleVulnDbUpdate}
              disabled={vulnDbUpdating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {vulnDbUpdating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {vulnDbUpdating ? 'Updating...' : 'Update Now'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
