/**
 * 预设集成适配器 - 连接V3预设系统与现有项目
 * 
 * 功能：
 * 1. 旧格式 ⟷ V3格式 双向转换
 * 2. 向后兼容性保证
 * 3. 自动字段补全和验证
 * 4. 安全的数据迁移
 */

import { PromptPreset, PromptPresetItem } from './types';
import { STPreset, STPromptItem, STPresetParser, debugSTPreset } from './core-v2/preset-system-v2';
import { generateId } from './utils';

// ===========================================
// 格式转换器
// ===========================================

export class PresetFormatConverter {
  
  /**
   * 🔄 V3格式转换为项目格式
   */
  static convertFromV3ToProject(stPreset: STPreset): PromptPreset {
    const prompts: PromptPresetItem[] = stPreset.prompts.map(stItem => ({
      // 基础字段
      identifier: stItem.identifier,
      name: stItem.name,
      content: stItem.content,
      enabled: stItem.enabled,
      
      // 占位符字段
      isPlaceholder: stItem.marker || false,
      placeholderType: stItem.marker ? stItem.identifier : undefined,
      implemented: !stItem.marker, // 非标记条目默认为已实现
      
      // 🆕 V3扩展字段 (完整映射)
      injection_depth: stItem.injection_depth,
      injection_order: stItem.injection_order,
      injection_position: stItem.injection_position,
      role: stItem.role,
      forbid_overrides: stItem.forbid_overrides,
      marker: stItem.marker,
      system_prompt: stItem.system_prompt
    }));

    return {
      id: generateId(),
      name: stPreset.name || "导入的预设",
      description: `从SillyTavern预设导入 (V3引擎处理)`,
      
      // 模型参数
      temperature: stPreset.api_settings?.temperature,
      maxTokens: stPreset.api_settings?.max_tokens || stPreset.api_settings?.maxOutputTokens,
      topK: stPreset.api_settings?.top_k,
      topP: stPreset.api_settings?.top_p,
      
      // 提示词数组
      prompts,
      
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }
  
  /**
   * 🔄 项目格式转换为V3格式  
   */
  static convertFromProjectToV3(projectPreset: PromptPreset): STPreset {
    const stPrompts: STPromptItem[] = projectPreset.prompts.map(item => ({
      identifier: item.identifier,
      name: item.name,
      content: item.content,
      enabled: item.enabled,
      
      // V3字段 (带默认值)
      injection_depth: item.injection_depth ?? 0,
      injection_order: item.injection_order ?? 100,
      injection_position: item.injection_position ?? 0,
      role: item.role || 'system',
      forbid_overrides: item.forbid_overrides ?? false,
      marker: item.marker ?? false,
      system_prompt: item.system_prompt ?? true
    }));

    return {
      name: projectPreset.name,
      prompts: stPrompts,
      api_settings: {
        temperature: projectPreset.temperature,
        max_tokens: projectPreset.maxTokens,
        top_k: projectPreset.topK,
        top_p: projectPreset.topP
      }
    };
  }
}

// ===========================================
// 集成适配器主类
// ===========================================

export class PresetIntegrationAdapter {
  private debug: boolean;

  constructor(options: { debug?: boolean } = {}) {
    this.debug = options.debug || false;
  }

  /**
   * 🚀 纯V3预设导入函数 - 直接使用SillyTavern兼容逻辑
   * 
   * @param json SillyTavern预设JSON数据
   * @param fileName 文件名（用于生成预设名称）
   * @returns 项目格式的PromptPreset
   */
  async importSTPresetFromJSON(json: any, fileName?: string): Promise<PromptPreset> {
    if (this.debug) {
      console.log('🚀 [PresetAdapter] 开始V3预设导入...');
    }

    try {
      // 🎯 使用V3解析器的静态方法解析
      const stPreset = STPresetParser.parseFromJSON(json, fileName);
      
      if (this.debug) {
        console.log('✅ [PresetAdapter] V3解析成功');
        debugSTPreset(stPreset);
      }

      // 转换为项目格式
      const projectPreset = PresetFormatConverter.convertFromV3ToProject(stPreset);

      // 使用文件名优化预设名称
      if (fileName && !json.name) {
        projectPreset.name = fileName.replace(/\.json$/i, '');
      }

      if (this.debug) {
        console.log('🎯 [PresetAdapter] 转换完成');
        console.log('📦 [PresetAdapter] 最终预设:', {
          name: projectPreset.name,
          promptCount: projectPreset.prompts.length,
          enabledCount: projectPreset.prompts.filter(p => p.enabled).length,
          hasV3Fields: projectPreset.prompts.some(p => 
            p.injection_depth !== undefined || 
            p.injection_order !== undefined || 
            p.role !== undefined
          )
        });
      }

      return projectPreset;

    } catch (error) {
      console.error('❌ [PresetAdapter] V3导入失败:', error);
      throw new Error(`SillyTavern预设导入失败: ${error.message}`);
    }
  }



  /**
   * 🔍 预设兼容性检查
   */
  checkCompatibility(json: any): {
    isV3Compatible: boolean;
    hasV3Fields: boolean;
    missingFields: string[];
    recommendations: string[];
  } {
    const missingFields: string[] = [];
    const recommendations: string[] = [];
    
    // 检查基础结构
    if (!json.prompts || !Array.isArray(json.prompts)) {
      missingFields.push('prompts');
    }

    // 检查V3特有字段
    let hasV3Fields = false;
    if (json.prompts && Array.isArray(json.prompts)) {
      hasV3Fields = json.prompts.some((p: any) => 
        p.injection_depth !== undefined || 
        p.injection_order !== undefined || 
        p.role !== undefined
      );
    }

    // 生成建议
    if (!hasV3Fields) {
      recommendations.push('此预设可能缺少深度注入功能，建议使用最新的SillyTavern预设');
    }

    return {
      isV3Compatible: missingFields.length === 0,
      hasV3Fields,
      missingFields,
      recommendations
    };
  }
}

// ===========================================
// 便捷导出
// ===========================================

/**
 * 🚀 默认预设适配器实例
 */
export const defaultPresetAdapter = new PresetIntegrationAdapter({
  debug: process.env.NODE_ENV === 'development'
});
