import { Message } from './types';
import { ChatApiParams, callChatApi, handleStreamResponse, handleNonStreamResponse } from './chatApi';
import { apiKeyStorage } from './storage';
import { replaceMacros } from './macroUtils';
import { trimMessageHistory } from './tokenUtils';
import { generateId } from './utils';
import type { FileData } from '@/components/chat/chat-input';

// 发送消息配置接口
export interface SendMessageConfig {
  content: string;                     // 用户输入的内容
  files?: FileData[];                  // 附件
  stream?: boolean;                    // 是否使用流式响应，默认从设置读取
  onProgress?: (chunk: string) => void; // 流式响应进度回调
  onComplete?: (fullResponse: string) => void; // 完成回调
  onError?: (error: string) => void;   // 错误回调
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

  // 发送新消息
  async sendMessage(config: SendMessageConfig): Promise<string | null> {
    console.log('[SendMessageManager] 开始发送消息');
    
    try {
      // 生成请求ID
      this.activeRequestId = this.generateRequestId();
      
      // 1. 检查API密钥
      const apiKey = await this.checkApiKey();
      if (!apiKey) {
        const error = "未找到有效的API密钥。请先在设置中配置API密钥或在扩展功能的API密钥管理中添加并启用API密钥。";
        config.onError?.(error);
        this.context.toast({
          title: "API密钥未配置",
          description: error,
          variant: "destructive",
        });
        return null;
      }

      // 2. 处理用户输入内容
      const processedContent = await this.processUserInput(config.content);

      // 3. 构建用户消息
      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: processedContent,
        files: config.files,
        timestamp: new Date(),
      };

      // 4. 构建完整的消息历史
      const messageHistory = [...this.context.messages, userMessage];

      // 5. 裁剪消息历史
      const trimmedMessages = await this.trimMessageHistory(messageHistory, apiKey);
      console.log(`[SendMessageManager] 消息裁剪: 从${messageHistory.length}条消息裁剪到${trimmedMessages.length}条`);

      // 6. 处理系统提示词
      const systemPrompt = await this.processSystemPrompt();

      // 7. 准备API参数
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

      // 8. 调用API
      config.onStart?.();
      const response = await this.callApi(apiParams);

      // 9. 处理响应
      if (apiParams.stream) {
        return await this.handleStreamResponse(response, config);
      } else {
        return await this.handleNonStreamResponse(response, config);
      }

    } catch (error: any) {
      console.error('[SendMessageManager] 发送消息失败:', error);
      const errorMessage = error.message || "发送消息时出错";
      config.onError?.(errorMessage);
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
      const errorData = await response.json();
      throw new Error(errorData.error || "API调用失败");
    }

    let fullResponse = "";
    const playerName = this.context.currentPlayer?.name || "玩家";
    const characterName = this.context.currentCharacter?.name || "AI";
    
    try {
      for await (const chunk of handleStreamResponse(response)) {
        // 应用正则表达式处理AI输出
        let processedChunk = chunk;
        try {
          processedChunk = await this.context.applyRegexToMessage(
            chunk, 
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
    } catch (error: any) {
      throw new Error(`流式响应处理失败: ${error.message}`);
    }

    // 应用正则表达式处理完整响应
    let processedFullResponse = fullResponse;
    try {
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
      const errorData = await response.json();
      throw new Error(errorData.error || "API调用失败");
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
}

// 工厂函数：创建发送消息管理器实例
export function createSendMessageManager(context: SendMessageContext): SendMessageManager {
  return new SendMessageManager(context);
}