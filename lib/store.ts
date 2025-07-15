import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings, Message } from './types';
import { HarmBlockThreshold } from './types';
import { conversationStorage } from './storage';
import { generateId } from './utils';

// 用户设置存储
interface SettingsState {
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: {
        theme: 'system',
        language: 'zh-CN',
        enableStreaming: true,
        maxTokens: 1024,
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        model: 'gemini-2.5-pro',
        safetySettings: {
          hateSpeech: HarmBlockThreshold.BLOCK_NONE,
          harassment: HarmBlockThreshold.BLOCK_NONE,
          sexuallyExplicit: HarmBlockThreshold.BLOCK_NONE,
          dangerousContent: HarmBlockThreshold.BLOCK_NONE,
        },
      },
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
    }),
    {
      name: 'ai-roleplay-settings',
    }
  )
);

// 聊天状态存储 - 只存储当前会话状态，实际数据在IndexedDB中
interface ChatState {
  currentConversationId: string | null;
  currentMessages: Message[];
  currentTitle: string;
  isLoading: boolean;
  systemPrompt: string;
  
  // 操作方法
  setCurrentConversation: (id: string | null) => Promise<void>;
  addMessage: (message: Message) => Promise<void>;
  updateMessage: (message: Message) => Promise<void>;
  startNewConversation: () => void;
  setSystemPrompt: (prompt: string) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  currentConversationId: null,
  currentMessages: [],
  currentTitle: '新对话',
  isLoading: false,
  systemPrompt: '你是一个友好、乐于助人的AI助手。',
  
  setCurrentConversation: async (id) => {
    if (!id) {
      set({
        currentConversationId: null,
        currentMessages: [],
        currentTitle: '新对话',
        systemPrompt: '你是一个友好、乐于助人的AI助手。'
      });
      return;
    }
    
    const conversation = await conversationStorage.getConversation(id);
    if (conversation) {
      set({
        currentConversationId: id,
        currentMessages: conversation.messages,
        currentTitle: conversation.title,
        systemPrompt: conversation.systemPrompt || '你是一个友好、乐于助人的AI助手。'
      });
    }
  },
  
  addMessage: async (message) => {
    // 检查消息是否已存在（用于流式响应更新）
    const existingIndex = get().currentMessages.findIndex(msg => msg.id === message.id);
    
    if (existingIndex !== -1) {
      // 如果消息已存在，更新它而不是添加新消息
      const updatedMessages = [...get().currentMessages];
      updatedMessages[existingIndex] = message;
      
      set({ currentMessages: updatedMessages });
    } else {
      // 如果是新消息，添加到列表
      set((state) => ({
        currentMessages: [...state.currentMessages, message]
      }));
    }
    
    const { currentConversationId, currentMessages, currentTitle, systemPrompt } = get();
    
    // 如果是新对话，创建一个ID
    const conversationId = currentConversationId || generateId();
    
    // 确定标题（如果是新对话，使用用户的第一条消息作为标题基础）
    let title = currentTitle;
    if (!currentConversationId && message.role === 'user') {
      title = message.content.length > 30 
        ? `${message.content.substring(0, 30)}...` 
        : message.content;
    }
    
    // 获取当前消息列表，考虑到可能刚刚更新过
    const messagesToSave = existingIndex !== -1 
      ? get().currentMessages // 使用最新的消息列表
      : [...currentMessages, message]; // 添加新消息
    
    // 保存到IndexedDB
    await conversationStorage.saveConversation(
      conversationId,
      title,
      messagesToSave,
      systemPrompt
    );
    
    // 更新当前ID（如果是新对话）
    if (!currentConversationId) {
      set({ currentConversationId: conversationId, currentTitle: title });
    }
  },
  
  // 添加一个专门用于更新消息的方法
  updateMessage: async (message) => {
    const { currentMessages } = get();
    const existingIndex = currentMessages.findIndex(msg => msg.id === message.id);
    
    if (existingIndex === -1) {
      console.warn('尝试更新不存在的消息:', message.id);
      return;
    }
    
    const updatedMessages = [...currentMessages];
    updatedMessages[existingIndex] = message;
    
    // 立即更新UI状态，不等待保存完成
    set({ currentMessages: updatedMessages });
    
    // 使用防抖方式保存到IndexedDB，避免频繁IO操作
    const { currentConversationId, currentTitle, systemPrompt } = get();
    if (currentConversationId) {
      // 使用setTimeout延迟保存，不阻塞UI更新
      setTimeout(async () => {
        try {
          await conversationStorage.saveConversation(
            currentConversationId,
            currentTitle,
            get().currentMessages, // 获取最新状态
            systemPrompt
          );
        } catch (error) {
          console.error('保存对话失败:', error);
        }
      }, 300); // 300ms延迟，避免频繁保存
    }
  },
  
  startNewConversation: () => {
    set({
      currentConversationId: null,
      currentMessages: [],
      currentTitle: '新对话',
      systemPrompt: '你是一个友好、乐于助人的AI助手。'
    });
  },
  
  setSystemPrompt: (prompt) => {
    set({ systemPrompt: prompt });
    
    const { currentConversationId, currentMessages } = get();
    if (currentConversationId) {
      conversationStorage.saveConversation(
        currentConversationId,
        get().currentTitle,
        currentMessages,
        prompt
      );
    }
  },
  
  setIsLoading: (loading) => set({ isLoading: loading })
})); 