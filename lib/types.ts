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

// 从gemini.ts导出GeminiParams类型
export type { GeminiParams } from './gemini'; 