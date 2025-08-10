// OpenAI兼容服务
import { OpenAIConfig, OpenAIApiParams, buildOpenAIApiParams, OPENAI_API_TYPES } from '../config/openai-config';

export interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIService {
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = config;
  }

  // 更新配置
  updateConfig(newConfig: OpenAIConfig) {
    this.config = newConfig;
  }

  // 构建请求头
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // 🔥 添加反Cloudflare检测头部
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-CH-UA': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site'
    };

    // 添加API密钥
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    // 添加特定API类型的头部
    switch (this.config.apiType) {
      case OPENAI_API_TYPES.OPENROUTER:
        headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000';
        headers['X-Title'] = 'MMG2 Chat';
        break;
      
      case OPENAI_API_TYPES.GROQ:
        // Groq 使用标准Bearer token
        break;
      
      case OPENAI_API_TYPES.DEEPSEEK:
        // DeepSeek 使用标准Bearer token
        break;
      
      case OPENAI_API_TYPES.CUSTOM:
        // 自定义端点添加Referer以避免CORS问题
        if (typeof window !== 'undefined') {
          headers['Referer'] = window.location.origin;
          headers['Origin'] = window.location.origin;
        }
        break;
    }

    // 添加自定义头部（可能会覆盖上面的默认头部）
    Object.assign(headers, this.config.customHeaders);

    return headers;
  }

  // 构建请求URL
  private buildUrl(): string {
    const baseURL = this.config.baseURL.replace(/\/$/, ''); // 移除尾部斜杠
    return `${baseURL}/chat/completions`;
  }

  // 发送聊天请求
  async sendChatRequest(
    messages: OpenAIApiParams['messages'],
    onProgress?: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<string | ReadableStream> {
    const params = buildOpenAIApiParams(messages, this.config);
    const headers = this.buildHeaders();
    const url = this.buildUrl();

    console.log('发送OpenAI兼容请求:', {
      url,
      headers: this.sanitizeHeaders(headers),
      params: { ...params, messages: `${messages.length} messages` }
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
        signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `请求失败: ${response.status} ${response.statusText}`;
        
        // 🔥 检测Cloudflare拦截
        if (errorText.includes('<title>403 Forbidden</title>') || 
            errorText.includes('__CF$cv$params') || 
            errorText.includes('challenge-platform')) {
          errorMessage = `🛡️ Cloudflare防护拦截 (${response.status}): 自定义端点被识别为机器人请求。请尝试：\n` +
                        `1. 检查端点是否支持API调用\n` +
                        `2. 联系端点提供方添加白名单\n` +
                        `3. 尝试其他端点`;
        } else if (errorText.includes('<html>') && errorText.includes('<head>')) {
          // 其他HTML错误页面
          errorMessage = `服务器返回HTML页面而非API响应 (${response.status}): 端点可能不支持API调用或配置错误`;
        } else {
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error?.message) {
              errorMessage = errorJson.error.message;
            }
          } catch {
            // 如果不是JSON，使用原始错误文本（截取前200字符）
            if (errorText) {
              errorMessage = errorText.length > 200 ? 
                `${errorText.substring(0, 200)}...` : 
                errorText;
            }
          }
        }
        
        throw new Error(errorMessage);
      }

      if (params.stream && onProgress) {
        return this.handleStreamResponse(response, onProgress);
      } else {
        return await this.handleNonStreamResponse(response);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('请求已取消');
      }
      console.error('OpenAI API 请求错误:', error);
      throw error;
    }
  }

  // 处理流式响应
  private async handleStreamResponse(
    response: Response,
    onProgress: (chunk: string) => void
  ): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              return fullResponse;
            }

            try {
              const parsed: OpenAIStreamChunk = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                onProgress(content);
              }
            } catch (error) {
              console.warn('解析流数据失败:', data, error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  }

  // 处理非流式响应
  private async handleNonStreamResponse(response: Response): Promise<string> {
    const data: OpenAIResponse = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  // 清理敏感信息用于日志输出
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized = { ...headers };
    if (sanitized.Authorization) {
      sanitized.Authorization = 'Bearer [REDACTED]';
    }
    return sanitized;
  }

  // 获取配置信息
  getConfig(): OpenAIConfig {
    return { ...this.config };
  }

  // 测试连接
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const testMessages = [{ role: 'user' as const, content: '测试' }];
      await this.sendChatRequest(testMessages, undefined);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }
}

// 创建OpenAI服务实例的工厂函数
export function createOpenAIService(config: OpenAIConfig): OpenAIService {
  return new OpenAIService(config);
}
