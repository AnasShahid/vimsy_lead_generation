import { Router, Request, Response } from 'express';
import { getAllSettings, getSetting, setSetting, getAIModel, getAIPrompt, DEFAULT_AI_MODEL, DEFAULT_AI_PROMPT } from '../db/queries/settings';

export const settingsRoutes = Router();

// Available AI models for the dropdown
const AVAILABLE_MODELS = [
  { id: 'openai/gpt-4o', label: 'OpenAI GPT-4o', provider: 'OpenAI', tier: 'flagship' },
  { id: 'openai/gpt-4o-mini', label: 'OpenAI GPT-4o Mini', provider: 'OpenAI', tier: 'fast' },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'Google', tier: 'flagship' },
  { id: 'google/gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'Google', tier: 'fast' },
  { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4', provider: 'Anthropic', tier: 'flagship' },
  { id: 'anthropic/claude-3-5-haiku', label: 'Claude 3.5 Haiku', provider: 'Anthropic', tier: 'fast' },
];

// GET /api/settings - Get all settings with defaults
settingsRoutes.get('/', (_req: Request, res: Response) => {
  try {
    const settings = getAllSettings();
    return res.json({
      success: true,
      data: {
        ai_model: settings.ai_model || DEFAULT_AI_MODEL,
        ai_analysis_prompt: settings.ai_analysis_prompt || DEFAULT_AI_PROMPT,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/settings/ai-models - Get available AI models
settingsRoutes.get('/ai-models', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: AVAILABLE_MODELS,
  });
});

// PUT /api/settings - Update settings
settingsRoutes.put('/', (req: Request, res: Response) => {
  try {
    const { ai_model, ai_analysis_prompt } = req.body;

    if (ai_model !== undefined) {
      if (typeof ai_model !== 'string' || ai_model.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'ai_model must be a non-empty string' });
      }
      setSetting('ai_model', ai_model.trim());
    }

    if (ai_analysis_prompt !== undefined) {
      if (typeof ai_analysis_prompt !== 'string' || ai_analysis_prompt.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'ai_analysis_prompt must be a non-empty string' });
      }
      setSetting('ai_analysis_prompt', ai_analysis_prompt.trim());
    }

    return res.json({
      success: true,
      data: {
        ai_model: getAIModel(),
        ai_analysis_prompt: getAIPrompt(),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/settings/reset-prompt - Reset prompt to default
settingsRoutes.post('/reset-prompt', (_req: Request, res: Response) => {
  try {
    setSetting('ai_analysis_prompt', DEFAULT_AI_PROMPT);
    return res.json({
      success: true,
      data: { ai_analysis_prompt: DEFAULT_AI_PROMPT },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
