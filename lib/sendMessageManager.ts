import { Message } from './types';
import { ChatApiParams, callChatApi, handleStreamResponse, handleNonStreamResponse } from './chatApi';
import { buildGeminiConfig } from './config/gemini-config';
import { apiKeyStorage } from './storage';
import { replaceMacros } from './macroUtils';
import { trimMessageHistory } from './tokenUtils';
import { generateId } from './utils';
import type { FileData } from '@/components/chat/chat-input';

// 调试信息接口
export interface DebugInfo {
  systemPrompt: string;        // 最终的系统提示词
  messages: Message[];         // 发送给API的消息列表
  apiParams: ChatApiParams;    // 完整的API参数
  timestamp: string;           // 调试信息生成时间
}

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
  onDebugInfo?: (debugInfo: DebugInfo) => void; // 调试信息回调
}

// 加载类型定义
export type LoadingType = 'new' | 'regenerate' | 'variant';

// 🆕 内部请求状态接口
export interface RequestState {
  isLoading: boolean;
  loadingType: LoadingType | null;
  loadingMessageId: string | null;
  currentRequestId: string | null;
  startTime: number | null;
  responseTime: number | null;
}

// 🆕 状态订阅者类型
export type StateSubscriber = (state: RequestState) => void;

// 🆕 RequestLifecycleManager - 专门管理请求生命周期和状态
export class RequestLifecycleManager {
  private state: RequestState = {
    isLoading: false,
    loadingType: null,
    loadingMessageId: null,
    currentRequestId: null,
    startTime: null,
    responseTime: null,
  };
  
  private subscribers: Set<StateSubscriber> = new Set();
  private requestIdCounter = 0;

  /**
   * 订阅状态变化
   */
  subscribe(subscriber: StateSubscriber): () => void {
    this.subscribers.add(subscriber);
    // 立即通知当前状态
    subscriber(this.state);
    
    // 返回取消订阅函数
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  /**
   * 获取当前状态
   */
  getState(): RequestState {
    return { ...this.state };
  }

  /**
   * 更新状态并通知订阅者
   */
  private updateState(updates: Partial<RequestState>) {
    this.state = { ...this.state, ...updates };
    
    // 通知所有订阅者
    this.subscribers.forEach(subscriber => {
      try {
        subscriber(this.state);
      } catch (error) {
        console.error('[RequestLifecycleManager] 状态订阅者回调出错:', error);
      }
    });
  }

  /**
   * 生成唯一请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestIdCounter}`;
  }

  /**
   * 开始请求生命周期
   */
  startRequest(type: LoadingType, messageId?: string): string {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    this.updateState({
      isLoading: true,
      loadingType: type,
      loadingMessageId: messageId || null,
      currentRequestId: requestId,
      startTime: startTime,
      responseTime: null,
    });
    
    console.log(`[RequestLifecycleManager] 请求开始: ${type}`, requestId);
    return requestId;
  }

  /**
   * 结束请求生命周期
   */
  endRequest(): void {
    console.log(`[RequestLifecycleManager] 请求结束:`, this.state.currentRequestId);
    
    this.updateState({
      isLoading: false,
      loadingType: null,
      loadingMessageId: null,
      currentRequestId: null,
    });
  }

  /**
   * 计算并更新响应时间
   */
  calculateResponseTime(): number {
    if (this.state.startTime) {
      const responseTime = Date.now() - this.state.startTime;
      
      this.updateState({
        responseTime: responseTime,
      });
      
      console.log(`[RequestLifecycleManager] 响应时间: ${responseTime}ms`);
      return responseTime;
    }
    return 0;
  }

  /**
   * 处理请求错误
   */
  handleError(error: any): void {
    console.error(`[RequestLifecycleManager] 请求错误:`, this.state.currentRequestId, error);
    
    // 计算响应时间（即使是错误）
    this.calculateResponseTime();
    
    // 结束请求
    this.endRequest();
  }

  /**
   * 取消当前请求
   */
  cancelRequest(): void {
    if (this.state.isLoading) {
      console.log(`[RequestLifecycleManager] 取消请求:`, this.state.currentRequestId);
      this.endRequest();
    }
  }

  /**
   * 检查是否有活动请求
   */
  hasActiveRequest(): boolean {
    return this.state.isLoading;
  }

  /**
   * 获取当前请求ID
   */
  getCurrentRequestId(): string | null {
    return this.state.currentRequestId;
  }
}

// 全局回调接口
export interface GlobalCallbacks {
  onDebugInfo?: (debugInfo: DebugInfo) => void;
  onProgress?: (chunk: string) => void;
  onStart?: () => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (errorDetails: ErrorDetails, errorMessage?: string) => void;
  
  // 🆕 生命周期管理回调
  onRequestStart?: (type: LoadingType, messageId?: string) => void;
  onRequestEnd?: () => void;
  onResponseTimeCalculated?: (responseTime: number) => void;
  onPlayerCharacterInfo?: (playerName: string, characterName: string) => void;
  onRegexProcessing?: (content: string, isInput: boolean) => Promise<string>;
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
  globalCallbacks?: GlobalCallbacks; // 全局回调配置
}

// 发送消息管理器类
export class SendMessageManager {
  private context: SendMessageContext;
  private activeRequestId: string | null = null;
  
  // 🆕 使用RequestLifecycleManager管理状态
  private lifecycleManager: RequestLifecycleManager;

  constructor(context: SendMessageContext) {
    this.context = context;
    this.lifecycleManager = new RequestLifecycleManager();
  }

  // 🆕 状态管理方法 - 委托给RequestLifecycleManager
  
  /**
   * 订阅状态变化
   */
  subscribe(subscriber: StateSubscriber): () => void {
    return this.lifecycleManager.subscribe(subscriber);
  }

  /**
   * 获取当前状态
   */
  getState(): RequestState {
    return this.lifecycleManager.getState();
  }

  // 更新上下文
  updateContext(context: Partial<SendMessageContext>) {
    this.context = { ...this.context, ...context };
  }

  // 🆕 取消当前请求
  cancelRequest(): void {
    this.lifecycleManager.cancelRequest();
    this.activeRequestId = null;
  }

  // 🆕 检查是否有活动请求
  hasActiveRequest(): boolean {
    return this.lifecycleManager.hasActiveRequest();
  }

  // 合并全局回调和局部回调（局部回调优先）
  private mergeCallbacks(config: SendMessageConfig): SendMessageConfig {
    const globalCallbacks = this.context.globalCallbacks;
    if (!globalCallbacks) {
      return config; // 没有全局回调，直接返回
    }

    return {
      ...config,
      onDebugInfo: config.onDebugInfo || globalCallbacks.onDebugInfo,
      onProgress: config.onProgress || globalCallbacks.onProgress,
      onStart: config.onStart || globalCallbacks.onStart,
      onComplete: config.onComplete || globalCallbacks.onComplete,
      onError: config.onError || globalCallbacks.onError,
    };
  }

  // 🆕 生命周期管理方法 - 委托给RequestLifecycleManager
  private triggerRequestStart(type: LoadingType, messageId?: string) {
    const requestId = this.lifecycleManager.startRequest(type, messageId);
    
    // 保持向后兼容：仍然调用全局回调
    this.context.globalCallbacks?.onRequestStart?.(type, messageId);
    
    return requestId;
  }

  private triggerRequestEnd() {
    // 先计算响应时间
    this.calculateAndUpdateResponseTime();
    
    // 结束请求
    this.lifecycleManager.endRequest();
    
    // 保持向后兼容：仍然调用全局回调
    this.context.globalCallbacks?.onRequestEnd?.();
  }

  private triggerResponseTimeCalculated(startTime: number) {
    const responseTime = Date.now() - startTime;
    
    // 保持向后兼容：仍然调用全局回调
    this.context.globalCallbacks?.onResponseTimeCalculated?.(responseTime);
    
    return responseTime;
  }

  /**
   * 🆕 便捷方法：基于内部状态计算响应时间
   */
  private calculateAndUpdateResponseTime(): number {
    return this.lifecycleManager.calculateResponseTime();
  }

  private triggerPlayerCharacterInfo() {
    const playerName = this.context.currentPlayer?.name || "玩家";
    const characterName = this.context.currentCharacter?.name || "AI";
    this.context.globalCallbacks?.onPlayerCharacterInfo?.(playerName, characterName);
    return { playerName, characterName };
  }

  private async triggerRegexProcessing(content: string, isInput: boolean): Promise<string> {
    if (this.context.globalCallbacks?.onRegexProcessing) {
      return await this.context.globalCallbacks.onRegexProcessing(content, isInput);
    }
    
    // 回退到原始的正则处理逻辑
    try {
      const { playerName, characterName } = this.triggerPlayerCharacterInfo();
      const priority = 0;
      const type = isInput ? 1 : 2; // 1=用户输入, 2=AI响应
      return await this.context.applyRegexToMessage(
        content, 
        playerName, 
        characterName, 
        priority, 
        type, 
        this.context.currentCharacter?.id
      );
    } catch (error) {
      console.error(`应用正则表达式处理${isInput ? '用户输入' : 'AI响应'}时出错:`, error);
      return content; // 出错时返回原始内容
    }
  }

  // 发送新消息或直接回复
  async sendMessage(config: SendMessageConfig): Promise<string | null> {
    // 合并全局回调和局部回调
    config = this.mergeCallbacks(config);
    
    const logPrefix = config.regenerate ? 
                       `[SendMessageManager-${config.regenerate.mode === 'variant' ? 'GenerateVariant' : 'Regenerate'}]` : 
                       config.directReply ? '[SendMessageManager-DirectReply]' : 
                       '[SendMessageManager]';
    console.log(`${logPrefix} 开始处理请求`);
    
    // 🆕 触发请求开始生命周期回调（内部管理状态和请求ID）
    const loadingType: LoadingType = config.regenerate ? 
      (config.regenerate.mode === 'variant' ? 'variant' : 'regenerate') : 'new';
    const messageId = config.regenerate?.messageId;
    const requestId = this.triggerRequestStart(loadingType, messageId);
    
    // 🆕 使用内部状态管理的请求ID和开始时间
    this.activeRequestId = requestId;
    
    try {
      
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
      
      // 🆕 触发请求结束生命周期回调
      this.triggerRequestEnd();
      
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

      // 5. 准备API参数（使用统一配置）
      const geminiConfig = buildGeminiConfig(apiKey, {
        model: this.context.settings.model || 'gemini-2.5-flash',
        temperature: this.context.settings.temperature,
        maxOutputTokens: this.context.settings.maxTokens,
        topK: this.context.settings.topK,
        topP: this.context.settings.topP,
      });

      const apiParams: ChatApiParams = {
        messages: trimmedMessages,
        systemPrompt,
        stream: config.stream ?? this.context.settings.enableStreaming,
        requestId: this.activeRequestId,
        ...geminiConfig // 展开统一配置（包含apiKey）
      };

      // 6. 生成调试信息（如果启用）
      if (config.onDebugInfo && typeof window !== 'undefined') {
        const enablePromptDebug = localStorage.getItem('enablePromptDebug') === 'true';
        if (enablePromptDebug) {
          const debugInfo: DebugInfo = {
            systemPrompt,
            messages: trimmedMessages,
            apiParams,
            timestamp: new Date().toISOString()
          };
          config.onDebugInfo(debugInfo);
        }
      }

      // 7. 调用API
      config.onStart?.();
      const response = await this.callApi(apiParams);

      // 8. 处理响应
      if (apiParams.stream) {
        return await this.handleStreamResponse(response, config);
      } else {
        return await this.handleNonStreamResponse(response, config);
      }

    } catch (error: any) {
      console.error(`${logPrefix} 请求失败:`, error);
      
      // 🆕 使用lifecycleManager处理错误
      this.lifecycleManager.handleError(error);
      
      // 创建详细错误信息
      const errorDetails = await this.extractErrorDetails(error);
      const simpleMessage = config.regenerate ? 
        (config.regenerate.mode === 'variant' ? "生成变体时出错" : "重新生成消息时出错") :
        config.directReply ? "请求回复时出错" : 
        "发送消息时出错";
      
      config.onError?.(errorDetails, simpleMessage);
      
      // 保持向后兼容的全局回调通知
      this.context.globalCallbacks?.onRequestEnd?.();
      
      return null;
    } finally {
      this.activeRequestId = null;
    }
  }

  // 🆕 取消当前请求 - 使用lifecycleManager + API调用
  async cancelRequestWithApi(): Promise<boolean> {
    const currentRequestId = this.lifecycleManager.getCurrentRequestId();
    if (!currentRequestId) {
      console.log('[SendMessageManager] 没有活动的请求可以取消');
      return false;
    }

    try {
      const response = await fetch(`/api/chat?requestId=${currentRequestId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      console.log('[SendMessageManager] 请求取消结果:', result);
      
      // 使用lifecycleManager取消请求
      this.lifecycleManager.cancelRequest();
      this.activeRequestId = null;
      return result.success || false;
    } catch (error) {
      console.error('[SendMessageManager] 取消请求失败:', error);
      // 即使API调用失败，也要清理本地状态
      this.lifecycleManager.cancelRequest();
      this.activeRequestId = null;
      return false;
    }
  }

  // 旧方法保持兼容性（委托给lifecycleManager）
  private hasActiveRequestLegacy(): boolean {
    return this.activeRequestId !== null;
  }

  // ========== 私有方法 ==========

  // generateRequestId现在由RequestLifecycleManager内部管理

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

    // 🆕 计算并更新响应时间
    this.calculateAndUpdateResponseTime();
    
    config.onComplete?.(processedFullResponse);
    
    // 🆕 触发请求完成生命周期回调
    this.triggerRequestEnd();
    
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

    // 🆕 计算并更新响应时间
    this.calculateAndUpdateResponseTime();
    
    config.onComplete?.(processedResponse);
    
    // 🆕 触发请求完成生命周期回调
    this.triggerRequestEnd();
    
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

// 🆕 工厂函数：创建独立的请求生命周期管理器
export function createRequestLifecycleManager(): RequestLifecycleManager {
  return new RequestLifecycleManager();
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

// 🆕 高级API：自动状态管理的便捷方法
export const AdvancedChatRequests = {
  /**
   * 🆕 发送新消息 - 自动状态管理版本
   * 只需要提供内容和基本回调，状态管理自动处理
   */
  async sendMessage(
    manager: SendMessageManager,
    content: string,
    options?: {
      files?: FileData[];
      onStart?: () => void;
      onProgress?: (chunk: string) => void;
      onComplete?: (response: string) => void;
      onError?: (error: ErrorDetails, message?: string) => void;
      stream?: boolean;
    }
  ): Promise<string | null> {
    return manager.sendMessage({
      content,
      files: options?.files,
      directReply: false,
      stream: options?.stream,
      onStart: options?.onStart,
      onProgress: options?.onProgress,
      onComplete: options?.onComplete,
      onError: options?.onError,
    });
  },

  /**
   * 🆕 重新生成消息 - 自动状态管理版本
   */
  async regenerateMessage(
    manager: SendMessageManager,
    messageId: string,
    beforeMessageIndex: number,
    options?: {
      onStart?: () => void;
      onProgress?: (chunk: string) => void;
      onComplete?: (response: string) => void;
      onError?: (error: ErrorDetails, message?: string) => void;
      stream?: boolean;
    }
  ): Promise<string | null> {
    return manager.sendMessage({
      regenerate: {
        messageId,
        beforeMessageIndex,
        mode: 'replace'
      },
      stream: options?.stream,
      onStart: options?.onStart,
      onProgress: options?.onProgress,
      onComplete: options?.onComplete,
      onError: options?.onError,
    });
  },

  /**
   * 🆕 生成变体 - 自动状态管理版本
   */
  async generateVariant(
    manager: SendMessageManager,
    messageId: string,
    beforeMessageIndex: number,
    options?: {
      onStart?: () => void;
      onProgress?: (chunk: string) => void;
      onComplete?: (response: string) => void;
      onError?: (error: ErrorDetails, message?: string) => void;
      stream?: boolean;
    }
  ): Promise<string | null> {
    return manager.sendMessage({
      regenerate: {
        messageId,
        beforeMessageIndex,
        mode: 'variant'
      },
      stream: options?.stream,
      onStart: options?.onStart,
      onProgress: options?.onProgress,
      onComplete: options?.onComplete,
      onError: options?.onError,
    });
  },

  /**
   * 🆕 直接请求回复 - 自动状态管理版本
   */
  async requestDirectReply(
    manager: SendMessageManager,
    options?: {
      onStart?: () => void;
      onProgress?: (chunk: string) => void;
      onComplete?: (response: string) => void;
      onError?: (error: ErrorDetails, message?: string) => void;
      stream?: boolean;
    }
  ): Promise<string | null> {
    return manager.sendMessage({
      directReply: true,
      stream: options?.stream,
      onStart: options?.onStart,
      onProgress: options?.onProgress,
      onComplete: options?.onComplete,
      onError: options?.onError,
    });
  }
};