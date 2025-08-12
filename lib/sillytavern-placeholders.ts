/**
 * SillyTavern标准占位符类型映射和实现状态
 * 
 * 用于预设系统正确识别和处理SillyTavern的marker条目
 */

export interface SillyTavernPlaceholderInfo {
  identifier: string;        // SillyTavern条目标识符
  name: string;             // 显示名称
  description: string;      // 功能描述
  implemented: boolean;     // 当前项目是否已实现
  moduleSource?: string;    // 数据来源模块（未实现时用于说明）
  category: 'character' | 'world' | 'chat' | 'player' | 'system'; // 数据类别
}

/**
 * 🎯 SillyTavern标准占位符映射表
 * 
 * 根据SillyTavern源码和你的项目现状定义
 */
export const SILLYTAVERN_PLACEHOLDERS: Record<string, SillyTavernPlaceholderInfo> = {
  // ✅ 已实现的占位符
  'chatHistory': {
    identifier: 'chatHistory',
    name: 'Chat History',
    description: '对话历史记录',
    implemented: true,
    category: 'chat'
  },
  
  'worldInfoBefore': {
    identifier: 'worldInfoBefore', 
    name: 'World Info (before)',
    description: '角色描述前的世界书信息',
    implemented: true, // 你的项目有世界书支持
    category: 'world'
  },
  
  'worldInfoAfter': {
    identifier: 'worldInfoAfter',
    name: 'World Info (after)', 
    description: '角色描述后的世界书信息',
    implemented: true, // 你的项目有世界书支持
    category: 'world'
  },
  
  'personaDescription': {
    identifier: 'personaDescription',
    name: 'Persona Description',
    description: '玩家角色信息描述',  
    implemented: true, // 你的项目有玩家系统
    category: 'player'
  },
  
  // ✅ 已实现的占位符（从角色数据获取）
  'charDescription': {
    identifier: 'charDescription',
    name: 'Char Description',
    description: '角色描述信息',
    implemented: true, // ✅ 已在getDynamicContent中实现
    category: 'character'
  },
  
  // ✅ 新增实现的占位符（扩展了Character接口和getDynamicContent）
  'charPersonality': {
    identifier: 'charPersonality', 
    name: 'Char Personality',
    description: '角色性格信息',
    implemented: true, // ✅ 已扩展实现
    category: 'character'  
  },
  
  'scenario': {
    identifier: 'scenario',
    name: 'Scenario',
    description: '场景描述',
    implemented: true, // ✅ 已扩展实现
    category: 'character'
  },
  
  'dialogueExamples': {
    identifier: 'dialogueExamples',
    name: 'Dialogue Examples', 
    description: '对话示例',
    implemented: true, // ✅ 已扩展实现
    category: 'character'
  },
  
  // 🔧 特殊占位符（内容固定或系统生成）
  'jailbreak': {
    identifier: 'jailbreak',
    name: 'Jailbreak',
    description: '越狱提示词（通常不是占位符）',
    implemented: true, // 通常有固定内容，不是真正的占位符
    category: 'system'
  },
  
  'main': {
    identifier: 'main', 
    name: 'Main Prompt',
    description: '主要系统提示词',
    implemented: true, // 通常有固定内容
    category: 'system'
  },
  
  'nsfw': {
    identifier: 'nsfw',
    name: 'NSFW Prompt', 
    description: 'NSFW相关提示词',
    implemented: true, // 通常有固定内容
    category: 'system'
  },
  
  'enhanceDefinitions': {
    identifier: 'enhanceDefinitions',
    name: 'Enhance Definitions',
    description: '增强角色定义', 
    implemented: true, // 通常有固定内容
    category: 'system'
  }
};

/**
 * 🔍 获取占位符实现状态
 */
export function getPlaceholderInfo(identifier: string): SillyTavernPlaceholderInfo | null {
  return SILLYTAVERN_PLACEHOLDERS[identifier] || null;
}

/**
 * 📊 获取已实现的占位符列表
 */
export function getImplementedPlaceholders(): SillyTavernPlaceholderInfo[] {
  return Object.values(SILLYTAVERN_PLACEHOLDERS).filter(p => p.implemented);
}

/**
 * ⏳ 获取未实现的占位符列表
 */
export function getUnimplementedPlaceholders(): SillyTavernPlaceholderInfo[] {
  return Object.values(SILLYTAVERN_PLACEHOLDERS).filter(p => !p.implemented);
}

/**
 * 🏷️ 按类别获取占位符
 */
export function getPlaceholdersByCategory(category: SillyTavernPlaceholderInfo['category']): SillyTavernPlaceholderInfo[] {
  return Object.values(SILLYTAVERN_PLACEHOLDERS).filter(p => p.category === category);
}

/**
 * 🎯 判断条目是否为标准SillyTavern占位符
 */
export function isStandardPlaceholder(identifier: string): boolean {
  return identifier in SILLYTAVERN_PLACEHOLDERS;
}

/**
 * 📋 生成占位符实现状态报告 
 */
export function generatePlaceholderReport(): {
  total: number;
  implemented: number;
  unimplemented: number;
  byCategory: Record<string, { total: number; implemented: number }>;
} {
  const all = Object.values(SILLYTAVERN_PLACEHOLDERS);
  const implemented = all.filter(p => p.implemented);
  const unimplemented = all.filter(p => !p.implemented);
  
  const byCategory: Record<string, { total: number; implemented: number }> = {};
  
  for (const placeholder of all) {
    if (!byCategory[placeholder.category]) {
      byCategory[placeholder.category] = { total: 0, implemented: 0 };
    }
    byCategory[placeholder.category].total++;
    if (placeholder.implemented) {
      byCategory[placeholder.category].implemented++;
    }
  }
  
  return {
    total: all.length,
    implemented: implemented.length,
    unimplemented: unimplemented.length,
    byCategory
  };
}
