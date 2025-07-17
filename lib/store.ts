import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings, Message, Conversation } from './types';
import { HarmBlockThreshold } from './types';
import { conversationStorage } from './storage';
import { generateId } from './utils';

// 用户设置存储
interface SettingsState {
  settings: UserSettings;
  uiSettings: {
    showResponseTime: boolean;
    showCharCount: boolean;
    showMessageNumber: boolean;
  };
  updateSettings: (settings: Partial<UserSettings>) => void;
  updateUISettings: (settings: Partial<{
    showResponseTime: boolean;
    showCharCount: boolean;
    showMessageNumber: boolean;
  }>) => void;
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
      uiSettings: {
        showResponseTime: true,
        showCharCount: true,
        showMessageNumber: true,
      },
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      updateUISettings: (newUISettings) =>
        set((state) => {
          // 同时更新localStorage以便消息组件可以直接读取
          if (newUISettings.showResponseTime !== undefined) {
            localStorage.setItem('showResponseTime', String(newUISettings.showResponseTime));
          }
          if (newUISettings.showCharCount !== undefined) {
            localStorage.setItem('showCharCount', String(newUISettings.showCharCount));
          }
          if (newUISettings.showMessageNumber !== undefined) {
            localStorage.setItem('showMessageNumber', String(newUISettings.showMessageNumber));
          }
          
          return {
            uiSettings: { ...state.uiSettings, ...newUISettings },
          };
        }),
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
  conversations: Conversation[];
  messageCounter: number;
  
  // 操作方法
  setCurrentConversation: (id: string | null) => Promise<void>;
  addMessage: (message: Message) => Promise<void>;
  updateMessage: (message: Message) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  startNewConversation: () => void;
  setSystemPrompt: (prompt: string) => void;
  setIsLoading: (loading: boolean) => void;
  loadConversations: () => Promise<void>;
  updateConversationTitle: (title: string) => Promise<void>;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  currentConversationId: null,
  currentMessages: [],
  currentTitle: '新对话',
  isLoading: false,
  systemPrompt: '你是一个友好、乐于助人的AI助手。',
  conversations: [],
  messageCounter: 0,
  
  loadConversations: async () => {
    try {
      const conversations = await conversationStorage.listConversations();
      set({ conversations: conversations.reverse() }); // 最新的对话排在前面
      
      // 如果有对话历史但没有当前对话，自动加载最近的对话
      const { currentConversationId } = get();
      if (conversations.length > 0 && !currentConversationId) {
        const latestConversation = conversations[0]; // 最新的对话
        await get().setCurrentConversation(latestConversation.id);
      }
    } catch (error) {
      console.error('加载对话历史失败:', error);
    }
  },
  
  setCurrentConversation: async (id) => {
    if (!id) {
      set({
        currentConversationId: null,
        currentMessages: [],
        currentTitle: '新对话',
        systemPrompt: '你是一个友好、乐于助人的AI助手。',
        messageCounter: 0
      });
      return;
    }
    
    const conversation = await conversationStorage.getConversation(id);
    if (conversation) {
      // 计算最大的消息编号
      let maxMessageNumber = 0;
      const messagesWithNumbers = conversation.messages.map(msg => {
        // 保留已有的消息编号，或者分配新编号
        if (msg.messageNumber) {
          maxMessageNumber = Math.max(maxMessageNumber, msg.messageNumber);
          return msg;
        }
        // 系统消息不分配楼层号
        if (msg.role === 'system') return msg;
        
        // 为用户和助手消息分配楼层号
        maxMessageNumber++;
        return { ...msg, messageNumber: maxMessageNumber };
      });
      
      set({
        currentConversationId: id,
        currentMessages: messagesWithNumbers,
        currentTitle: conversation.title,
        systemPrompt: conversation.systemPrompt || '你是一个友好、乐于助人的AI助手。',
        messageCounter: maxMessageNumber
      });
    }
  },
  
  addMessage: async (message) => {
    // 检查消息是否已存在（用于流式响应更新）
    const existingIndex = get().currentMessages.findIndex(msg => msg.id === message.id);
    let updatedMessage = { ...message };
    
    // 为非系统消息添加楼层号
    if (message.role !== 'system' && !message.messageNumber) {
      const newCounter = get().messageCounter + 1;
      updatedMessage = { 
        ...updatedMessage, 
        messageNumber: newCounter,
        charCount: message.content.length
      };
      set({ messageCounter: newCounter });
    }
    
    if (existingIndex !== -1) {
      // 如果消息已存在，更新它而不是添加新消息
      const updatedMessages = [...get().currentMessages];
      updatedMessages[existingIndex] = updatedMessage;
      
      set({ currentMessages: updatedMessages });
    } else {
      // 如果是新消息，添加到列表
      set((state) => ({
        currentMessages: [...state.currentMessages, updatedMessage]
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
      : [...currentMessages, updatedMessage]; // 添加新消息
    
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
    
    // 更新对话列表
    get().loadConversations();
  },
  
  // 添加一个专门用于更新消息的方法
  updateMessage: async (message) => {
    const { currentMessages } = get();
    const existingIndex = currentMessages.findIndex(msg => msg.id === message.id);
    
    if (existingIndex === -1) {
      console.warn('尝试更新不存在的消息:', message.id);
      return;
    }
    
    // 保留原有的楼层号和其他元数据
    const existingMessage = currentMessages[existingIndex];
    const updatedMessage = { 
      ...existingMessage, 
      ...message,
      // 确保保留原有楼层号，除非新消息明确指定了楼层号
      messageNumber: message.messageNumber || existingMessage.messageNumber,
      // 更新字符统计
      charCount: message.content ? message.content.length : 0
    };
    
    const updatedMessages = [...currentMessages];
    updatedMessages[existingIndex] = updatedMessage;
    
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

  // 删除消息并重新计算楼层号
  deleteMessage: async (messageId) => {
    const { currentMessages } = get();
    
    // 找到要删除的消息
    const messageIndex = currentMessages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;
    
    // 删除消息
    const updatedMessages = currentMessages.filter(msg => msg.id !== messageId);
    
    // 重新计算非系统消息的楼层号
    let counter = 0;
    const messagesWithUpdatedNumbers = updatedMessages.map(msg => {
      if (msg.role === 'system') return msg;
      
      counter++;
      return {
        ...msg,
        messageNumber: counter
      };
    });
    
    // 更新状态
    set({
      currentMessages: messagesWithUpdatedNumbers,
      messageCounter: counter
    });
    
    // 保存更新后的消息
    const { currentConversationId, currentTitle, systemPrompt } = get();
    if (currentConversationId) {
      try {
        await conversationStorage.saveConversation(
          currentConversationId,
          currentTitle,
          messagesWithUpdatedNumbers,
          systemPrompt
        );
      } catch (error) {
        console.error('保存对话失败:', error);
      }
    }
    
    // 更新对话列表
    get().loadConversations();
  },
  
  startNewConversation: () => {
    set({
      currentConversationId: null,
      currentMessages: [],
      currentTitle: '新对话',
      systemPrompt: '你是一个友好、乐于助人的AI助手。',
      messageCounter: 0
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
  
  updateConversationTitle: async (title) => {
    const { currentConversationId, currentMessages, systemPrompt } = get();
    
    if (currentConversationId) {
      set({ currentTitle: title });
      
      await conversationStorage.saveConversation(
        currentConversationId,
        title,
        currentMessages,
        systemPrompt
      );
      
      // 更新对话列表
      get().loadConversations();
    }
  },
  
  setIsLoading: (loading) => set({ isLoading: loading })
})); 

// 初始化时加载对话历史
if (typeof window !== 'undefined') {
  // 确保在浏览器环境中执行
  setTimeout(() => {
    useChatStore.getState().loadConversations();
  }, 0);
} 