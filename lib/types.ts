// 对话消息类型
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  images?: string[]; // 图片URL或DataURL列表
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
}

// 对话类型
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  systemPrompt?: string;
  lastUpdated: number;
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