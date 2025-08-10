// 对话消息类型
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  images?: string[]; // 图片URL或DataURL列表（旧版兼容）
  files?: {
    data: string;  // DataURL或文本内容
    type: string;  // MIME类型
    name?: string; // 文件名
  }[];
  messageNumber?: number; // 消息楼层号
  charCount?: number; // 字符数统计
  responseTime?: number; // 响应时间（毫秒）
  characterId?: string; // 角色ID，标记消息是哪个角色发送的
  branchId?: string; // 分支ID，标记消息属于哪个分支
  
  // 回复变体相关
  alternateResponses?: string[]; // 存储所有备选回复
  currentResponseIndex?: number; // 当前显示的回复索引，0是原始回复
  originalContent?: string;      // 原始回复内容，用于变体切换时恢复原始回复
  
  // API错误信息
  errorDetails?: {
    code: number;        // HTTP状态码或API错误代码
    message: string;     // 错误消息
    details?: any;       // 错误详细信息
    timestamp: string;   // 错误发生时间
  };
}

// 分支类型
export interface Branch {
  id: string;
  name: string;
  parentMessageId: string; // 分支创建点的消息ID
  createdAt: number;
}



// 字体系列选项
export type FontFamily = 
  | 'system'
  | 'sans'
  | 'serif'
  | 'mono'
  | 'song'      // 宋体
  | 'hei'       // 黑体
  | 'kai'       // 楷体
  | 'fangsong'  // 仿宋
  | 'yahei'     // 微软雅黑
  | 'pingfang'  // 苹方字体
  | 'sourcehans'; // 思源黑体

// 用户设置类型
export interface UserSettings {
  apiKey?: string;
  theme: string;
  language: string;
  enableStreaming: boolean;
  maxTokens: number;
  temperature: number;
  topK: number;
  topP: number;
  model: string;
  // 上下文窗口相关设置
  contextWindow: number;        // 上下文窗口大小（token数或消息数）
  contextControlMode: 'count' | 'token';  // 上下文控制方式
  // 字体相关设置
  fontFamily: FontFamily; // 字体系列
  fontSize: number; // 全局字体大小（百分比，100 = 100%）
  chatFontSize: number; // 聊天消息字体大小（百分比，100 = 100%）
  
  // ===== 新增API配置选项 =====
  // API类型选择
  apiType: 'gemini' | 'openai';
  
  // OpenAI兼容端点配置
  openaiApiType?: string; // 使用OPENAI_API_TYPES的键名
  openaiBaseURL?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  openaiMaxTokens?: number;
  openaiTemperature?: number;
  openaiTopP?: number;
  openaiFrequencyPenalty?: number;
  openaiPresencePenalty?: number;
  openaiStream?: boolean;
  openaiCustomHeaders?: Record<string, string>;
  openaiCustomParams?: Record<string, any>;
}

// 对话类型
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  systemPrompt?: string;
  lastUpdated: number;
  branches?: Branch[]; // 对话的所有分支
  currentBranchId?: string | null; // 当前活动的分支ID
  characterId?: string; // 对话关联的角色ID
}

// 角色预设类型
export interface Preset {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  firstMessage?: string;
  avatar?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  regexScriptIds?: string[]; // 关联的正则表达式脚本ID列表
  regexFolderIds?: string[]; // 关联的正则表达式文件夹ID列表
}

// 提示词预设条目
export interface PromptPresetItem {
  identifier: string;    // 唯一标识符
  name: string;          // 名称
  content: string;       // 内容
  enabled: boolean;      // 是否启用
  isPlaceholder?: boolean;  // 是否为动态占位条目
  placeholderType?: string;  // 占位类型
  implemented?: boolean;     // 占位类型是否已实现
}

// 提示词预设
export interface PromptPreset {
  id: string;           // 唯一ID
  name: string;         // 预设名称
  description: string;  // 预设描述
  // Gemini模型参数
  temperature?: number;
  maxTokens?: number;
  topK?: number;
  topP?: number;
  // 提示词数组
  prompts: PromptPresetItem[];
  createdAt?: number;   // 创建时间
  updatedAt?: number;   // 更新时间
}

// 占位条目类型信息
export interface PlaceholderInfo {
  type: string;
  implemented: boolean;
  description: string;
}

// 角色类型
export interface Character {
  id: string;
  name: string;
  description?: string;
  firstMessage?: string;  // 角色的开场白
  alternateGreetings?: string[];  // 角色的可选开场白
  avatar?: string;        // 角色头像
  tags?: string[];        // 角色标签
  createdAt?: number;
  updatedAt?: number;
  worldBookIds?: string[]; // 关联的世界书ID列表
  regexScriptIds?: string[]; // 关联的正则表达式脚本ID列表
  // 注意: 系统提示词(systemPrompt)将在未来的预设模块中处理，而不是直接存储在角色信息中
}

export interface CharacterImportResult {
  characterId: string | null;
  importedWorldBooks?: string[] | null;
  importedRegexScripts?: string[] | null;  // 添加导入的正则表达式脚本信息
  error?: string;
}

// 玩家类型
export interface Player {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  createdAt: number;
  updatedAt: number;
}

// 正则表达式文件夹类型
export interface RegexFolder {
  id: string;                 // 文件夹ID
  name: string;               // 文件夹名称
  description?: string;       // 文件夹描述（可选）
  parentId?: string;          // 父文件夹ID（可选，支持嵌套）
  disabled: boolean;          // 是否禁用（隔离）文件夹
  type: 'preset' | 'character'; // 文件夹类型：预设文件夹或角色专属文件夹
  scope?: 'global' | 'local';   // 预设文件夹作用域：全局(所有预设启用) 或 局部(仅关联预设启用)
  createdAt: number;          // 创建时间
  updatedAt: number;          // 更新时间
  presetIds?: string[];       // 关联的预设ID列表
}

// 世界书类型
export interface WorldBook {
  id: string;                 // 唯一ID
  name: string;               // 世界书名称
  description?: string;       // 世界书描述
  entries: WorldBookEntry[];  // 世界书条目
  settings: WorldBookSettings; // 世界书全局设置
  createdAt: number;          // 创建时间
  updatedAt: number;          // 更新时间
  characterIds: string[];     // 关联的角色ID列表（修改为多对多关系）
  enabled: boolean;           // 是否启用
}

export interface WorldBookEntry {
  id: string;                 // 条目ID
  title: string;              // 条目标题/备注
  content: string;            // 条目内容（将插入提示词）
  
  // 激活设置
  strategy: 'constant' | 'selective' | 'vectorized';  // 激活策略（常量/选择性/向量化）
  enabled: boolean;           // 是否启用
  order: number;              // 插入顺序（优先级）
  position: 'before' | 'after'; // 插入位置（角色描述前/后）
  
  // 选择性激活的关键字
  primaryKeys: string[];      // 主要关键字
  secondaryKeys: string[];    // 次要关键字（可选过滤器）
  selectiveLogic: 'andAny' | 'andAll' | 'notAny' | 'notAll';  // 选择逻辑
  
  // 正则选项
  caseSensitive?: boolean;    // 区分大小写
  matchWholeWords?: boolean;  // 全词匹配
  
  // 递归设置
  excludeRecursion: boolean;  // 不可递归（不被其他条目激活）
  preventRecursion: boolean;  // 防止进一步递归
  delayUntilRecursion: boolean; // 延迟到递归
  recursionLevel: number;     // 递归等级
  
  // 时效功能
  probability: number;        // 激活概率（0-100）
  sticky: number;             // 黏性（保持激活的消息数）
  cooldown: number;           // 冷却（不能激活的消息数）
  delay: number;              // 延迟（要求最少消息数才能激活）
  
  // 扫描设置
  scanDepth?: number;         // 条目级扫描深度（覆盖全局设置）

  // 状态追踪（不存储，运行时使用）
  _activated?: boolean;       // 是否被激活
  _stickyRemaining?: number;  // 剩余黏性时间
  _cooldownRemaining?: number; // 剩余冷却时间
}

export interface WorldBookSettings {
  scanDepth: number;          // 默认扫描深度
  includeNames: boolean;      // 是否包含角色名称
  maxRecursionSteps: number;  // 最大递归步骤
  minActivations: number;     // 最小激活数量
  maxDepth: number;           // 最大深度
  caseSensitive: boolean;     // 默认区分大小写
  matchWholeWords: boolean;   // 默认全词匹配
}

// 从gemini.ts导出GeminiParams类型
export type { GeminiParams } from './gemini'; 

// API密钥相关类型
export interface ApiKey {
  id: string;           // 唯一ID
  name: string;         // 密钥名称
  key: string;          // API密钥值
  enabled: boolean;     // 是否启用
  priority: number;     // 优先级（数字越小优先级越高）
  usageCount: number;   // 使用次数
  lastUsed?: number;    // 最后使用时间戳
  createdAt: number;    // 创建时间戳
}

export interface ApiKeySettings {
  rotationStrategy: 'sequential' | 'random' | 'least-used'; // 轮询策略
  activeKeyId: string | null;                             // 当前活动密钥ID（手动设置）
  switchTiming: 'every-call' | 'threshold';               // 切换时机：每次调用 | 达到阈值
  switchThreshold: number;                               // 切换阈值（使用次数）
  rotationEnabled: boolean;                              // 是否启用轮询系统
} 