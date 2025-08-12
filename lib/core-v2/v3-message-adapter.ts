/**
 * V3消息适配器
 * 在现有SendMessageManager和V3 MessageCore之间提供无缝集成
 * 保持完全的向后兼容性
 */

import { Message, PromptPreset } from '../types';
import { STPreset, STPromptItem } from './preset-system-v2';
import { MessageBuilderV3, ChatHistoryItem, BaseMessage, MessageCore } from './message-builder-v3';
import { PresetFormatConverter } from '../preset-integration-adapter';
import { generateId } from '../utils';

// ========================================
// 🔄 格式转换接口定义
// ========================================

/**
 * 性能监控指标
 */
export interface PerformanceMetrics {
  v2_build_time: number;      // 原始构建时间
  v3_build_time: number;      // V3构建时间
  memory_usage_before: number; // 构建前内存使用
  memory_usage_after: number;  // 构建后内存使用
  message_count: number;       // 处理的消息数量
  placeholder_count: number;   // 处理的占位符数量
}

/**
 * V3适配器配置
 */
export interface V3AdapterConfig {
  debug?: boolean;           // 调试模式
  enablePerformanceTracking?: boolean; // 性能追踪
  compatibilityMode?: boolean; // 兼容模式（更保守的处理）
}

// ========================================
// 🚀 V3消息适配器核心类
// ========================================

export class V3MessageAdapter {
  private config: V3AdapterConfig;
  private performanceMetrics: PerformanceMetrics | null = null;

  constructor(config: V3AdapterConfig = {}) {
    this.config = {
      debug: false,
      enablePerformanceTracking: false,
      compatibilityMode: false,
      ...config
    };
  }

  /**
   * 🎯 主要方法：使用V3引擎构建消息
   * 这是替换sendMessageManager核心逻辑的关键方法
   */
  async buildMessagesWithV3(
    messages: Message[],
    preset: PromptPreset,
    systemPromptOverride?: string,
    additionalContext?: any
  ): Promise<{
    messages: Message[];
    performance?: PerformanceMetrics;
  }> {
    const startTime = Date.now();
    const memoryBefore = this.config.enablePerformanceTracking ? this.getMemoryUsage() : 0;

    try {
      if (this.config.debug) {
        console.log('🔄 [V3Adapter] 开始V3消息构建', {
          messageCount: messages.length,
          presetName: preset.name,
          hasSystemOverride: !!systemPromptOverride
        });
      }

      // 1. 转换项目格式到V3格式
      const v3Preset = this.convertProjectToV3Format(preset);
      const chatHistory = this.convertMessagesToChatHistory(messages);

      if (this.config.debug) {
        console.log('✅ [V3Adapter] 格式转换完成', {
          v3PromptCount: v3Preset.prompts.length,
          chatHistoryCount: chatHistory.length
        });
      }

      // 2. 使用V3 MessageCore构建消息
      const baseMessages = MessageCore.buildBaseMessages(chatHistory);
      const processedMessages = await MessageCore.injectPrompts(
        baseMessages,
        v3Preset,
        systemPromptOverride,
        this.config.debug
      );

      // 3. 转换回项目格式
      const finalMessages = this.convertV3MessagesToProject(processedMessages);

      // 4. 记录性能指标
      const buildTime = Date.now() - startTime;
      const memoryAfter = this.config.enablePerformanceTracking ? this.getMemoryUsage() : 0;

      if (this.config.enablePerformanceTracking) {
        this.performanceMetrics = {
          v2_build_time: 0, // 会在调用方设置
          v3_build_time: buildTime,
          memory_usage_before: memoryBefore,
          memory_usage_after: memoryAfter,
          message_count: messages.length,
          placeholder_count: v3Preset.prompts.filter(p => p.marker).length
        };
      }

      if (this.config.debug) {
        console.log('🎉 [V3Adapter] V3构建完成', {
          originalCount: messages.length,
          finalCount: finalMessages.length,
          buildTime: `${buildTime}ms`,
          memoryDelta: this.config.enablePerformanceTracking ? 
            `${(memoryAfter - memoryBefore).toFixed(2)}MB` : 'N/A'
        });
      }

      return {
        messages: finalMessages,
        performance: this.performanceMetrics || undefined
      };

    } catch (error) {
      console.error('❌ [V3Adapter] V3构建失败:', error);
      
      // 🛡️ 兼容模式：失败时返回原始消息
      if (this.config.compatibilityMode) {
        console.warn('🔄 [V3Adapter] 启用兼容模式，返回原始消息');
        return { messages };
      }
      
      throw error;
    }
  }

  /**
   * 🔄 转换项目预设格式到V3格式
   */
  private convertProjectToV3Format(preset: PromptPreset): STPreset {
    if (this.config.debug) {
      console.log('🔄 [V3Adapter] 转换预设格式到V3');
    }

    // 使用现有的PresetFormatConverter
    return PresetFormatConverter.convertFromProjectToV3(preset);
  }

  /**
   * 🔄 转换消息数组到聊天历史格式
   */
  private convertMessagesToChatHistory(messages: Message[]): ChatHistoryItem[] {
    return messages
      .filter(msg => msg.role !== 'system') // 过滤系统消息，它们会通过预设处理
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.timestamp?.getTime() || Date.now(),
        id: msg.id
      }));
  }

  /**
   * 🔄 转换V3消息格式回项目格式
   */
  private convertV3MessagesToProject(v3Messages: BaseMessage[]): Message[] {
    return v3Messages.map(msg => ({
      id: generateId(),
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
      timestamp: new Date()
    }));
  }

  /**
   * 📊 获取内存使用情况 (MB)
   */
  private getMemoryUsage(): number {
    try {
      if (typeof performance !== 'undefined' && (performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * 📊 获取性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics | null {
    return this.performanceMetrics;
  }

  /**
   * 🔄 更新配置
   */
  updateConfig(newConfig: Partial<V3AdapterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// ========================================
// 🛠️ 辅助工具和工厂方法
// ========================================

/**
 * 创建V3适配器的工厂方法
 */
export function createV3MessageAdapter(config?: V3AdapterConfig): V3MessageAdapter {
  return new V3MessageAdapter(config);
}

/**
 * 性能对比测试工具
 */
export class PerformanceComparator {
  /**
   * 对比V2和V3的构建性能
   */
  static async comparePerformance(
    messages: Message[],
    preset: PromptPreset,
    systemPrompt?: string
  ): Promise<{
    v2Result: { time: number; memory: number };
    v3Result: { time: number; memory: number };
    improvement: { speedUp: number; memoryReduction: number };
  }> {
    // V2基准测试（简单模拟）
    const v2Start = Date.now();
    const v2MemoryBefore = getMemoryUsage();
    
    // 模拟V2构建过程
    const v2Messages = simulateV2Build(messages, preset, systemPrompt);
    
    const v2Time = Date.now() - v2Start;
    const v2MemoryAfter = getMemoryUsage();
    const v2MemoryUsage = v2MemoryAfter - v2MemoryBefore;

    // V3测试
    const adapter = createV3MessageAdapter({ enablePerformanceTracking: true });
    const v3Result = await adapter.buildMessagesWithV3(messages, preset, systemPrompt);
    const v3Metrics = adapter.getPerformanceMetrics()!;

    return {
      v2Result: { time: v2Time, memory: v2MemoryUsage },
      v3Result: { time: v3Metrics.v3_build_time, memory: v3Metrics.memory_usage_after - v3Metrics.memory_usage_before },
      improvement: {
        speedUp: v2Time / v3Metrics.v3_build_time,
        memoryReduction: v2MemoryUsage > 0 ? (v2MemoryUsage - (v3Metrics.memory_usage_after - v3Metrics.memory_usage_before)) / v2MemoryUsage : 0
      }
    };
  }
}

// 辅助函数
function getMemoryUsage(): number {
  try {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  } catch {
    return 0;
  }
}

function simulateV2Build(messages: Message[], preset: PromptPreset, systemPrompt?: string): Message[] {
  // 模拟原始V2构建过程（简化版）
  const result: Message[] = [];
  
  if (systemPrompt) {
    result.push({
      id: generateId(),
      role: 'system',
      content: systemPrompt,
      timestamp: new Date()
    });
  }
  
  result.push(...messages);
  return result;
}

/**
 * 🧪 调试和测试工具
 */
export const V3AdapterDebug = {
  /**
   * 验证V3适配器功能
   */
  async validateAdapter(adapter: V3MessageAdapter): Promise<boolean> {
    try {
      const testMessages: Message[] = [
        {
          id: 'test-1',
          role: 'user',
          content: 'Hello, test message',
          timestamp: new Date()
        }
      ];

      const testPreset: PromptPreset = {
        id: 'test-preset',
        name: 'Test Preset',
        description: 'Test preset for validation',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        topK: 40,
        prompts: [{
          identifier: 'main',
          name: 'Main Prompt',
          content: 'You are a helpful assistant.',
          enabled: true,
          injection_depth: 0,
          injection_order: 100,
          role: 'system'
        }],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const result = await adapter.buildMessagesWithV3(testMessages, testPreset);
      return result.messages.length > 0;
    } catch (error) {
      console.error('❌ [V3AdapterDebug] 验证失败:', error);
      return false;
    }
  },

  /**
   * 性能基准测试
   */
  async runBenchmark(iterations: number = 100): Promise<void> {
    console.log(`🧪 [V3AdapterDebug] 开始性能基准测试 (${iterations}次迭代)`);
    
    const adapter = createV3MessageAdapter({ enablePerformanceTracking: true });
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await V3AdapterDebug.validateAdapter(adapter);
      times.push(Date.now() - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(`📊 [V3AdapterDebug] 基准测试结果:`, {
      平均时间: `${avgTime.toFixed(2)}ms`,
      最小时间: `${minTime}ms`,
      最大时间: `${maxTime}ms`,
      总迭代次数: iterations
    });
  }
};
