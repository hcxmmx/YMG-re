// API连接测试服务
import { OpenAIConfig, OPENAI_API_TYPES, PREDEFINED_ENDPOINTS } from '../config/openai-config';
import { createOpenAIService } from './openai-service';
import { GeminiService } from '../gemini';
import { buildGeminiConfig } from '../config/gemini-config';
import type { Message } from '../types';

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  responseTime?: number;
  models?: string[];
  apiInfo?: {
    endpoint: string;
    apiType: string;
    model: string;
  };
}

export class ConnectionTester {
  /**
   * 测试Gemini API连接
   */
  static async testGeminiConnection(apiKey: string): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      if (!apiKey || !apiKey.trim()) {
        return {
          success: false,
          error: 'API密钥不能为空'
        };
      }

      const geminiService = new GeminiService(apiKey);
      
      // 发送简单的测试消息
      const testMessages = [{
        id: 'test',
        role: 'user' as const,
        content: '测试连接，请回复"连接成功"',
        timestamp: new Date()
      }];

      const testParams = {
        model: 'gemini-2.5-flash' as const,
        temperature: 1,
        maxOutputTokens: 10, // 限制输出以加快测试
        topK: 40,
        topP: 0.95
      };

      const response = await geminiService.generateResponse(testMessages, '', testParams);
      const responseTime = Date.now() - startTime;

      return {
        success: true,
        responseTime,
        models: ['gemini-2.5-pro', 'gemini-2.5-flash'], // Gemini支持的模型
        apiInfo: {
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
          apiType: 'Gemini',
          model: testParams.model
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      let errorMessage = '连接失败';

      if (error instanceof Error) {
        if (error.message.includes('API_KEY_INVALID')) {
          errorMessage = 'API密钥无效';
        } else if (error.message.includes('PERMISSION_DENIED')) {
          errorMessage = 'API密钥权限不足';
        } else if (error.message.includes('QUOTA_EXCEEDED')) {
          errorMessage = 'API配额已用完';
        } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
          errorMessage = '网络连接失败';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
        responseTime
      };
    }
  }

  /**
   * 测试OpenAI兼容端点连接
   */
  static async testOpenAIConnection(config: OpenAIConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      if (!config.baseURL || !config.baseURL.trim()) {
        return {
          success: false,
          error: 'Base URL不能为空'
        };
      }

      const endpoint = PREDEFINED_ENDPOINTS[config.apiType];
      if (endpoint.requiresApiKey && (!config.apiKey || !config.apiKey.trim())) {
        return {
          success: false,
          error: `${endpoint.name}需要API密钥`
        };
      }

      // 尝试获取模型列表，这本身就是一个有效的连接测试
      let models: string[] = [];
      try {
        models = await this.fetchModelList(config);
        console.log('✅ 连接测试成功，获取到的模型列表:', models);
      } catch (modelError) {
        console.warn('❌ 连接测试失败:', modelError);
        return {
          success: false,
          error: `无法连接到端点: ${modelError instanceof Error ? modelError.message : '未知错误'}`,
          responseTime: Date.now() - startTime
        };
      }

      if (models.length === 0) {
        return {
          success: false,
          error: '连接成功，但端点未返回任何可用模型',
          responseTime: Date.now() - startTime
        };
      }

      // 获取模型列表成功就意味着连接测试成功
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        responseTime,
        models,
        apiInfo: {
          endpoint: config.baseURL,
          apiType: endpoint.name,
          model: models[0] // 使用第一个可用模型
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      let errorMessage = '连接失败';

      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'API密钥无效或权限不足';
        } else if (error.message.includes('429') || error.message.includes('quota')) {
          errorMessage = 'API配额已用完或请求过于频繁';
        } else if (error.message.includes('404') || error.message.includes('Not Found')) {
          errorMessage = '端点地址无效或模型不存在';
        } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
          errorMessage = '网络连接失败，请检查端点地址';
        } else if (error.message.includes('无可用渠道') || error.message.includes('no available channel')) {
          errorMessage = '当前模型在此端点不可用，请尝试其他模型或联系服务提供方';
        } else if (error.message.includes('分组') || error.message.includes('group')) {
          errorMessage = '账户分组权限不足，请联系服务提供方调整权限';
        } else if (error.message.includes('Unexpected token') || error.message.includes('not valid JSON')) {
          errorMessage = '端点返回格式异常，可能是流式响应解析问题';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
        responseTime
      };
    }
  }

  /**
   * 获取OpenAI兼容端点的模型列表
   */
  private static async fetchModelList(config: OpenAIConfig): Promise<string[]> {
    const baseURL = config.baseURL.replace(/\/$/, '');
    const url = `${baseURL}/models`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    // 添加特定API类型的头部
    switch (config.apiType) {
      case OPENAI_API_TYPES.OPENROUTER:
        headers['HTTP-Referer'] = window.location.origin;
        headers['X-Title'] = 'MMG2 Chat';
        break;
    }

    console.log(`🔍 获取模型列表: ${url}`);

    // 🔥 检测是否为HTTP端点，如果是则使用代理
    const urlObj = new URL(url);
    const isHttpEndpoint = urlObj.protocol === 'http:';
    
    let response: Response;
    
    if (isHttpEndpoint && typeof window !== 'undefined') {
      // 对于HTTP端点，使用代理避免混合内容错误
      console.log(`⚠️ 检测到HTTP端点，使用代理请求: ${url}`);
      
      const proxyResponse = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          method: 'GET',
          headers: { ...headers, ...config.customHeaders }
        }),
        signal: AbortSignal.timeout(30000) // 30秒超时
      });

      if (!proxyResponse.ok) {
        throw new Error(`代理请求失败: ${proxyResponse.status} ${proxyResponse.statusText}`);
      }

      const proxyData = await proxyResponse.json();
      
      if (!proxyData.success) {
        throw new Error(`获取模型列表失败: ${proxyData.error || '代理请求失败'}`);
      }

      // 模拟Response对象的行为
      response = {
        ok: proxyData.success,
        status: proxyData.status,
        statusText: proxyData.statusText,
        json: async () => proxyData.data,
        text: async () => typeof proxyData.data === 'string' ? proxyData.data : JSON.stringify(proxyData.data)
      } as Response;
    } else {
      // 对于HTTPS端点，直接请求
      response = await fetch(url, {
        method: 'GET',
        headers: { ...headers, ...config.customHeaders },
        signal: AbortSignal.timeout(15000) // 15秒超时，给公益站更多时间
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // 如果不是JSON，使用原始错误文本
        if (errorText) {
          errorMessage = errorText;
        }
      }
      
      throw new Error(`获取模型列表失败: ${errorMessage}`);
    }

    const data = await response.json();
    console.log('📋 服务器返回的原始数据:', data);
    
    if (data.data && Array.isArray(data.data)) {
      // 标准OpenAI格式: { data: [{ id: "model1" }, { id: "model2" }] }
      const models = data.data.map((model: any) => model.id).filter(Boolean);
      console.log('✅ 解析到OpenAI格式模型:', models);
      return models;
    } else if (Array.isArray(data)) {
      // 简单数组格式: ["model1", "model2"]
      const models = data.filter(Boolean);
      console.log('✅ 解析到数组格式模型:', models);
      return models;
    } else if (data.models && Array.isArray(data.models)) {
      // 自定义格式: { models: [...] }
      const models = data.models.filter(Boolean);
      console.log('✅ 解析到自定义格式模型:', models);
      return models;
    } else {
      console.warn('⚠️ 未知的响应格式，使用预定义模型');
      // 如果无法解析，返回预定义的模型
      const endpoint = PREDEFINED_ENDPOINTS[config.apiType];
      return [...(endpoint.models || [])];
    }
  }

  /**
   * 通用连接测试方法
   */
  static async testConnection(apiType: 'gemini' | 'openai', config: any): Promise<ConnectionTestResult> {
    if (apiType === 'gemini') {
      return await this.testGeminiConnection(config.apiKey);
    } else {
      return await this.testOpenAIConnection(config);
    }
  }
}
