// API路由器 - 统一管理Gemini和OpenAI兼容端点
import { GeminiService } from './gemini';
import { OpenAIService, createOpenAIService } from './services/openai-service';
import { buildGeminiConfig, GeminiConfig } from './config/gemini-config';
import { buildOpenAIConfig, OpenAIConfig, OPENAI_API_TYPES } from './config/openai-config';
import { apiKeyStorage } from './storage';
import type { Message } from './types';

// API类型枚举
export const API_TYPES = {
  GEMINI: 'gemini',
  OPENAI: 'openai'
} as const;

export type ApiType = typeof API_TYPES[keyof typeof API_TYPES];

// API配置接口
export interface ApiConfiguration {
  type: ApiType;
  gemini?: GeminiConfig;
  openai?: OpenAIConfig;
}

// 统一的API响应接口
export interface ApiResponse {
  content: string;
  finishReason?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

// 调试信息接口
export interface UnifiedDebugInfo {
  apiType: ApiType;
  endpoint: string;
  model: string;
  messages: Message[];
  parameters: Record<string, any>;
  timestamp: string;
}

export class ApiRouter {
  private geminiService?: GeminiService;
  private openaiService?: OpenAIService;
  private currentConfig?: ApiConfiguration;

  constructor() {
    // 初始化时不创建服务，等待配置
  }

  // 设置API配置
  setConfiguration(config: ApiConfiguration) {
    this.currentConfig = config;
    
    if (config.type === API_TYPES.GEMINI && config.gemini) {
      this.geminiService = new GeminiService(config.gemini.apiKey);
    } else if (config.type === API_TYPES.OPENAI && config.openai) {
      this.openaiService = createOpenAIService(config.openai);
    }
  }

  // 发送消息
  async sendMessage(
    messages: Message[],
    onProgress?: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    if (!this.currentConfig) {
      throw new Error('API配置未设置');
    }

    switch (this.currentConfig.type) {
      case API_TYPES.GEMINI:
        return await this.sendGeminiMessage(messages, onProgress, signal);
      
      case API_TYPES.OPENAI:
        return await this.sendOpenAIMessage(messages, onProgress, signal);
      
      default:
        throw new Error(`不支持的API类型: ${this.currentConfig.type}`);
    }
  }

  // 发送Gemini消息
  private async sendGeminiMessage(
    messages: Message[],
    onProgress?: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    if (!this.geminiService || !this.currentConfig?.gemini) {
      throw new Error('Gemini服务未初始化');
    }

    // 提取系统提示词和用户消息
    const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
    const userMessages = messages.filter(m => m.role !== 'system');
    
    // 构建API参数
    const apiParams = {
      model: this.currentConfig.gemini.model,
      temperature: this.currentConfig.gemini.temperature,
      maxOutputTokens: this.currentConfig.gemini.maxOutputTokens,
      topK: this.currentConfig.gemini.topK,
      topP: this.currentConfig.gemini.topP,
      safetySettings: this.currentConfig.gemini.safetySettings,
      abortSignal: signal
    };

    if (onProgress) {
      // 流式响应
      let fullResponse = '';
      const stream = this.geminiService.generateResponseStream(userMessages, systemPrompt, apiParams);
      
      for await (const chunk of stream) {
        fullResponse += chunk;
        onProgress(chunk);
      }
      
      return fullResponse;
    } else {
      // 非流式响应
      return await this.geminiService.generateResponse(userMessages, systemPrompt, apiParams);
    }
  }

  // 发送OpenAI消息
  private async sendOpenAIMessage(
    messages: Message[],
    onProgress?: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    if (!this.openaiService) {
      throw new Error('OpenAI服务未初始化');
    }

    // 转换消息格式为OpenAI格式
    const openaiMessages = this.convertToOpenAIFormat(messages);
    
    console.log('🔄 发送OpenAI消息调试:', {
      isStreaming: !!onProgress,
      messageCount: openaiMessages.length,
      model: this.currentConfig?.openai?.model,
      baseURL: this.currentConfig?.openai?.baseURL,
      stream: this.currentConfig?.openai?.stream
    });
    
    const response = await this.openaiService.sendChatRequest(
      openaiMessages,
      onProgress,
      signal
    );

    if (typeof response === 'string') {
      return response;
    } else {
      throw new Error('OpenAI返回了流对象，但未提供进度回调');
    }
  }

  // 转换消息格式为Gemini格式
  private convertToGeminiFormat(messages: Message[]): any[] {
    const geminiMessages: any[] = [];
    
    for (const message of messages) {
      if (message.role === 'system') {
        // Gemini将系统消息作为用户消息处理
        geminiMessages.push({
          role: 'user',
          parts: [{ text: `[System] ${message.content}` }]
        });
      } else {
        geminiMessages.push({
          role: message.role === 'user' ? 'user' : 'model',
          parts: [{ text: message.content }]
        });
      }
    }
    
    return geminiMessages;
  }

  // 转换消息格式为OpenAI格式
  private convertToOpenAIFormat(messages: Message[]): Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> {
    return messages.map(message => ({
      role: message.role === 'assistant' ? 'assistant' : 
            message.role === 'system' ? 'system' : 'user',
      content: message.content
    }));
  }

  // 获取调试信息
  getDebugInfo(messages: Message[]): UnifiedDebugInfo {
    if (!this.currentConfig) {
      throw new Error('API配置未设置');
    }

    const timestamp = new Date().toISOString();

    switch (this.currentConfig.type) {
      case API_TYPES.GEMINI:
        return {
          apiType: API_TYPES.GEMINI,
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
          model: this.currentConfig.gemini?.model || 'gemini-2.5-pro',
          messages,
          parameters: {
            temperature: this.currentConfig.gemini?.temperature,
            maxOutputTokens: this.currentConfig.gemini?.maxOutputTokens,
            topK: this.currentConfig.gemini?.topK,
            topP: this.currentConfig.gemini?.topP
          },
          timestamp
        };
      
      case API_TYPES.OPENAI:
        return {
          apiType: API_TYPES.OPENAI,
          endpoint: this.currentConfig.openai?.baseURL || 'https://api.openai.com/v1',
          model: this.currentConfig.openai?.model || 'gpt-4o-mini',
          messages,
          parameters: {
            temperature: this.currentConfig.openai?.temperature,
            max_tokens: this.currentConfig.openai?.maxTokens,
            top_p: this.currentConfig.openai?.topP,
            frequency_penalty: this.currentConfig.openai?.frequencyPenalty,
            presence_penalty: this.currentConfig.openai?.presencePenalty
          },
          timestamp
        };
      
      default:
        throw new Error(`不支持的API类型: ${this.currentConfig.type}`);
    }
  }

  // 测试当前配置的连接
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.currentConfig) {
      return { success: false, error: 'API配置未设置' };
    }

    try {
      switch (this.currentConfig.type) {
        case API_TYPES.GEMINI:
          if (!this.geminiService) {
            return { success: false, error: 'Gemini服务未初始化' };
          }
          // 发送简单的测试消息
          await this.sendMessage([{ id: 'test', role: 'user', content: '测试', timestamp: new Date() }]);
          return { success: true };
        
        case API_TYPES.OPENAI:
          if (!this.openaiService) {
            return { success: false, error: 'OpenAI服务未初始化' };
          }
          return await this.openaiService.testConnection();
        
        default:
          return { success: false, error: `不支持的API类型: ${this.currentConfig.type}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  // 获取当前配置
  getCurrentConfig(): ApiConfiguration | undefined {
    return this.currentConfig;
  }

  // 获取当前API类型
  getCurrentApiType(): ApiType | undefined {
    return this.currentConfig?.type;
  }
}

// 创建默认的API路由器实例
export function createApiRouter(): ApiRouter {
  return new ApiRouter();
}

// 从设置构建API配置
export function buildApiConfigFromSettings(settings: any): ApiConfiguration {
  const apiType = settings.apiType || API_TYPES.GEMINI;
  
  if (apiType === API_TYPES.GEMINI) {
    const geminiConfig = buildGeminiConfig(settings.apiKey || '', {
      model: settings.model,
      temperature: settings.temperature,
      maxOutputTokens: settings.maxTokens,
      topK: settings.topK,
      topP: settings.topP
    });
    
    return {
      type: API_TYPES.GEMINI,
      gemini: geminiConfig
    };
  } else {
    const openaiConfig = buildOpenAIConfig({
      apiType: settings.openaiApiType || OPENAI_API_TYPES.OPENAI,
      baseURL: settings.openaiBaseURL,
      apiKey: settings.openaiApiKey,
      model: settings.openaiModel,
      maxTokens: settings.openaiMaxTokens,
      temperature: settings.openaiTemperature,
      topP: settings.openaiTopP,
      frequencyPenalty: settings.openaiFrequencyPenalty,
      presencePenalty: settings.openaiPresencePenalty,
      stream: settings.openaiStream,
      customHeaders: settings.openaiCustomHeaders,
      customParams: settings.openaiCustomParams
    });
    
    return {
      type: API_TYPES.OPENAI,
      openai: openaiConfig
    };
  }
}
