import { Message } from './types';
import { ChatApiParams, callChatApi, handleStreamResponse, handleNonStreamResponse } from './chatApi';
import { apiKeyStorage } from './storage';
import { replaceMacros } from './macroUtils';
import { trimMessageHistory } from './tokenUtils';
import { generateId } from './utils';
import type { FileData } from '@/components/chat/chat-input';

// 错误详情接口
export interface ErrorDetails {
  code: number;        // HTTP状态码或API错误代码
  message: string;     // 错误消息
  details?: any;       // 错误详细信息
  timestamp: string;   // 错误发生时间
}

// 发送消息配置接口
export interface SendMessageConfig {
  content?: string;                    // 用户输入的内容（直接回复时可选）
  files?: FileData[];                  // 附件
  stream?: boolean;                    // 是否使用流式响应，默认从设置读取
  directReply?: boolean;               // 是否为直接回复模式（使用现有消息历史）
  regenerate?: {                       // 重新生成模式配置
    messageId: string;                 // 要重新生成的消息ID
    beforeMessageIndex: number;        // 消息在列表中的位置
    mode: 'replace' | 'variant';       // 'replace': 完全重新生成, 'variant': 生成变体
  };
  onProgress?: (chunk: string) => void; // 流式响应进度回调
  onComplete?: (fullResponse: string) => void; // 完成回调
  onError?: (errorDetails: ErrorDetails, errorMessage?: string) => void;   // 错误回调
  onStart?: () => void;                // 开始回调
}

// 发送消息上下文接口
export interface SendMessageContext {
  messages: Message[];
  settings: any;
  currentCharacter: any;
  currentPlayer: any;
  toast: any;
  applyRegexToMessage: (content: string, playerName: string, characterName: string, priority: number, type: number, characterId?: string) => Promise<string>;
  systemPrompt: string;
}

// 发送消息管理器类
export class SendMessageManager {
  private context: SendMessageContext;
  private activeRequestId: string | null = null;

  constructor(context: SendMessageContext) {
    this.context = context;
  }

  // 更新上下文
  updateContext(context: Partial<SendMessageContext>) {
    this.context = { ...this.context, ...context };
  }

  // 发送新消息或直接回复
  async sendMessage(config: SendMessageConfig): Promise<string | null> {
    const logPrefix = config.regenerate ? 
                       `[SendMessageManager-${config.regenerate.mode === 'variant' ? 'GenerateVariant' : 'Regenerate'}]` : 
                       config.directReply ? '[SendMessageManager-DirectReply]' : 
                       '[SendMessageManager]';
    console.log(`${logPrefix} 开始处理请求`);
    
    try {
      // 生成请求ID
      this.activeRequestId = this.generateRequestId();
      
      // 1. 检查API密钥
      const apiKey = await this.checkApiKey();
          if (!apiKey) {
      const errorMessage = "未找到有效的API密钥。请先在设置中配置API密钥或在扩展功能的API密钥管理中添加并启用API密钥。";
      const errorDetails: ErrorDetails = {
        code: 401,
        message: errorMessage,
        timestamp: new Date().toISOString()
      };
      
      config.onError?.(errorDetails, errorMessage);
      this.context.toast({
        title: config.directReply ? "请求回复失败" : "API密钥未配置",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }

      // 2. 构建消息历史
      let messageHistory: Message[];
      
      if (config.regenerate) {
        // 重新生成模式：使用消息历史到指定消息之前的部分
        messageHistory = this.context.messages.slice(0, config.regenerate.beforeMessageIndex);
        console.log(`${logPrefix} 重新生成模式，使用前${messageHistory.length}条消息`);
      } else if (config.directReply) {
        // 直接回复模式：使用现有消息历史，不添加新消息
        messageHistory = this.context.messages;
        console.log(`${logPrefix} 直接回复模式，使用现有${messageHistory.length}条消息`);
      } else {
        // 新消息模式：处理用户输入并添加新消息
        if (!config.content?.trim() && !config.files?.length) {
          const errorMessage = "消息内容不能为空";
          const errorDetails: ErrorDetails = {
            code: 400,
            message: errorMessage,
            timestamp: new Date().toISOString()
          };
          config.onError?.(errorDetails, errorMessage);
          return null;
        }
        
        const processedContent = await this.processUserInput(config.content!);
        const userMessage: Message = {
          id: generateId(),
          role: "user",
          content: processedContent,
          files: config.files,
          timestamp: new Date(),
        };
        
        messageHistory = [...this.context.messages, userMessage];
        console.log(`${logPrefix} 新消息模式，添加用户消息后共${messageHistory.length}条消息`);
      }

      // 3. 裁剪消息历史
      const trimmedMessages = await this.trimMessageHistory(messageHistory, apiKey);
      console.log(`${logPrefix} 消息裁剪: 从${messageHistory.length}条消息裁剪到${trimmedMessages.length}条`);

      // 4. 处理系统提示词
      const systemPrompt = await this.processSystemPrompt();

      // 5. 准备API参数
      const apiParams: ChatApiParams = {
        messages: trimmedMessages,
        systemPrompt,
        apiKey,
        stream: config.stream ?? this.context.settings.enableStreaming,
        requestId: this.activeRequestId,
        temperature: this.context.settings.temperature || 0.7,
        maxOutputTokens: this.context.settings.maxTokens || 1000,
        topK: this.context.settings.topK || 40,
        topP: this.context.settings.topP || 0.9,
        model: this.context.settings.model || 'gemini-1.5-flash',
        safetySettings: [
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: this.context.settings.safetySettings?.hateSpeech || "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HARASSMENT", threshold: this.context.settings.safetySettings?.harassment || "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: this.context.settings.safetySettings?.sexuallyExplicit || "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: this.context.settings.safetySettings?.dangerousContent || "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      };

      // 6. 调用API
      config.onStart?.();
      const response = await this.callApi(apiParams);

      // 7. 处理响应
      if (apiParams.stream) {
        return await this.handleStreamResponse(response, config);
      } else {
        return await this.handleNonStreamResponse(response, config);
      }

    } catch (error: any) {
      console.error(`${logPrefix} 请求失败:`, error);
      
      // 创建详细错误信息
      const errorDetails = await this.extractErrorDetails(error);
      const simpleMessage = config.regenerate ? 
        (config.regenerate.mode === 'variant' ? "生成变体时出错" : "重新生成消息时出错") :
        config.directReply ? "请求回复时出错" : 
        "发送消息时出错";
      
      config.onError?.(errorDetails, simpleMessage);
      return null;
    } finally {
      this.activeRequestId = null;
    }
  }

  // 取消当前请求
  async cancelRequest(): Promise<boolean> {
    if (!this.activeRequestId) {
      console.log('[SendMessageManager] 没有活动的请求可以取消');
      return false;
    }

    try {
      const response = await fetch(`/api/chat?requestId=${this.activeRequestId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      console.log('[SendMessageManager] 请求取消结果:', result);
      
      this.activeRequestId = null;
      return result.success || false;
    } catch (error) {
      console.error('[SendMessageManager] 取消请求失败:', error);
      this.activeRequestId = null;
      return false;
    }
  }

  // 检查是否有活动请求
  hasActiveRequest(): boolean {
    return this.activeRequestId !== null;
  }

  // ========== 私有方法 ==========

  // 生成请求ID
  private generateRequestId(): string {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
  }

  // 检查API密钥
  private async checkApiKey(): Promise<string | null> {
    // 优先使用轮询系统中的API密钥
    try {
      const activeKey = await apiKeyStorage.getActiveApiKey();
      if (activeKey) {
        console.log('[SendMessageManager] 使用轮询系统API密钥:', activeKey.name);
        return activeKey.key;
      }
    } catch (error) {
      console.warn('[SendMessageManager] 无法获取轮询系统API密钥，使用设置中的密钥');
    }

    // 回退到设置中的API密钥
    if (this.context.settings.apiKey) {
      return this.context.settings.apiKey;
    }

    return null;
  }

  // 处理用户输入
  private async processUserInput(content: string): Promise<string> {
    const playerName = this.context.currentPlayer?.name || "玩家";
    const characterName = this.context.currentCharacter?.name || "AI";

    // 应用宏替换
    let processedContent = replaceMacros(content, playerName, characterName);
    
    // 应用正则表达式处理用户输入
    try {
      processedContent = await this.context.applyRegexToMessage(
        processedContent, 
        playerName, 
        characterName, 
        0, 
        1, // 类型1=用户输入
        this.context.currentCharacter?.id
      );
    } catch (error) {
      console.error('[SendMessageManager] 应用正则表达式处理用户输入时出错:', error);
    }

    return processedContent;
  }

  // 裁剪消息历史
  private async trimMessageHistory(messages: Message[], apiKey: string): Promise<Message[]> {
    return await trimMessageHistory(messages, this.context.settings, apiKey);
  }

  // 处理系统提示词
  private async processSystemPrompt(): Promise<string> {
    const playerName = this.context.currentPlayer?.name || "玩家";
    const characterName = this.context.currentCharacter?.name || "AI";

    // 应用宏替换到系统提示词
    return replaceMacros(this.context.systemPrompt, playerName, characterName);
  }

  // 调用API
  private async callApi(params: ChatApiParams): Promise<Response> {
    return await callChatApi(params);
  }

  // 处理流式响应
  private async handleStreamResponse(response: Response, config: SendMessageConfig): Promise<string> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText || "API调用失败" }));
      const error = new Error(errorData.error || "API调用失败");
      (error as any).response = response;
      throw error;
    }

    let fullResponse = "";
    const decoder = new TextDecoder();
    const reader = response.body?.getReader();

    if (!reader) {
      throw new Error("无法读取响应流");
    }

    try {
      let done = false;
      let hasReceivedContent = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                done = true;
                break;
              }
              
              try {
                const parsed = JSON.parse(data);
                
                // 检查是否是错误响应
                if (parsed.error) {
                  // 流式响应中的错误处理
                  const error = new Error("API流式响应错误");
                  (error as any).apiError = parsed.error;
                  (error as any).streamError = true;
                  throw error;
                }
                
                if (parsed.text) {
                  hasReceivedContent = true;
                  // 应用正则表达式处理AI输出片段
                  let processedChunk = parsed.text;
                  try {
                    const playerName = this.context.currentPlayer?.name || "玩家";
                    const characterName = this.context.currentCharacter?.name || "AI";
                    processedChunk = await this.context.applyRegexToMessage(
                      parsed.text, 
                      playerName, 
                      characterName, 
                      0, 
                      2, // 类型2=AI输出
                      this.context.currentCharacter?.id
                    );
                  } catch (error) {
                    console.error('[SendMessageManager] 应用正则表达式处理AI输出时出错:', error);
                  }
                  
                  fullResponse += processedChunk;
                  config.onProgress?.(processedChunk);
                }
              } catch (e) {
                if ((e as any).streamError) {
                  throw e; // 重新抛出流式错误
                }
                console.warn('解析SSE数据失败:', e);
              }
            }
          }
        }
      }
      
      // 如果没有收到任何内容，认为是错误
      if (!hasReceivedContent && !fullResponse) {
        throw new Error("API未返回任何内容，可能是由于安全过滤或API限制");
      }
    } catch (error: any) {
      if (error.streamError) {
        throw error; // 保持原始流式错误
      }
      throw new Error(`流式响应处理失败: ${error.message}`);
    }

    // 应用正则表达式处理完整响应
    let processedFullResponse = fullResponse;
    try {
      const playerName = this.context.currentPlayer?.name || "玩家";
      const characterName = this.context.currentCharacter?.name || "AI";
      processedFullResponse = await this.context.applyRegexToMessage(
        fullResponse, 
        playerName, 
        characterName, 
        0, 
        2, // 类型2=AI输出
        this.context.currentCharacter?.id
      );
    } catch (error) {
      console.error('[SendMessageManager] 应用正则表达式处理完整AI输出时出错:', error);
    }

    config.onComplete?.(processedFullResponse);
    return processedFullResponse;
  }

  // 处理非流式响应
  private async handleNonStreamResponse(response: Response, config: SendMessageConfig): Promise<string> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText || "API调用失败" }));
      const error = new Error(errorData.error || "API调用失败");
      (error as any).response = response;
      throw error;
    }

    const fullResponse = await handleNonStreamResponse(response);
    
    // 应用正则表达式处理AI输出
    let processedResponse = fullResponse;
    try {
      const playerName = this.context.currentPlayer?.name || "玩家";
      const characterName = this.context.currentCharacter?.name || "AI";
      processedResponse = await this.context.applyRegexToMessage(
        fullResponse, 
        playerName, 
        characterName, 
        0, 
        2, // 类型2=AI输出
        this.context.currentCharacter?.id
      );
    } catch (error) {
      console.error('[SendMessageManager] 应用正则表达式处理AI输出时出错:', error);
    }

    config.onComplete?.(processedResponse);
    return processedResponse;
  }

  // 提取错误详情
  private async extractErrorDetails(error: any): Promise<ErrorDetails> {
    let errorDetails: ErrorDetails = {
      code: 500,
      message: "未知错误",
      timestamp: new Date().toISOString()
    };
    
    try {
      // 处理流式响应中的API错误
      if (error.apiError) {
        const apiErr = error.apiError;
        errorDetails.code = apiErr.code || 500;
        errorDetails.message = apiErr.message || "API流式响应错误";
        if (apiErr.details || apiErr.status) {
          errorDetails.details = apiErr;
        }
      }
      // 处理API响应错误
      else if (error.response) {
        const response = error.response;
        errorDetails.code = response.status;
        
        try {
          // 尝试解析响应JSON
          const errorData = await response.json();
          errorDetails.message = errorData.error || errorData.message || "API请求失败";
          
          // 提取更多细节
          if (errorData.details) {
            errorDetails.details = errorData.details;
          }
          
        } catch (jsonError) {
          // 响应不是JSON格式
          errorDetails.message = response.statusText || "API请求失败";
        }
      } 
      // 处理JavaScript错误对象
      else if (error.message) {
        errorDetails.message = error.message;
        
        // 尝试从错误消息中提取状态码
        const statusMatch = error.message.match(/(?:status|code)[\s:]*(\d+)/i);
        if (statusMatch) {
          errorDetails.code = parseInt(statusMatch[1]);
        }
        
        // 检查是否是网络错误
        if (error.message.includes('fetch failed') || error.message.includes('NetworkError')) {
          errorDetails.code = 0;
          errorDetails.message = "网络连接失败：" + error.message;
        } else if (error.message.includes('User location is not supported')) {
          errorDetails.code = 400;
          errorDetails.message = "用户所在地区不支持此API";
        }
      }
      
      // 提取堆栈信息（调试用）
      if (error.stack && process.env.NODE_ENV === 'development') {
        errorDetails.details = { ...errorDetails.details, stack: error.stack };
      }
      
    } catch (extractError) {
      console.error('[SendMessageManager] 提取错误详情失败:', extractError);
      // 保持默认错误信息
    }
    
    return errorDetails;
  }
}

// 工厂函数：创建发送消息管理器实例
export function createSendMessageManager(context: SendMessageContext): SendMessageManager {
  return new SendMessageManager(context);
}

// 便捷方法：执行不同类型的请求
export const ChatRequests = {
  // 发送新消息
  async sendMessage(
    manager: SendMessageManager, 
    content: string, 
    files?: FileData[],
    options?: Partial<SendMessageConfig>
  ): Promise<string | null> {
    return manager.sendMessage({
      content,
      files,
      directReply: false,
      ...options
    });
  },

  // 直接请求回复
  async requestDirectReply(
    manager: SendMessageManager,
    options?: Partial<SendMessageConfig>
  ): Promise<string | null> {
    return manager.sendMessage({
      directReply: true,
      ...options
    });
  },

  // 重新生成消息（完全替换）
  async regenerateMessage(
    manager: SendMessageManager,
    messageId: string,
    beforeMessageIndex: number,
    options?: Partial<SendMessageConfig>
  ): Promise<string | null> {
    return manager.sendMessage({
      regenerate: {
        messageId,
        beforeMessageIndex,
        mode: 'replace'
      },
      ...options
    });
  },

  // 生成变体（保留原回复）
  async generateVariant(
    manager: SendMessageManager,
    messageId: string,
    beforeMessageIndex: number,
    options?: Partial<SendMessageConfig>
  ): Promise<string | null> {
    return manager.sendMessage({
      regenerate: {
        messageId,
        beforeMessageIndex,
        mode: 'variant'
      },
      ...options
    });
  }
};