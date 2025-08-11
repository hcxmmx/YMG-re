/**
 * Gemini API 统一配置管理
 * 集中管理所有Gemini相关的配置选项，避免配置分散和不一致
 */

// 支持的Gemini模型
export const GEMINI_MODELS = {
  PRO: 'gemini-2.5-pro',
  FLASH: 'gemini-2.5-flash'
} as const;

// 模型选择选项（用于UI显示）
export const GEMINI_MODEL_OPTIONS = [
  { id: GEMINI_MODELS.PRO, name: "Gemini 2.5 Pro - 高级功能" },
  { id: GEMINI_MODELS.FLASH, name: "Gemini 2.5 Flash - 快速响应" },
] as const;

// 默认配置 (与store.ts中的设置保持一致)
export const GEMINI_DEFAULTS = {
  model: GEMINI_MODELS.PRO,
  temperature: 1,
  maxOutputTokens: 65535,
  topK: 40,
  topP: 0.95,
} as const;

// 安全设置配置
export const GEMINI_SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
] as const;

// 安全设置类型
export type SafetySetting = typeof GEMINI_SAFETY_SETTINGS[number];

// 支持的模型类型
export type GeminiModel = typeof GEMINI_MODELS[keyof typeof GEMINI_MODELS];

// 统一的Gemini配置接口
export interface GeminiConfig {
  model?: GeminiModel;
  temperature?: number;
  maxOutputTokens?: number;
  topK?: number;
  topP?: number;
  safetySettings?: SafetySetting[];
  apiKey: string;
  abortSignal?: AbortSignal;
}

// 统一的API调用参数接口 (替代ChatApiParams和GeminiParams)
export interface UnifiedApiParams {
  messages: any[];
  systemPrompt?: string;
  apiKey: string;
  stream: boolean;
  requestId?: string;
  model?: GeminiModel;
  temperature?: number;
  maxOutputTokens?: number;
  topK?: number;
  topP?: number;
  safetySettings?: SafetySetting[];
  abortSignal?: AbortSignal;
}

// 验证模型是否支持
export function isValidGeminiModel(model: string): model is GeminiModel {
  return Object.values(GEMINI_MODELS).includes(model as GeminiModel);
}

// 获取默认模型（带回退）
export function getDefaultModel(preferredModel?: string): GeminiModel {
  if (preferredModel && isValidGeminiModel(preferredModel)) {
    return preferredModel;
  }
  return GEMINI_DEFAULTS.model;
}

// 构建完整的Gemini配置
export function buildGeminiConfig(
  apiKey: string, 
  userConfig: Partial<GeminiConfig> = {}
): GeminiConfig {
  return {
    ...GEMINI_DEFAULTS,
    ...userConfig,
    apiKey,
    model: getDefaultModel(userConfig.model),
    safetySettings: userConfig.safetySettings || [...GEMINI_SAFETY_SETTINGS]
  };
}
