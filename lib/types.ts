// 对话消息类型
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  images?: string[]; // 图片URL或DataURL列表
  messageNumber?: number; // 消息楼层号
  charCount?: number; // 字符数统计
  responseTime?: number; // 响应时间（毫秒）
  characterId?: string; // 角色ID，标记消息是哪个角色发送的
  branchId?: string; // 分支ID，标记消息属于哪个分支
  
  // 回复变体相关
  alternateResponses?: string[]; // 存储所有备选回复
  currentResponseIndex?: number; // 当前显示的回复索引，0是原始回复
  
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

// 安全设置阈值类型
export enum HarmBlockThreshold {
  BLOCK_NONE = "BLOCK_NONE",
  BLOCK_ONLY_HIGH = "BLOCK_ONLY_HIGH",
  BLOCK_MEDIUM_AND_ABOVE = "BLOCK_MEDIUM_AND_ABOVE",
  BLOCK_LOW_AND_ABOVE = "BLOCK_LOW_AND_ABOVE",
  BLOCK_UNSPECIFIED = "BLOCK_UNSPECIFIED"
}

// 用户设置类型
export interface UserSettings {
  apiKey?: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  enableStreaming: boolean;
  maxTokens: number;
  temperature: number;
  topK: number;
  topP: number;
  model: string;
  safetySettings: {
    hateSpeech: HarmBlockThreshold;
    harassment: HarmBlockThreshold;
    sexuallyExplicit: HarmBlockThreshold;
    dangerousContent: HarmBlockThreshold;
  };
  // 上下文窗口相关设置
  contextWindow: number;        // 上下文窗口大小（token数或消息数）
  contextControlMode: 'count' | 'token';  // 上下文控制方式
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
  createdAt: number;
  updatedAt: number;
  // 注意: 系统提示词(systemPrompt)将在未来的预设模块中处理，而不是直接存储在角色信息中
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

// 世界书类型
export interface WorldBook {
  id: string;
  name: string;
  description?: string;
  content: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

// 从gemini.ts导出GeminiParams类型
export type { GeminiParams } from './gemini'; 