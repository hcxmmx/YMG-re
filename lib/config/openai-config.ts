// OpenAI兼容端点配置
export const OPENAI_API_TYPES = {
  OPENAI: 'openai',
  CUSTOM: 'custom',
  OPENROUTER: 'openrouter',
  GROQ: 'groq',
  DEEPSEEK: 'deepseek',
  AIMLAPI: 'aimlapi',
  OTHER: 'other'
} as const;

export type OpenAIApiType = typeof OPENAI_API_TYPES[keyof typeof OPENAI_API_TYPES];

// OpenAI兼容的模型配置
export const OPENAI_MODEL_OPTIONS = {
  // OpenAI 官方模型
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'gpt-4-turbo': 'GPT-4 Turbo',
  'gpt-4': 'GPT-4',
  'gpt-3.5-turbo': 'GPT-3.5 Turbo',
  
  // 其他常见模型 (用于自定义端点)
  'llama-3.1-70b-instruct': 'Llama 3.1 70B',
  'llama-3.1-8b-instruct': 'Llama 3.1 8B',
  'mixtral-8x7b-instruct': 'Mixtral 8x7B',
  'claude-3-sonnet': 'Claude 3 Sonnet',
  'deepseek-chat': 'DeepSeek Chat',
  'custom': '自定义模型'
} as const;

// OpenAI兼容的默认配置
export const OPENAI_DEFAULTS = {
  apiType: OPENAI_API_TYPES.OPENAI,
  model: 'gpt-4o-mini',
  baseURL: 'https://api.openai.com/v1',
  maxTokens: 4096,
  temperature: 1.0,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
  stream: true
} as const;

// 预定义的API端点配置
export const PREDEFINED_ENDPOINTS = {
  [OPENAI_API_TYPES.OPENAI]: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    requiresApiKey: true,
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']
  },
  [OPENAI_API_TYPES.OPENROUTER]: {
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    requiresApiKey: true,
    models: ['openai/gpt-4o', 'openai/gpt-4o-mini', 'anthropic/claude-3-sonnet']
  },
  [OPENAI_API_TYPES.GROQ]: {
    name: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    requiresApiKey: true,
    models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']
  },
  [OPENAI_API_TYPES.DEEPSEEK]: {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/beta',
    requiresApiKey: true,
    models: ['deepseek-chat', 'deepseek-coder']
  },
  [OPENAI_API_TYPES.AIMLAPI]: {
    name: 'AI/ML API',
    baseURL: 'https://api.aimlapi.com/v1',
    requiresApiKey: true,
    models: ['gpt-4o-mini', 'gpt-4o', 'claude-3-sonnet']
  },
  [OPENAI_API_TYPES.OTHER]: {
    name: '其他',
    baseURL: '',
    requiresApiKey: false,
    models: [] // 其他端点也应该通过连接测试获取模型列表
  },
  [OPENAI_API_TYPES.CUSTOM]: {
    name: '自定义端点',
    baseURL: '',
    requiresApiKey: false,
    models: []
  }
} as const;

// OpenAI兼容配置接口
export interface OpenAIConfig {
  apiType: OpenAIApiType;
  baseURL: string;
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stream: boolean;
  customHeaders?: Record<string, string>;
  customParams?: Record<string, any>;
}

// 统一的API参数接口，扩展现有的UnifiedApiParams
export interface OpenAIApiParams {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  stop?: string[];
  
  // 自定义参数支持
  [key: string]: any;
}

// 获取默认API类型
export function getDefaultApiType(): OpenAIApiType {
  return OPENAI_DEFAULTS.apiType;
}

// 获取默认模型
export function getDefaultOpenAIModel(apiType: OpenAIApiType = OPENAI_DEFAULTS.apiType): string {
  const endpoint = PREDEFINED_ENDPOINTS[apiType];
  return endpoint.models[0] || OPENAI_DEFAULTS.model;
}

// 构建OpenAI配置
export function buildOpenAIConfig(userConfig: Partial<OpenAIConfig> = {}): OpenAIConfig {
  const defaults = OPENAI_DEFAULTS;
  const apiType = userConfig.apiType || defaults.apiType;
  const endpoint = PREDEFINED_ENDPOINTS[apiType];
  
  // 🔥 对于自定义端点，必须指定模型，不使用默认值
  let model = userConfig.model;
  if (!model) {
    if (apiType === OPENAI_API_TYPES.CUSTOM) {
      // 自定义端点必须指定模型，如果没有指定则抛出错误
      console.warn('⚠️ 自定义端点必须指定模型名称');
      model = 'gpt-3.5-turbo'; // 临时fallback，避免crash
    } else {
      model = getDefaultOpenAIModel(apiType);
    }
  }
  
  return {
    apiType,
    baseURL: userConfig.baseURL || endpoint.baseURL || defaults.baseURL,
    apiKey: userConfig.apiKey,
    model: model,
    maxTokens: userConfig.maxTokens ?? defaults.maxTokens,
    temperature: userConfig.temperature ?? defaults.temperature,
    topP: userConfig.topP ?? defaults.topP,
    frequencyPenalty: userConfig.frequencyPenalty ?? defaults.frequencyPenalty,
    presencePenalty: userConfig.presencePenalty ?? defaults.presencePenalty,
    stream: userConfig.stream ?? defaults.stream,
    customHeaders: userConfig.customHeaders || {},
    customParams: userConfig.customParams || {}
  };
}

// 构建OpenAI API参数
export function buildOpenAIApiParams(
  messages: OpenAIApiParams['messages'],
  config: OpenAIConfig
): OpenAIApiParams {
  const params: OpenAIApiParams = {
    model: config.model,
    messages,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    top_p: config.topP,
    frequency_penalty: config.frequencyPenalty,
    presence_penalty: config.presencePenalty,
    stream: config.stream,
    ...config.customParams
  };

  console.log('🔧 构建OpenAI API参数:', {
    model: params.model,
    messageCount: params.messages?.length,
    stream: params.stream,
    max_tokens: params.max_tokens,
    temperature: params.temperature
  });

  // 移除undefined值
  Object.keys(params).forEach(key => {
    if (params[key] === undefined) {
      delete params[key];
    }
  });

  return params;
}

// 验证配置
export function validateOpenAIConfig(config: OpenAIConfig): string[] {
  const errors: string[] = [];
  
  if (!config.baseURL || !config.baseURL.trim()) {
    errors.push('Base URL 不能为空');
  }
  
  if (!config.model || !config.model.trim()) {
    errors.push('模型不能为空');
  }
  
  const endpoint = PREDEFINED_ENDPOINTS[config.apiType];
  if (endpoint.requiresApiKey && (!config.apiKey || !config.apiKey.trim())) {
    errors.push(`${endpoint.name} 需要API密钥`);
  }
  
  if (config.maxTokens < 1 || config.maxTokens > 32768) {
    errors.push('最大令牌数必须在 1-32768 之间');
  }
  
  if (config.temperature < 0 || config.temperature > 2) {
    errors.push('温度值必须在 0-2 之间');
  }
  
  if (config.topP < 0 || config.topP > 1) {
    errors.push('Top P 值必须在 0-1 之间');
  }
  
  return errors;
}
