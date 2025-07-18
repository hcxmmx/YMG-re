import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings, Message, Conversation, Character } from './types';
import { HarmBlockThreshold } from './types';
import { conversationStorage, characterStorage } from './storage';
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
  currentCharacter: Character | null;

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
  setCurrentCharacter: (character: Character | null) => void;
  startCharacterChat: (characterId: string) => Promise<boolean>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      currentConversationId: null,
      currentMessages: [],
      currentTitle: '新对话',
      isLoading: false,
      systemPrompt: '你是一个友好、乐于助人的AI助手。',
      conversations: [],
      messageCounter: 0,
      currentCharacter: null,

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
            messageCounter: 0,
            currentCharacter: null
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
            messageCounter: maxMessageNumber,
            // 不改变当前角色状态
            currentCharacter: get().currentCharacter
          });
        }
      },

      addMessage: async (message) => {
        // 检查消息是否已存在（用于流式响应更新）
        const existingIndex = get().currentMessages.findIndex(msg => msg.id === message.id);

        // 检查是否存在相同内容的消息（防止重复添加）
        const duplicateContentIndex = get().currentMessages.findIndex(msg =>
          msg.role === message.role &&
          msg.content === message.content &&
          msg.id !== message.id
        );

        // 如果找到内容相同的消息，避免重复添加
        if (duplicateContentIndex !== -1 && message.role === 'assistant') {
          console.warn('避免添加重复内容的消息');
          return;
        }

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
          messageCounter: 0,
          currentCharacter: null // 重置当前角色
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

      setIsLoading: (loading) => set({ isLoading: loading }),

      // 设置当前角色
      setCurrentCharacter: (character) => {
        set({ currentCharacter: character });

        // 注释: 系统提示词将在未来的预设模块中处理
        // 此处仅设置角色信息，不设置系统提示词
      },

      // 开始与特定角色的聊天
      startCharacterChat: async (characterId) => {
        try {
          // 加载角色信息
          const character = await characterStorage.getCharacter(characterId);
          if (!character) {
            console.error('未找到指定角色:', characterId);
            return false;
          }
          
          console.log('开始角色聊天:', character.name);
          console.log('角色可选开场白数量:', character.alternateGreetings?.length || 0);
          
          // 开始新对话
          get().startNewConversation();
          
          // 设置当前角色
          get().setCurrentCharacter(character);
          
          // 设置聊天标题为角色名称
          set({ currentTitle: character.name });
          
          // 创建一个新的对话ID
          const conversationId = generateId();
          set({ currentConversationId: conversationId });
          
          // 注释: 系统提示词将在未来的预设模块中处理
          
          // 准备消息列表
          const messages: Message[] = [];
          
          // 如果有开场白，添加作为助手的第一条消息
          if (character.firstMessage) {
            const messageId = generateId();
            
            const assistantMessage: Message = {
              id: messageId,
              role: 'assistant',
              content: character.firstMessage,
              timestamp: new Date(),
              messageNumber: 1,
              charCount: character.firstMessage.length
            };
            
            messages.push(assistantMessage);
            set({
              currentMessages: messages,
              messageCounter: 1
            });
          }
          
          // 直接保存到IndexedDB
          console.log('保存角色对话到IndexedDB, ID:', conversationId);
          try {
            await conversationStorage.saveConversation(
              conversationId,
              character.name,
              messages,
              get().systemPrompt
            );
            console.log('保存成功');
          } catch (error) {
            console.error('保存对话失败:', error);
          }
          
          // 更新对话列表
          await get().loadConversations();
          console.log('对话列表已更新');
          
          return true;
        } catch (error) {
          console.error('开始角色聊天失败:', error);
          return false;
        }
      }
    }),
    {
      name: 'ai-roleplay-chat-state',
      // 只持久化这些关键状态，其他数据从IndexedDB加载
      partialize: (state) => ({
        currentConversationId: state.currentConversationId,
        currentCharacter: state.currentCharacter ? {
          id: state.currentCharacter.id,
          name: state.currentCharacter.name
        } : null,
      }),
      // 加载持久化数据后的处理
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('持久化状态恢复:', {
            currentConversationId: state.currentConversationId,
            currentCharacter: state.currentCharacter
          });
          
          // 立即加载对话列表
          state.loadConversations().then(() => {
            console.log('对话列表加载完成');
            
            // 如果有持久化的对话ID，加载该对话
            if (state.currentConversationId) {
              console.log('尝试加载对话:', state.currentConversationId);
              state.setCurrentConversation(state.currentConversationId)
                .then(() => console.log('对话加载成功'))
                .catch(err => console.error('加载对话失败:', err));
            }
            
            // 如果有持久化的角色ID但没有完整角色数据，加载角色
            const currentCharacter = state.currentCharacter;
            if (currentCharacter && currentCharacter.id) {
              console.log('尝试加载角色:', currentCharacter.id);
              characterStorage.getCharacter(currentCharacter.id)
                .then(character => {
                  if (character) {
                    console.log('角色加载成功:', character.name);
                    state.setCurrentCharacter(character);
                  } else {
                    console.warn('未找到角色:', currentCharacter.id);
                  }
                })
                .catch(error => console.error('加载角色失败:', error));
            }
          });
        }
      }
    }
  )
);

// 初始化时加载对话历史
// 不再需要这段代码，因为persist中间件会自动处理 