/**
 * 预设系统 V2 - 完全兼容SillyTavern标准
 * 
 * 核心功能：
 * 1. 完整解析SillyTavern预设格式（包括所有深度注入字段）
 * 2. API特定的参数过滤（Gemini vs OpenAI等）
 * 3. 预设验证和调试
 * 4. 与现有系统无缝集成
 */

import { generateId } from '../utils';

// ===== SillyTavern标准数据结构 =====

/**
 * SillyTavern提示词条目（完整版本）
 */
export interface STPromptItem {
  // 基本信息
  identifier: string;
  name: string;
  content: string;
  enabled: boolean;
  
  // 核心注入控制（SillyTavern标准）
  role: 'system' | 'user' | 'assistant';
  injection_depth: number;        // 注入深度：0=最新消息后，1=倒数第2条...
  injection_position: number;     // 注入位置：具体插入点
  injection_order: number;        // 注入优先级：数字越小优先级越高
  
  // 高级控制
  forbid_overrides: boolean;      // 禁止覆盖
  marker: boolean;                // 是否为占位符标记
  system_prompt: boolean;         // 是否为系统提示词
  
  // 扩展字段（用于兼容性）
  extensions?: Record<string, any>;
}

/**
 * SillyTavern预设（完整版本）
 */
export interface STPreset {
  // 基本信息
  id: string;
  name: string;
  description?: string;
  
  // 提示词条目
  prompts: STPromptItem[];
  
  // === OpenAI参数 ===
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  
  // === Gemini参数 ===
  top_k?: number;
  
  // === 通用参数 ===
  stop?: string[];
  
  // === 高级功能 ===
  stream?: boolean;
  json_schema?: any;
  response_format?: any;
  
  // === 模型和连接设置 ===
  chat_completion_source?: string;
  model?: string;
  custom_url?: string;
  reverse_proxy?: string;
  
  // === 扩展和自定义 ===
  extensions?: Record<string, any>;
  custom_include_body?: string;
  custom_exclude_body?: string;
  custom_include_headers?: string;
  
  // === 元数据 ===
  created_at: number;
  updated_at: number;
  version?: string;
}

/**
 * API特定的参数过滤配置
 */
export interface APIParamFilter {
  // 支持的参数列表
  supported_params: string[];
  // 参数映射（SillyTavern名称 -> API名称）
  param_mapping: Record<string, string>;
  // 参数转换函数
  param_transforms: Record<string, (value: any) => any>;
  // 必需参数
  required_params: string[];
  // 默认值
  default_values: Record<string, any>;
}

// ===== API参数过滤器定义 =====

/**
 * Gemini API参数过滤器
 */
export const GEMINI_PARAM_FILTER: APIParamFilter = {
  supported_params: [
    'temperature', 'max_tokens', 'top_p', 'top_k', 'stop',
    'candidate_count', 'response_mime_type', 'response_schema'
  ],
  param_mapping: {
    'max_tokens': 'maxOutputTokens',
    'top_p': 'topP',
    'top_k': 'topK',
    'stop': 'stopSequences'
  },
  param_transforms: {
    'candidate_count': () => 1, // Gemini固定为1
    'stop': (value: string[]) => Array.isArray(value) && value.length > 0 ? value : undefined
  },
  required_params: ['maxOutputTokens'],
  default_values: {
    'temperature': 1.0,
    'maxOutputTokens': 4096,
    'topP': 0.95,
    'topK': 40
  }
};

/**
 * OpenAI API参数过滤器
 */
export const OPENAI_PARAM_FILTER: APIParamFilter = {
  supported_params: [
    'temperature', 'max_tokens', 'top_p', 'frequency_penalty', 
    'presence_penalty', 'stop', 'stream', 'response_format'
  ],
  param_mapping: {
    // OpenAI使用标准名称，无需映射
  },
  param_transforms: {
    'stream': (value: any) => Boolean(value)
  },
  required_params: ['max_tokens'],
  default_values: {
    'temperature': 1.0,
    'max_tokens': 4096,
    'top_p': 1.0,
    'frequency_penalty': 0,
    'presence_penalty': 0
  }
};

// ===== 核心类 =====

/**
 * SillyTavern预设解析器
 */
export class STPresetParser {
  
  /**
   * 从SillyTavern JSON文件解析预设
   */
  static parseFromJSON(jsonData: any, fileName?: string): STPreset {
    console.log('解析SillyTavern预设:', fileName);
    
    // 解析提示词条目
    const prompts = this.parsePromptItems(jsonData);
    
    // 解析参数
    const params = this.parseParameters(jsonData);
    
    // 生成预设
    const preset: STPreset = {
      id: generateId(),
      name: jsonData.name || fileName?.replace(/\.json$/i, '') || '导入的预设',
      description: jsonData.description || '',
      prompts,
      ...params,
      created_at: Date.now(),
      updated_at: Date.now(),
      version: jsonData.version || '2.0'
    };
    
    console.log(`解析完成: ${preset.name}, ${prompts.length}个提示词条目`);
    return preset;
  }
  
  /**
   * 解析提示词条目（核心功能）
   */
  private static parsePromptItems(jsonData: any): STPromptItem[] {
    const prompts: STPromptItem[] = [];
    
    // 检查是否有prompts数组
    if (!jsonData.prompts || !Array.isArray(jsonData.prompts)) {
      console.warn('预设文件中没有找到prompts数组');
      return prompts;
    }
    
    // 检查是否有prompt_order（推荐的排序方式）
    let promptOrder: any[] = [];
    if (jsonData.prompt_order && Array.isArray(jsonData.prompt_order)) {
      // 查找合适的character_id配置，优先使用100001（默认）
      const orderConfig = jsonData.prompt_order.find(
        (config: any) => config.character_id === 100001
      ) || jsonData.prompt_order[0];
      
      if (orderConfig?.order && Array.isArray(orderConfig.order)) {
        promptOrder = orderConfig.order;
      }
    }
    
    // 如果有排序信息，按排序处理
    if (promptOrder.length > 0) {
      console.log(`使用prompt_order排序，共${promptOrder.length}个条目`);
      
      for (const orderItem of promptOrder) {
        const promptData = jsonData.prompts.find(
          (p: any) => p.identifier === orderItem.identifier
        );
        
        if (promptData) {
          const item = this.parsePromptItem(promptData, orderItem);
          if (item) prompts.push(item);
        } else {
          console.warn(`未找到identifier为${orderItem.identifier}的提示词`);
        }
      }
    } else {
      // 没有排序信息，直接使用prompts数组
      console.log(`直接使用prompts数组，共${jsonData.prompts.length}个条目`);
      
      for (const promptData of jsonData.prompts) {
        const item = this.parsePromptItem(promptData, null);
        if (item) prompts.push(item);
      }
    }
    
    // 按injection_order排序
    prompts.sort((a, b) => a.injection_order - b.injection_order);
    
    return prompts;
  }
  
  /**
   * 解析单个提示词条目
   */
  private static parsePromptItem(promptData: any, orderItem: any): STPromptItem | null {
    if (!promptData.identifier) {
      console.warn('提示词条目缺少identifier');
      return null;
    }
    
    return {
      // 基本信息
      identifier: promptData.identifier,
      name: promptData.name || '未命名提示词',
      content: promptData.content || '',
      enabled: orderItem ? (orderItem.enabled !== false) : (promptData.enabled !== false),
      
      // ⚡ 关键：正确提取注入控制字段
      role: promptData.role || 'system',
      injection_depth: promptData.injection_depth || 0,
      injection_position: promptData.injection_position || 0,
      injection_order: promptData.injection_order || 100,
      
      // 高级控制
      forbid_overrides: promptData.forbid_overrides || false,
      marker: promptData.marker || false,
      system_prompt: promptData.system_prompt || false,
      
      // 扩展字段
      extensions: promptData.extensions || {}
    };
  }
  
  /**
   * 解析预设参数
   */
  private static parseParameters(jsonData: any): Partial<STPreset> {
    const params: Partial<STPreset> = {};
    
    // OpenAI参数
    if (jsonData.temperature !== undefined) params.temperature = Number(jsonData.temperature);
    if (jsonData.max_tokens !== undefined) params.max_tokens = Number(jsonData.max_tokens);
    if (jsonData.top_p !== undefined) params.top_p = Number(jsonData.top_p);
    if (jsonData.frequency_penalty !== undefined) params.frequency_penalty = Number(jsonData.frequency_penalty);
    if (jsonData.presence_penalty !== undefined) params.presence_penalty = Number(jsonData.presence_penalty);
    
    // Gemini参数
    if (jsonData.top_k !== undefined) params.top_k = Number(jsonData.top_k);
    
    // 通用参数
    if (jsonData.stop) params.stop = Array.isArray(jsonData.stop) ? jsonData.stop : [jsonData.stop];
    if (jsonData.stream !== undefined) params.stream = Boolean(jsonData.stream);
    
    // 模型设置
    if (jsonData.chat_completion_source) params.chat_completion_source = jsonData.chat_completion_source;
    if (jsonData.model) params.model = jsonData.model;
    if (jsonData.custom_url) params.custom_url = jsonData.custom_url;
    if (jsonData.reverse_proxy) params.reverse_proxy = jsonData.reverse_proxy;
    
    // 高级功能
    if (jsonData.json_schema) params.json_schema = jsonData.json_schema;
    if (jsonData.response_format) params.response_format = jsonData.response_format;
    
    // 自定义参数
    if (jsonData.custom_include_body) params.custom_include_body = jsonData.custom_include_body;
    if (jsonData.custom_exclude_body) params.custom_exclude_body = jsonData.custom_exclude_body;
    if (jsonData.custom_include_headers) params.custom_include_headers = jsonData.custom_include_headers;
    
    // 扩展
    if (jsonData.extensions) params.extensions = jsonData.extensions;
    
    return params;
  }
}

/**
 * API参数过滤器
 */
export class APIParamProcessor {
  
  /**
   * 根据API类型过滤和转换参数
   */
  static filterForAPI(preset: STPreset, apiType: 'gemini' | 'openai'): Record<string, any> {
    const filter = apiType === 'gemini' ? GEMINI_PARAM_FILTER : OPENAI_PARAM_FILTER;
    const result: Record<string, any> = {};
    
    // 应用默认值
    Object.assign(result, filter.default_values);
    
    // 处理支持的参数
    for (const paramName of filter.supported_params) {
      const presetValue = (preset as any)[paramName];
      
      if (presetValue !== undefined) {
        // 应用参数映射
        const apiParamName = filter.param_mapping[paramName] || paramName;
        
        // 应用参数转换
        const transformFn = filter.param_transforms[paramName];
        const finalValue = transformFn ? transformFn(presetValue) : presetValue;
        
        if (finalValue !== undefined) {
          result[apiParamName] = finalValue;
        }
      }
    }
    
    // 检查必需参数
    for (const requiredParam of filter.required_params) {
      if (result[requiredParam] === undefined) {
        console.warn(`缺少必需参数: ${requiredParam}`);
      }
    }
    
    console.log(`${apiType} API参数过滤结果:`, result);
    return result;
  }
}

/**
 * 预设验证器
 */
export class STPresetValidator {
  
  /**
   * 验证预设的完整性
   */
  static validate(preset: STPreset): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 基本验证
    if (!preset.name?.trim()) {
      errors.push('预设名称不能为空');
    }
    
    if (!preset.prompts || preset.prompts.length === 0) {
      warnings.push('预设中没有提示词条目');
    }
    
    // 验证提示词条目
    for (let index = 0; index < preset.prompts.length; index++) {
      const prompt = preset.prompts[index];
      const prefix = `条目${index + 1}(${prompt.identifier})`;
      
      if (!prompt.identifier?.trim()) {
        errors.push(`${prefix}: identifier不能为空`);
      }
      
      if (!prompt.name?.trim()) {
        warnings.push(`${prefix}: 名称为空`);
      }
      
      if (!prompt.content?.trim() && !prompt.marker) {
        warnings.push(`${prefix}: 内容为空且不是占位符`);
      }
      
      // 验证注入参数
      if (typeof prompt.injection_depth !== 'number' || prompt.injection_depth < 0) {
        errors.push(`${prefix}: injection_depth必须是非负数`);
      }
      
      if (!['system', 'user', 'assistant'].includes(prompt.role)) {
        errors.push(`${prefix}: role必须是system、user或assistant`);
      }
    }
    
    // 检查重复的identifier
    const identifiers = preset.prompts.map(p => p.identifier);
    const duplicates = identifiers.filter((id, index) => identifiers.indexOf(id) !== index);
    if (duplicates.length > 0) {
      errors.push(`重复的identifier: ${duplicates.join(', ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// ===== 便捷函数 =====

/**
 * 从文件导入SillyTavern预设
 */
export async function importSTPresetFromFile(file: File): Promise<STPreset> {
  const text = await file.text();
  const jsonData = JSON.parse(text);
  return STPresetParser.parseFromJSON(jsonData, file.name);
}

/**
 * 调试预设信息
 */
export function debugSTPreset(preset: STPreset): void {
  console.log(`\n=== 预设调试: ${preset.name} ===`);
  console.log(`描述: ${preset.description || '无'}`);
  console.log(`提示词条目数: ${preset.prompts.length}`);
  
  // 按深度分组显示
  const byDepth = new Map<number, STPromptItem[]>();
  for (const prompt of preset.prompts) {
    if (!byDepth.has(prompt.injection_depth)) {
      byDepth.set(prompt.injection_depth, []);
    }
    byDepth.get(prompt.injection_depth)!.push(prompt);
  }
  
  const depths = Array.from(byDepth.keys()).sort((a, b) => a - b);
  for (const depth of depths) {
    console.log(`\n深度 ${depth}:`);
    const prompts = byDepth.get(depth)!;
    
    // 按角色分组
    const byRole = new Map<string, STPromptItem[]>();
    for (const prompt of prompts) {
      if (!byRole.has(prompt.role)) {
        byRole.set(prompt.role, []);
      }
      byRole.get(prompt.role)!.push(prompt);
    }
    
    const roleEntries = Array.from(byRole.entries());
    for (const [role, rolePrompts] of roleEntries) {
      console.log(`  ${role}:`);
      for (const prompt of rolePrompts.sort((a: STPromptItem, b: STPromptItem) => a.injection_order - b.injection_order)) {
        const status = prompt.enabled ? '✓' : '✗';
        const marker = prompt.marker ? ' [占位符]' : '';
        console.log(`    ${status} ${prompt.name} (order: ${prompt.injection_order})${marker}`);
      }
    }
  }
  
  // 显示参数
  console.log('\n=== 生成参数 ===');
  const params = APIParamProcessor.filterForAPI(preset, 'gemini');
  Object.entries(params).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });
}

/**
 * 导出为SillyTavern格式
 */
export function exportToSTFormat(preset: STPreset): any {
  return {
    name: preset.name,
    description: preset.description,
    version: preset.version || '2.0',
    
    // 提示词
    prompts: preset.prompts.map(p => ({
      identifier: p.identifier,
      name: p.name,
      content: p.content,
      role: p.role,
      injection_depth: p.injection_depth,
      injection_position: p.injection_position,
      injection_order: p.injection_order,
      marker: p.marker,
      system_prompt: p.system_prompt,
      forbid_overrides: p.forbid_overrides,
      extensions: p.extensions
    })),
    
    // 排序信息
    prompt_order: [{
      character_id: 100001,
      order: preset.prompts.map(p => ({
        identifier: p.identifier,
        enabled: p.enabled
      }))
    }],
    
    // 参数
    temperature: preset.temperature,
    max_tokens: preset.max_tokens,
    top_p: preset.top_p,
    top_k: preset.top_k,
    frequency_penalty: preset.frequency_penalty,
    presence_penalty: preset.presence_penalty,
    stop: preset.stop,
    stream: preset.stream,
    
    // 模型设置
    chat_completion_source: preset.chat_completion_source,
    model: preset.model,
    custom_url: preset.custom_url,
    reverse_proxy: preset.reverse_proxy,
    
    // 自定义
    custom_include_body: preset.custom_include_body,
    custom_exclude_body: preset.custom_exclude_body,
    custom_include_headers: preset.custom_include_headers,
    
    // 扩展
    extensions: preset.extensions
  };
}
