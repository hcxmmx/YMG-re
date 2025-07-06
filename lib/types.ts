// 角色配置类型定义
export interface Profile {
  id: string;
  name: string;
  avatar?: string;
  description: string;
  systemPrompt: string;
  exampleDialogs?: Dialog[];
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

// 对话消息类型
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  images?: string[]; // 图片URL或DataURL列表
}

// 对话记录类型
export interface Dialog {
  id: string;
  profileId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

// 用户设置类型
export interface UserSettings {
  apiKey?: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  enableStreaming: boolean;
  maxTokens: number;
  temperature: number;
}

// Gemini API 参数类型
export interface GeminiParams {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}

// 角色卡导入/导出格式
export interface CharacterCardExport {
  version: number;
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_message: string;
  avatar?: string;
  example_dialogs?: {
    user: string;
    assistant: string;
  }[];
} 