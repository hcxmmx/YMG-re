/**
 * Message Builder V3 - 基于SillyTavern架构的设计
 * 
 * 采用SillyTavern的混合架构模式：
 * 1. 统一的核心逻辑处理（深度注入、预设处理）
 * 2. API专门的转换器（消息格式、参数映射）
 * 3. 主控制器 + 工厂模式
 */

import { STPreset, STPromptItem } from './preset-system-v2';

// ==================== 基础接口定义 ====================

/**
 * 基础消息接口（API无关）
 */
export interface BaseMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
  injected?: boolean;
}

/**
 * 聊天历史条目
 */
export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

/**
 * 消息构建配置
 */
export interface MessageBuilderConfig {
  model?: string;
  maxTokens?: number;
  debug?: boolean;
}

// ==================== 核心逻辑模块 ====================

/**
 * 消息核心处理器 - 所有API共享的逻辑
 * 基于SillyTavern的核心处理逻辑
 */
export class MessageCore {
  /**
   * 统一的深度注入处理 - 基于SillyTavern的populationInjectionPrompts逻辑
   */
  static async injectPrompts(
    baseMessages: BaseMessage[],
    preset: STPreset,
    systemPromptOverride?: string,
    debug: boolean = false
  ): Promise<BaseMessage[]> {
    if (debug) {
      console.log('=== MessageCore: 开始深度注入 ===');
    }

    let messages = [...baseMessages];
    let totalInsertedMessages = 0;

    // 预处理提示词：应用默认值并过滤空内容（SillyTavern逻辑）
    const processedPrompts = preset.prompts.map(prompt => ({
      ...prompt,
      // 应用默认值，兼容旧格式预设
      injection_depth: prompt.injection_depth ?? 0,
      injection_order: prompt.injection_order ?? 100,
      role: prompt.role || 'system',
      enabled: prompt.enabled !== false
    }));
    
    // 过滤有效提示词
    const enabledPrompts = processedPrompts.filter(prompt => 
      prompt.enabled && 
      prompt.content && 
      prompt.content.trim().length > 0
    );
    
    if (debug && processedPrompts.length !== enabledPrompts.length) {
      console.log(`过滤掉 ${processedPrompts.length - enabledPrompts.length} 个无效提示词`);
    }

    // 处理系统提示词覆盖
    if (systemPromptOverride) {
      const systemOverride: STPromptItem = {
        identifier: 'system-override',
        name: '系统提示词覆盖',
        content: systemPromptOverride,
        enabled: true,
        role: 'system',
        injection_depth: 0,
        injection_order: 0,
        injection_position: 0,
        forbid_overrides: false,
        marker: false,
        system_prompt: true
      };
      enabledPrompts.unshift(systemOverride);
    }

    if (enabledPrompts.length === 0) {
      return messages;
    }

    // 获取最大深度
    const maxDepth = Math.max(...enabledPrompts.map(p => p.injection_depth));

    if (debug) {
      console.log(`处理深度范围: 0 - ${maxDepth}`);
      console.log(`启用的提示词数量: ${enabledPrompts.length}`);
    }

    // 反转消息数组（SillyTavern的处理方式）
    messages.reverse();

    // 按深度逐层处理
    for (let depth = 0; depth <= maxDepth; depth++) {
      const depthPrompts = enabledPrompts.filter(p => p.injection_depth === depth);
      
      if (depthPrompts.length === 0) continue;

      // 按优先级分组
      const orderGroups: { [key: number]: STPromptItem[] } = {};
      for (const prompt of depthPrompts) {
        const order = prompt.injection_order || 100;
        if (!orderGroups[order]) {
          orderGroups[order] = [];
        }
        orderGroups[order].push(prompt);
      }

      // 按优先级从高到低排序（数值小优先）
      const orders = Object.keys(orderGroups)
        .map(Number)
        .sort((a, b) => a - b);

      const roleMessages: BaseMessage[] = [];

      // 处理每个优先级组
      for (const order of orders) {
        const orderPrompts = orderGroups[order];

        // 按角色顺序处理
        const roleOrder = ['system', 'user', 'assistant'] as const;
        for (const role of roleOrder) {
          const rolePrompts = orderPrompts.filter(p => p.role === role);
          
          if (rolePrompts.length === 0) continue;

          // 合并同角色的提示词内容
          const jointContent = rolePrompts
            .map(p => p.content.trim())
            .join('\n\n');

          if (jointContent.length > 0) {
            roleMessages.push({
              role: role,
              content: jointContent,
              injected: true
            });
          }
        }
      }

      // 注入到指定深度位置
      if (roleMessages.length > 0) {
        const insertIndex = depth + totalInsertedMessages;
        messages.splice(insertIndex, 0, ...roleMessages);
        totalInsertedMessages += roleMessages.length;

        if (debug) {
          console.log(`深度 ${depth}: 注入了 ${roleMessages.length} 条消息`);
        }
      }
    }

    // 还原消息顺序
    messages.reverse();

    // 实现SillyTavern的消息合并逻辑
    const mergedMessages: BaseMessage[] = [];
    
    messages.forEach(message => {
      // 跳过空内容的消息
      if (!message.content || message.content.trim().length === 0) {
        if (debug) {
          console.log(`跳过空内容消息: ${message.role}`);
        }
        return;
      }
      
      // SillyTavern的合并逻辑：相同角色且内容不为空
      if (mergedMessages.length > 0 && 
          mergedMessages[mergedMessages.length - 1].role === message.role) {
        
        // 合并内容，用双换行分隔（SillyTavern标准）
        mergedMessages[mergedMessages.length - 1].content += '\n\n' + message.content;
        
        if (debug) {
          console.log(`合并${message.role}消息`);
        }
      } else {
        // 新增消息
        mergedMessages.push({
          role: message.role,
          content: message.content,
          injected: message.injected
        });
        
        if (debug) {
          console.log(`添加${message.role}消息`);
        }
      }
    });

    if (debug) {
      console.log(`注入完成: ${messages.length} -> ${mergedMessages.length}条消息`);
      console.log(`最终序列: ${mergedMessages.map(m => m.role).join(' -> ')}`);
    }

    return mergedMessages;
  }

  /**
   * 构建基础消息数组
   */
  static buildBaseMessages(chatHistory: ChatHistoryItem[]): BaseMessage[] {
    return chatHistory.map(item => ({
      role: item.role,
      content: item.content,
      injected: false
    }));
  }
}

// ==================== API转换器接口 ====================

/**
 * API转换器接口 - 基于SillyTavern的转换器模式
 */
export interface IApiConverter {
  convertMessages(messages: BaseMessage[], preset: STPreset, config: MessageBuilderConfig): any;
  buildGenerationConfig(preset: STPreset, config: MessageBuilderConfig): any;
  getApiEndpoint(config: MessageBuilderConfig): string;
  buildRequestHeaders(apiKey: string): Record<string, string>;
}

// ==================== 具体的API转换器 ====================

/**
 * Gemini API转换器 - 基于SillyTavern的convertGooglePrompt
 */
export class GeminiConverter implements IApiConverter {
  convertMessages(messages: BaseMessage[], preset: STPreset, config: MessageBuilderConfig): any {
    // 提取系统消息到systemInstruction（SillyTavern的做法）
    const systemMessages: string[] = [];
    const nonSystemMessages: BaseMessage[] = [];

    for (const message of messages) {
      if (message.role === 'system') {
        systemMessages.push(message.content);
      } else {
        nonSystemMessages.push(message);
      }
    }

    // 转换角色和格式
    const contents: any[] = [];
    
    for (let i = 0; i < nonSystemMessages.length; i++) {
      const message = nonSystemMessages[i];
      
      // 角色转换（SillyTavern逻辑）
      let geminiRole: 'user' | 'model';
      if (message.role === 'assistant') {
        geminiRole = 'model';
      } else {
        geminiRole = 'user';
      }

      const parts = [{ text: message.content }];

      // 合并连续相同角色的消息（Gemini要求）
      if (contents.length > 0 && contents[contents.length - 1].role === geminiRole) {
        const prevMessage = contents[contents.length - 1];
        const textPart = prevMessage.parts.find((p: any) => p.text !== undefined);
        if (textPart) {
          textPart.text += '\n\n' + message.content;
        } else {
          prevMessage.parts.push(...parts);
        }
      } else {
        contents.push({
          role: geminiRole,
          parts: parts
        });
      }
    }

    const result: any = { contents };

    // 添加系统指令
    if (systemMessages.length > 0) {
      result.systemInstruction = {
        parts: systemMessages.map(text => ({ text }))
      };
    }

    return result;
  }

  buildGenerationConfig(preset: STPreset, config: MessageBuilderConfig): any {
    const generationConfig: any = {};

    if (preset.temperature !== undefined) generationConfig.temperature = preset.temperature;
    if (preset.top_p !== undefined) generationConfig.topP = preset.top_p;
    if (preset.top_k !== undefined) generationConfig.topK = preset.top_k;
    
    // Gemini使用maxOutputTokens
    if (preset.max_tokens !== undefined) {
      generationConfig.maxOutputTokens = preset.max_tokens;
    } else if (config.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = config.maxTokens;
    }

    // 安全设置（基于SillyTavern的GEMINI_SAFETY）
    const safetySettings = [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ];

    return { generationConfig, safetySettings };
  }

  getApiEndpoint(config: MessageBuilderConfig): string {
    const model = config.model || 'gemini-1.5-flash';
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  }

  buildRequestHeaders(apiKey: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }
}

/**
 * OpenAI API转换器 - 保持标准Chat Completion格式
 */
export class OpenAIConverter implements IApiConverter {
  convertMessages(messages: BaseMessage[], preset: STPreset, config: MessageBuilderConfig): any {
    return {
      model: config.model || 'gpt-3.5-turbo',
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name && { name: msg.name })
      }))
    };
  }

  buildGenerationConfig(preset: STPreset, config: MessageBuilderConfig): any {
    const params: any = {};

    if (preset.temperature !== undefined) params.temperature = preset.temperature;
    if (preset.top_p !== undefined) params.top_p = preset.top_p;
    if (preset.frequency_penalty !== undefined) params.frequency_penalty = preset.frequency_penalty;
    if (preset.presence_penalty !== undefined) params.presence_penalty = preset.presence_penalty;
    
    // OpenAI使用max_tokens
    if (preset.max_tokens !== undefined) {
      params.max_tokens = preset.max_tokens;
    } else if (config.maxTokens !== undefined) {
      params.max_tokens = config.maxTokens;
    }

    return params;
  }

  getApiEndpoint(config: MessageBuilderConfig): string {
    return 'https://api.openai.com/v1/chat/completions';
  }

  buildRequestHeaders(apiKey: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }
}

/**
 * Claude API转换器 - 基于SillyTavern的convertClaudeMessages
 */
export class ClaudeConverter implements IApiConverter {
  convertMessages(messages: BaseMessage[], preset: STPreset, config: MessageBuilderConfig): any {
    // Claude也需要特殊的系统消息处理
    const systemMessages: string[] = [];
    const nonSystemMessages: BaseMessage[] = [];

    for (const message of messages) {
      if (message.role === 'system') {
        systemMessages.push(message.content);
      } else {
        nonSystemMessages.push(message);
      }
    }

    const result: any = {
      model: config.model || 'claude-3-sonnet-20240229',
      messages: nonSystemMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    };

    // Claude的系统消息处理
    if (systemMessages.length > 0) {
      result.system = systemMessages.join('\n\n');
    }

    return result;
  }

  buildGenerationConfig(preset: STPreset, config: MessageBuilderConfig): any {
    const params: any = {};

    if (preset.temperature !== undefined) params.temperature = preset.temperature;
    if (preset.top_p !== undefined) params.top_p = preset.top_p;
    if (preset.top_k !== undefined) params.top_k = preset.top_k;
    
    if (preset.max_tokens !== undefined) {
      params.max_tokens = preset.max_tokens;
    } else if (config.maxTokens !== undefined) {
      params.max_tokens = config.maxTokens;
    }

    return params;
  }

  getApiEndpoint(config: MessageBuilderConfig): string {
    return 'https://api.anthropic.com/v1/messages';
  }

  buildRequestHeaders(apiKey: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    };
  }
}

// ==================== 转换器工厂 ====================

/**
 * API转换器工厂 - 基于SillyTavern的switch模式
 */
export class ConverterFactory {
  private static converters: { [key: string]: IApiConverter } = {
    'gemini': new GeminiConverter(),
    'openai': new OpenAIConverter(),
    'claude': new ClaudeConverter()
  };

  static getConverter(apiType: string): IApiConverter {
    const converter = this.converters[apiType];
    if (!converter) {
      throw new Error(`Unsupported API type: ${apiType}`);
    }
    return converter;
  }

  /**
   * 注册新的转换器 - 支持插件式扩展
   */
  static registerConverter(apiType: string, converter: IApiConverter): void {
    this.converters[apiType] = converter;
  }

  /**
   * 获取支持的API类型列表
   */
  static getSupportedTypes(): string[] {
    return Object.keys(this.converters);
  }
}

// ==================== 主消息构建器 ====================

/**
 * MessageBuilderV3 - 基于SillyTavern架构的主控制器
 */
export class MessageBuilderV3 {
  private config: MessageBuilderConfig;

  constructor(config: MessageBuilderConfig) {
    this.config = { debug: false, ...config };
  }

  /**
   * 构建API请求 - 主要接口方法
   * 基于SillyTavern的/generate路由逻辑
   */
  async buildRequest(
    apiType: string,
    preset: STPreset,
    chatHistory: ChatHistoryItem[],
    apiKey: string,
    systemPromptOverride?: string
  ): Promise<{ url: string; method: string; headers: Record<string, string>; body: string }> {
    if (this.config.debug) {
      console.log(`=== MessageBuilderV3: 构建${apiType}请求 ===`);
    }

    // 1. 使用共享的核心逻辑处理消息
    const baseMessages = MessageCore.buildBaseMessages(chatHistory);
    const processedMessages = await MessageCore.injectPrompts(
      baseMessages, 
      preset, 
      systemPromptOverride, 
      this.config.debug
    );

    // 2. 获取对应的API转换器
    const converter = ConverterFactory.getConverter(apiType);

    // 3. 转换为API特定格式
    const apiMessages = converter.convertMessages(processedMessages, preset, this.config);
    const generationConfig = converter.buildGenerationConfig(preset, this.config);

    // 4. 构建最终请求体
    const requestBody = { ...apiMessages, ...generationConfig };
    
    // 5. 构建请求配置
    return {
      url: converter.getApiEndpoint(this.config),
      method: 'POST',
      headers: converter.buildRequestHeaders(apiKey),
      body: JSON.stringify(requestBody)
    };
  }

  /**
   * 便捷方法：直接发送请求
   */
  async sendRequest(
    apiType: string,
    preset: STPreset,
    chatHistory: ChatHistoryItem[],
    apiKey: string,
    systemPromptOverride?: string
  ): Promise<Response> {
    const requestConfig = await this.buildRequest(apiType, preset, chatHistory, apiKey, systemPromptOverride);
    
    return fetch(requestConfig.url, {
      method: requestConfig.method,
      headers: requestConfig.headers,
      body: requestConfig.body
    });
  }
}

// ==================== 便捷导出函数 ====================

/**
 * 创建消息构建器实例
 */
export function createMessageBuilder(config: MessageBuilderConfig = {}): MessageBuilderV3 {
  return new MessageBuilderV3(config);
}

/**
 * 快速构建请求 - 一步到位
 */
export async function buildRequest(
  apiType: string,
  preset: STPreset,
  chatHistory: ChatHistoryItem[],
  apiKey: string,
  config: MessageBuilderConfig = {},
  systemPromptOverride?: string
): Promise<{ url: string; method: string; headers: Record<string, string>; body: string }> {
  const builder = new MessageBuilderV3(config);
  return builder.buildRequest(apiType, preset, chatHistory, apiKey, systemPromptOverride);
}

/**
 * 快速发送请求
 */
export async function sendRequest(
  apiType: string,
  preset: STPreset,
  chatHistory: ChatHistoryItem[],
  apiKey: string,
  config: MessageBuilderConfig = {},
  systemPromptOverride?: string
): Promise<Response> {
  const builder = new MessageBuilderV3(config);
  return builder.sendRequest(apiType, preset, chatHistory, apiKey, systemPromptOverride);
}
