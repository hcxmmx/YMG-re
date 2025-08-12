/**
 * 消息构建器V2 集成示例
 * 
 * 展示如何将新的消息构建器V2集成到现有项目中
 * 替换复杂的SendMessageManager的部分功能
 */

import { MessageBuilderV2, buildGeminiRequest, buildOpenAIRequest, ChatHistoryItem } from './message-builder-v2';
import { STPreset, STPresetParser, APIParamProcessor } from './preset-system-v2';

// ==================== 集成适配器 ====================

/**
 * 现有项目的消息接口（简化）
 */
interface ExistingMessage {
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
  id: string;
}

/**
 * 现有项目的用户设置接口（简化）
 */
interface ExistingUserSettings {
  apiType: 'gemini' | 'openai' | 'custom';
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

/**
 * 现有项目的预设接口（简化）
 */
interface ExistingPreset {
  id: string;
  name: string;
  prompts: Array<{
    content: string;
    enabled: boolean;
    // 注意：现有项目可能缺少深度和角色信息
    depth?: number;
    role?: string;
    order?: number;
  }>;
  temperature?: number;
  maxTokens?: number;
}

// ==================== 适配器类 ====================

/**
 * 消息构建器V2的适配器类
 * 将现有项目的数据格式转换为V2兼容格式
 */
export class MessageBuilderV2Adapter {
  private messageBuilder: MessageBuilderV2;

  constructor(settings: ExistingUserSettings) {
    this.messageBuilder = new MessageBuilderV2({
      apiType: settings.apiType,
      model: settings.model,
      maxTokens: settings.maxTokens,
      debug: false // 在生产环境中关闭调试
    });
  }

  /**
   * 将现有项目的消息格式转换为V2格式
   */
  private convertMessagesToV2Format(messages: ExistingMessage[]): ChatHistoryItem[] {
    return messages
      .filter(msg => msg.role !== 'system') // 过滤掉系统消息，它们由预设处理
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.timestamp
      }));
  }

  /**
   * 将现有项目的预设格式升级为V2格式
   */
  private upgradePresetToV2(preset: ExistingPreset): STPreset {
    return {
      id: preset.id,
      name: preset.name,
      description: `从旧预设格式升级: ${preset.name}`,
      prompts: preset.prompts.map((prompt, index) => ({
        identifier: `legacy_prompt_${index}`,
        name: `遗留提示词 ${index + 1}`,
        content: prompt.content,
        enabled: prompt.enabled,
        
        // 为旧预设提供默认的深度和角色配置
        role: (prompt.role as 'system' | 'user' | 'assistant') || 'system',
        injection_depth: prompt.depth ?? 0,
        injection_order: prompt.order ?? (100 + index), // 确保按原始顺序
        injection_position: 0
      })),
      
      // 保持原有参数
      temperature: preset.temperature,
      max_tokens: preset.maxTokens,
      created_at: Date.now(),
      updated_at: Date.now()
    };
  }

  /**
   * 构建API请求（主要集成方法）
   */
  public async buildAPIRequest(
    messages: ExistingMessage[],
    preset: ExistingPreset,
    settings: ExistingUserSettings,
    systemPromptOverride?: string
  ): Promise<any> {
    // 1. 转换数据格式
    const chatHistory = this.convertMessagesToV2Format(messages);
    const v2Preset = this.upgradePresetToV2(preset);

    // 2. 使用消息构建器V2生成请求
    const result = await this.messageBuilder.buildRequest(
      v2Preset,
      chatHistory,
      systemPromptOverride
    );

    // 3. 根据API类型返回正确格式
    if (settings.apiType === 'gemini') {
      return this.formatGeminiRequest(result as any, settings);
    } else {
      return this.formatOpenAIRequest(result as any, settings);
    }
  }

  /**
   * 格式化Gemini请求
   */
  private formatGeminiRequest(geminiBody: any, settings: ExistingUserSettings) {
    return {
      url: 'https://generativelanguage.googleapis.com/v1beta/models/' + 
           settings.model + ':generateContent',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(geminiBody)
    };
  }

  /**
   * 格式化OpenAI请求
   */
  private formatOpenAIRequest(openaiBody: any, settings: ExistingUserSettings) {
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(openaiBody)
    };
  }
}

// ==================== 集成示例函数 ====================

/**
 * 示例1: 替换现有的消息发送逻辑
 */
export async function replaceExistingSendMessage(
  messages: ExistingMessage[],
  preset: ExistingPreset,
  settings: ExistingUserSettings
): Promise<Response> {
  console.log('🔄 使用消息构建器V2替换现有发送逻辑');
  
  const adapter = new MessageBuilderV2Adapter(settings);
  
  // 构建请求
  const requestConfig = await adapter.buildAPIRequest(messages, preset, settings);
  
  console.log('📤 发送请求到:', requestConfig.url);
  console.log('📊 请求体大小:', requestConfig.body.length, '字符');
  
  // 发送请求
  const response = await fetch(requestConfig.url, {
    method: requestConfig.method,
    headers: requestConfig.headers,
    body: requestConfig.body
  });
  
  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
  }
  
  return response;
}

/**
 * 示例2: 批量处理多个对话
 */
export async function batchProcessConversations(
  conversations: Array<{
    messages: ExistingMessage[];
    preset: ExistingPreset;
  }>,
  settings: ExistingUserSettings
): Promise<any[]> {
  console.log(`🔢 批量处理 ${conversations.length} 个对话`);
  
  const adapter = new MessageBuilderV2Adapter(settings);
  const results = [];
  
  for (let i = 0; i < conversations.length; i++) {
    const { messages, preset } = conversations[i];
    
    console.log(`处理对话 ${i + 1}/${conversations.length}: ${preset.name}`);
    
    try {
      const requestConfig = await adapter.buildAPIRequest(messages, preset, settings);
      results.push({
        success: true,
        conversationIndex: i,
        requestConfig
      });
    } catch (error) {
      console.error(`对话 ${i + 1} 处理失败:`, error);
      results.push({
        success: false,
        conversationIndex: i,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ 批量处理完成: ${successCount}/${conversations.length} 成功`);
  
  return results;
}

/**
 * 示例3: 预设兼容性检查和升级
 */
export async function checkPresetCompatibility(preset: ExistingPreset): Promise<{
  compatible: boolean;
  issues: string[];
  upgraded: STPreset;
  recommendations: string[];
}> {
  console.log(`🔍 检查预设兼容性: ${preset.name}`);
  
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // 检查缺失的字段
  preset.prompts.forEach((prompt, index) => {
    if (!prompt.depth && prompt.depth !== 0) {
      issues.push(`提示词 ${index + 1} 缺少深度信息`);
      recommendations.push(`为提示词 ${index + 1} 设置合适的 injection_depth`);
    }
    
    if (!prompt.role) {
      issues.push(`提示词 ${index + 1} 缺少角色信息`);
      recommendations.push(`为提示词 ${index + 1} 设置正确的 role (system/user/assistant)`);
    }
    
    if (!prompt.order && prompt.order !== 0) {
      issues.push(`提示词 ${index + 1} 缺少顺序信息`);
      recommendations.push(`为提示词 ${index + 1} 设置 injection_order 以控制优先级`);
    }
  });
  
  // 创建升级版本
  const adapter = new MessageBuilderV2Adapter({
    apiType: 'openai',
    apiKey: 'dummy',
    model: 'gpt-3.5-turbo',
    temperature: 1,
    maxTokens: 2048
  });
  
  const upgraded = (adapter as any).upgradePresetToV2(preset);
  
  const compatible = issues.length === 0;
  
  console.log(`📋 兼容性检查结果:`);
  console.log(`- 兼容性: ${compatible ? '✅ 完全兼容' : '⚠️ 需要升级'}`);
  console.log(`- 发现问题: ${issues.length} 个`);
  console.log(`- 建议: ${recommendations.length} 个`);
  
  if (!compatible) {
    console.log(`\n建议的改进措施:`);
    recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }
  
  return {
    compatible,
    issues,
    upgraded,
    recommendations
  };
}

/**
 * 示例4: 性能对比测试
 */
export async function performanceComparison(
  messages: ExistingMessage[],
  preset: ExistingPreset,
  settings: ExistingUserSettings
): Promise<{
  v2Time: number;
  memoryUsage: number;
  requestSize: number;
}> {
  console.log('⏱️ 开始性能对比测试');
  
  const adapter = new MessageBuilderV2Adapter(settings);
  
  // 测试消息构建器V2的性能
  const startTime = performance.now();
  const startMemory = process.memoryUsage().heapUsed;
  
  const requestConfig = await adapter.buildAPIRequest(messages, preset, settings);
  
  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed;
  
  const v2Time = endTime - startTime;
  const memoryUsage = endMemory - startMemory;
  const requestSize = requestConfig.body.length;
  
  console.log(`📊 消息构建器V2性能:`);
  console.log(`- 构建时间: ${v2Time.toFixed(2)}ms`);
  console.log(`- 内存使用: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);
  console.log(`- 请求大小: ${(requestSize / 1024).toFixed(2)}KB`);
  
  return {
    v2Time,
    memoryUsage,
    requestSize
  };
}

// ==================== 迁移指南 ====================

/**
 * 打印迁移指南
 */
export function printMigrationGuide(): void {
  console.log(`
🚀 消息构建器V2 迁移指南

== 第一步：安装依赖 ==
确保你的项目包含以下文件：
- lib/core-v2/preset-system-v2.ts
- lib/core-v2/message-builder-v2.ts
- lib/core-v2/integration-example-v2.ts (本文件)

== 第二步：现有代码替换 ==

# 替换前（复杂的SendMessageManager）：
const sendManager = new SendMessageManager(context);
const result = await sendManager.sendMessage(config);

# 替换后（简洁的V2适配器）：
const adapter = new MessageBuilderV2Adapter(settings);
const request = await adapter.buildAPIRequest(messages, preset, settings);
const response = await fetch(request.url, { ... });

== 第三步：预设格式升级 ==

# 检查现有预设的兼容性：
const compatibility = await checkPresetCompatibility(yourPreset);

# 如果需要升级，使用返回的upgraded预设：
const upgradedPreset = compatibility.upgraded;

== 第四步：API参数优化 ==

# Gemini参数自动映射：
max_tokens -> maxOutputTokens
top_p -> topP
top_k -> topK

# OpenAI参数保持不变：
max_tokens, top_p, temperature, etc.

== 第五步：深度注入配置 ==

为每个提示词添加以下字段：
- injection_depth: 注入深度 (0-N)
- injection_order: 注入优先级 (数值越小越优先)
- role: 消息角色 ('system' | 'user' | 'assistant')

== 性能优势 ==

1. 🚀 更快的消息构建速度
2. 💾 更低的内存使用
3. 📦 更小的请求体积
4. 🔧 更好的调试支持
5. 🎯 精确的深度注入控制

== 兼容性保证 ==

- ✅ 自动升级旧预设格式
- ✅ 保持现有API接口不变
- ✅ 支持渐进式迁移
- ✅ 完整的错误处理

开始迁移吧！🎉
  `);
}

// ==================== 导出的工厂函数 ====================

/**
 * 创建适配器实例的工厂函数
 */
export function createMessageBuilderAdapter(settings: ExistingUserSettings): MessageBuilderV2Adapter {
  return new MessageBuilderV2Adapter(settings);
}

/**
 * 快速集成函数 - 一步到位的API请求构建
 */
export async function quickBuildRequest(
  messages: ExistingMessage[],
  preset: ExistingPreset,
  settings: ExistingUserSettings,
  systemPromptOverride?: string
): Promise<any> {
  const adapter = new MessageBuilderV2Adapter(settings);
  return adapter.buildAPIRequest(messages, preset, settings, systemPromptOverride);
}

// 如果直接运行此文件，显示迁移指南
if (require.main === module) {
  printMigrationGuide();
}
