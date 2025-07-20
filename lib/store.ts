import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings, Message, Conversation, Character, Branch } from './types';
import { HarmBlockThreshold } from './types';
import { conversationStorage, characterStorage, initializeMainBranch } from './storage';
import { generateId } from './utils';
import { createJSONStorage } from 'zustand/middleware';
import { promptPresetStorage } from './storage';
import { PromptPreset } from './types';

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
        // 上下文窗口设置
        contextWindow: 0, // 默认0表示不限制
        contextControlMode: 'token', // 默认使用token计数方式
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
  lastSelectedCharacterConversation: Record<string, string>; // 记录每个角色ID对应的最后选择的对话ID
  
  // 分支相关状态
  branches: Branch[];
  currentBranchId: string | null;

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
  getCharacterConversations: (characterId: string) => Conversation[];
  createNewCharacterChat: (characterId: string) => Promise<string | null>;
  getLastSelectedCharacterConversation: (characterId: string) => string | null;
  deleteConversation: (id: string) => Promise<void>; // 删除对话
  renameConversation: (id: string, newTitle: string) => Promise<void>; // 重命名对话
  
  // 分支相关方法
  loadBranches: () => Promise<void>; // 加载当前对话的分支
  createBranch: (name: string, messageId: string) => Promise<string | null>; // 创建分支
  switchBranch: (branchId: string) => Promise<void>; // 切换分支
  renameBranch: (branchId: string, newName: string) => Promise<void>; // 重命名分支
  deleteBranch: (branchId: string) => Promise<void>; // 删除分支
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
      lastSelectedCharacterConversation: {}, // 初始化
      
      // 分支相关状态初始化
      branches: [],
      currentBranchId: null,

      loadConversations: async () => {
        try {
          const conversations = await conversationStorage.listConversations();
          
          // 确保数据符合Conversation接口要求
          const typedConversations: Conversation[] = conversations.map(conv => ({
            ...conv,
            // 确保currentBranchId类型一致
            currentBranchId: conv.currentBranchId || null
          }));
          
          set({ conversations: typedConversations.reverse() }); // 最新的对话排在前面
          
          console.log('对话列表加载完成');

          // 如果有对话历史但没有当前对话，自动加载最近的对话
          const { currentConversationId } = get();
          if (typedConversations.length > 0 && !currentConversationId) {
            const latestConversation = typedConversations[0]; // 最新的对话
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
            currentCharacter: null,
            branches: [],
            currentBranchId: null
          });
          return;
        }

        try {
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

            // 确定该对话关联的角色ID
            let characterId = null;
            for (const msg of conversation.messages) {
              if (msg.role === 'assistant' && msg.characterId) {
                characterId = msg.characterId;
                break;
              }
            }

            // 如果找到角色ID，更新该角色的最后选择对话
            if (characterId) {
              set(state => ({
                lastSelectedCharacterConversation: {
                  ...state.lastSelectedCharacterConversation,
                  [characterId]: id
                }
              }));
              console.log(`已更新角色 ${characterId} 的最后选择对话: ${id}`);
            }

            // 确保对话有分支信息
            let updatedBranches = conversation.branches || [];
            let updatedCurrentBranchId = conversation.currentBranchId;
            
            // 如果没有分支，初始化主分支
            if (!updatedBranches || updatedBranches.length === 0) {
              try {
                const mainBranchId = await initializeMainBranch(id);
                
                // 重新获取对话信息，以获取更新后的分支信息
                const updatedConversation = await conversationStorage.getConversation(id);
                if (updatedConversation) {
                  updatedBranches = updatedConversation.branches || [];
                  updatedCurrentBranchId = updatedConversation.currentBranchId;
                  
                  // 更新消息的分支ID
                  messagesWithNumbers.forEach(msg => {
                    if (!msg.branchId) {
                      msg.branchId = mainBranchId;
                    }
                  });
                }
              } catch (error) {
                console.error('初始化主分支失败:', error);
              }
            }

            // 只显示当前分支的消息
            const currentBranchMessages = messagesWithNumbers.filter(msg => 
              !msg.branchId || msg.branchId === updatedCurrentBranchId
            );

            set({
              currentConversationId: id,
              currentMessages: currentBranchMessages,
              currentTitle: conversation.title,
              systemPrompt: conversation.systemPrompt || '你是一个友好、乐于助人的AI助手。',
              messageCounter: maxMessageNumber,
              currentCharacter: get().currentCharacter, // 不改变当前角色状态
              branches: updatedBranches,
              currentBranchId: updatedCurrentBranchId
            });
          }
        } catch (error) {
          console.error('设置当前对话失败:', error);
        }
      },

      addMessage: async (message) => {
        // 获取当前分支ID
        const { currentBranchId } = get();
        
        // 确保消息有分支ID
        const messageWithBranch = {
          ...message,
          branchId: currentBranchId || undefined
        };
        
        // 检查消息是否已存在（用于流式响应更新）
        const existingIndex = get().currentMessages.findIndex(msg => msg.id === messageWithBranch.id);

        // 检查是否存在相同内容的消息（防止重复添加）
        const duplicateContentIndex = get().currentMessages.findIndex(msg =>
          msg.role === messageWithBranch.role &&
          msg.content === messageWithBranch.content &&
          msg.id !== messageWithBranch.id
        );

        // 如果找到内容相同的消息，避免重复添加
        if (duplicateContentIndex !== -1 && messageWithBranch.role === 'assistant') {
          console.warn('避免添加重复内容的消息');
          return;
        }

        let updatedMessage = { ...messageWithBranch };

        // 为非系统消息添加楼层号
        if (messageWithBranch.role !== 'system' && !messageWithBranch.messageNumber) {
          const newCounter = get().messageCounter + 1;
          updatedMessage = {
            ...updatedMessage,
            messageNumber: newCounter,
            charCount: messageWithBranch.content.length
          };
          set({ messageCounter: newCounter });
        }

        // 获取当前对话的所有消息（包括所有分支）
        const { currentConversationId, currentMessages, currentTitle, systemPrompt, branches } = get();
        
        // 如果是新对话，创建一个ID
        const conversationId = currentConversationId || generateId();

        // 确定标题（如果是新对话，使用用户的第一条消息作为标题基础）
        let title = currentTitle;
        if (!currentConversationId && messageWithBranch.role === 'user') {
          title = messageWithBranch.content.length > 30
            ? `${messageWithBranch.content.substring(0, 30)}...`
            : messageWithBranch.content;
        }

        // 标记是否是新对话
        const isNewConversation = !currentConversationId;

        if (existingIndex !== -1) {
          // 如果消息已存在，更新它而不是添加新消息
          const updatedMessages = [...get().currentMessages];
          updatedMessages[existingIndex] = updatedMessage;

          set({ currentMessages: updatedMessages });
          
          // 更新IndexedDB中的消息
          if (currentConversationId) {
            // 获取完整对话信息
            const conversation = await conversationStorage.getConversation(currentConversationId);
            if (conversation) {
              // 更新对应消息
              const allMessages = conversation.messages.map(msg => 
                msg.id === updatedMessage.id ? updatedMessage : msg
              );
              
              // 保存更新后的对话
              await conversationStorage.saveConversation(
                conversationId,
                title,
                allMessages,
                systemPrompt,
                branches,
                currentBranchId
              );
            }
          }
        } else {
          // 如果是新消息，添加到列表
          set((state) => ({
            currentMessages: [...state.currentMessages, updatedMessage]
          }));
          
          // 更新IndexedDB中的消息
          if (currentConversationId) {
            // 获取完整对话信息
            const conversation = await conversationStorage.getConversation(currentConversationId);
            if (conversation) {
              // 添加新消息到所有消息列表
              const allMessages = [...conversation.messages, updatedMessage];
              
              // 保存更新后的对话
              await conversationStorage.saveConversation(
                conversationId,
                title,
                allMessages,
                systemPrompt,
                branches,
                currentBranchId
              );
            }
          } else {
            // 新对话，直接保存
            await conversationStorage.saveConversation(
              conversationId,
              title,
              [updatedMessage],
              systemPrompt,
              [], // 新对话不需要设置分支，后面会初始化
              null // 新对话不设置分支ID，后面会初始化
            );
          }
        }

        // 如果是新对话，设置当前对话ID和标题
        if (isNewConversation) {
          set({ 
            currentConversationId: conversationId, 
            currentTitle: title 
          });
          
          console.log('创建新对话并初始化主分支');
          try {
            // 初始化主分支
            const mainBranchId = await initializeMainBranch(conversationId);
            
            // 重新获取对话信息，确保分支数据是最新的
            const updatedConversation = await conversationStorage.getConversation(conversationId);
            if (!updatedConversation) throw new Error('无法获取新创建的对话');
            
            // 更新消息的分支ID
            const updatedMessages = updatedConversation.messages.map(msg => {
              if (!msg.branchId) {
                return { ...msg, branchId: mainBranchId };
              }
              return msg;
            });
            
            // 保存更新后的消息
            await conversationStorage.saveConversation(
              conversationId,
              title,
              updatedMessages,
              systemPrompt,
              updatedConversation.branches || [],
              mainBranchId
            );
            
            // 更新状态
            set({ 
              currentMessages: updatedMessages.filter(msg => msg.branchId === mainBranchId),
              branches: updatedConversation.branches || [],
              currentBranchId: mainBranchId
            });
            
            console.log(`已初始化主分支，ID: ${mainBranchId}`);
          } catch (error) {
            console.error('初始化主分支失败:', error);
          }
        }

        // 确保对话列表是最新的
        await get().loadConversations();
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
        console.log('开始新对话，重置所有状态');
        
        // 完全重置所有状态，确保没有上一个对话的残留数据
        set({
          currentConversationId: null,
          currentMessages: [],
          currentTitle: '新对话',
          systemPrompt: '你是一个友好、乐于助人的AI助手。',
          messageCounter: 0,
          currentCharacter: null, // 重置当前角色
          branches: [], // 清空分支列表
          currentBranchId: null // 重置当前分支ID
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

          // 检查是否已有该角色的对话存在
          const conversations = await conversationStorage.listConversations();
          // 查找该角色的最近对话，通过标题匹配（不是最好的方式，但目前没有更好的方式关联）
          const existingConversation = conversations.find(conv => 
            conv.title === character.name &&
            conv.messages.length > 0 && 
            conv.messages.some(msg => msg.role === 'assistant')
          );

          if (existingConversation) {
            console.log('发现该角色的已有对话:', existingConversation.id);
            
            // 如果有已有对话，恢复该对话而不是创建新对话
            // 设置当前角色
            set({
              currentCharacter: character,
              currentConversationId: existingConversation.id,
              currentTitle: existingConversation.title,
              systemPrompt: existingConversation.systemPrompt || '你是一个友好、乐于助人的AI助手。'
            });
            
            // 加载对话消息
            await get().setCurrentConversation(existingConversation.id);
            
            console.log('已恢复与角色的已有对话');
            return true;
          }
          
          // 如果没有已有对话，创建新对话
          console.log('没有找到与该角色的已有对话，创建新对话');
          
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
              charCount: character.firstMessage.length,
              characterId: character.id // 添加角色ID
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
      },

      getCharacterConversations: (characterId) => {
        const { conversations } = get();
        // 检查所有对话，找出与指定角色相关的对话
        return conversations.filter(conv => {
          // 方法1：检查消息中的characterId
          const hasCharacterId = conv.messages.some(msg => 
            msg.role === 'assistant' && msg.characterId === characterId
          );
          
          // 方法2：通过对话标题匹配（向后兼容没有characterId的旧对话）
          const characterName = get().conversations.find(c => 
            c.messages.some(m => m.characterId === characterId)
          )?.title;
          
          const matchesTitle = characterName && conv.title === characterName;
          
          return hasCharacterId || matchesTitle;
        });
      },

      createNewCharacterChat: async (characterId) => {
        try {
          const character = await characterStorage.getCharacter(characterId);
          if (!character) {
            console.error('未找到指定角色:', characterId);
            return null;
          }

          // 重置状态，创建新对话
          set({
            currentConversationId: null,
            currentMessages: [],
            currentTitle: character.name,
            currentCharacter: character,
            systemPrompt: '你是一个友好、乐于助人的AI助手。',
            branches: [],
            currentBranchId: null
          });

          const conversationId = generateId();
          const messages: Message[] = [];

          if (character.firstMessage) {
            const messageId = generateId();
            const assistantMessage: Message = {
              id: messageId,
              role: 'assistant',
              content: character.firstMessage,
              timestamp: new Date(),
              messageNumber: 1,
              charCount: character.firstMessage.length,
              characterId: characterId // 添加角色ID
            };
            messages.push(assistantMessage);
            set({
              currentMessages: messages,
              messageCounter: 1
            });
          }

          // 设置当前对话ID
          set({
            currentConversationId: conversationId
          });

          // 保存对话到数据库，不指定分支信息
          await conversationStorage.saveConversation(
            conversationId,
            character.name,
            messages,
            '你是一个友好、乐于助人的AI助手。'
          );

          // 初始化主分支
          try {
            const mainBranchId = await initializeMainBranch(conversationId);
            console.log(`角色对话已初始化主分支, ID: ${mainBranchId}`);
            
            // 重新获取对话信息，确保分支数据是最新的
            const updatedConversation = await conversationStorage.getConversation(conversationId);
            if (!updatedConversation) throw new Error('无法获取新创建的角色对话');
            
            // 更新消息的分支ID
            const updatedMessages = updatedConversation.messages.map(msg => {
              if (!msg.branchId) {
                return { ...msg, branchId: mainBranchId };
              }
              return msg;
            });
            
            // 保存更新后的消息
            await conversationStorage.saveConversation(
              conversationId,
              character.name,
              updatedMessages,
              '你是一个友好、乐于助人的AI助手。',
              updatedConversation.branches || [],
              mainBranchId
            );
            
            // 更新状态
            set({ 
              currentMessages: updatedMessages,
              branches: updatedConversation.branches || [],
              currentBranchId: mainBranchId
            });
          } catch (error) {
            console.error('初始化角色对话主分支失败:', error);
          }

          // 更新对话列表和最后选择的对话
          get().loadConversations();
          set(state => ({
            lastSelectedCharacterConversation: {
              ...state.lastSelectedCharacterConversation,
              [characterId]: conversationId
            }
          }));

          return conversationId;
        } catch (error) {
          console.error('创建新角色聊天失败:', error);
          return null;
        }
      },

      getLastSelectedCharacterConversation: (characterId) => {
        return get().lastSelectedCharacterConversation[characterId] || null;
      },

      deleteConversation: async (id) => {
        try {
          // 检查当前是否正在查看要删除的对话
          const { currentConversationId } = get();
          
          // 从数据库中删除对话
          await conversationStorage.deleteConversation(id);
          
          // 更新对话列表
          await get().loadConversations();
          
          // 如果删除的是当前对话，重置当前对话状态或加载其他对话
          if (currentConversationId === id) {
            const { conversations } = get();
            if (conversations.length > 0) {
              // 如果还有其他对话，加载第一个对话
              await get().setCurrentConversation(conversations[0].id);
            } else {
              // 如果没有其他对话，重置为新对话
              get().startNewConversation();
            }
          }
          
          // 如果被删除的对话是某个角色的最后选择对话，也需要清除该记录
          const { lastSelectedCharacterConversation } = get();
          const updatedLastSelected = { ...lastSelectedCharacterConversation };
          
          // 检查每个角色的最后选择对话
          Object.entries(updatedLastSelected).forEach(([characterId, conversationId]) => {
            if (conversationId === id) {
              delete updatedLastSelected[characterId];
            }
          });
          
          // 更新状态
          set({ lastSelectedCharacterConversation: updatedLastSelected });
        } catch (error) {
          console.error('删除对话失败:', error);
          throw error;
        }
      },

      renameConversation: async (id, newTitle) => {
        try {
          // 获取要重命名的对话
          const conversation = await conversationStorage.getConversation(id);
          if (!conversation) {
            throw new Error('对话不存在');
          }
          
          // 更新对话标题
          await conversationStorage.saveConversation(
            id,
            newTitle,
            conversation.messages,
            conversation.systemPrompt
          );
          
          // 如果是当前对话，更新当前标题
          if (get().currentConversationId === id) {
            set({ currentTitle: newTitle });
          }
          
          // 重新加载对话列表
          await get().loadConversations();
        } catch (error) {
          console.error('重命名对话失败:', error);
          throw error;
        }
      },

      // 分支相关方法
      loadBranches: async () => {
        const { currentConversationId } = get();
        if (!currentConversationId) return;

        try {
          const branches = await conversationStorage.getBranches(currentConversationId);
          
          // 获取当前分支ID
          let currentBranchId = get().currentBranchId;
          
          // 如果没有当前分支ID但有分支，使用第一个分支作为当前分支
          if (!currentBranchId && branches.length > 0) {
            currentBranchId = branches[0].id;
          }
          
          set({ 
            branches, 
            currentBranchId 
          });
          
          console.log(`已加载 ${branches.length} 个分支，当前分支ID: ${currentBranchId}`);
        } catch (error) {
          console.error('加载分支失败:', error);
        }
      },
      
      createBranch: async (name, messageId) => {
        const { currentConversationId, currentMessages } = get();
        if (!currentConversationId) return null;

        try {
          // 确保分支名称不为空
          const branchName = name.trim() || `分支 ${get().branches.length + 1}`;
          
          // 创建分支
          const branchId = await conversationStorage.createBranch(
            currentConversationId,
            branchName,
            messageId
          );
          
          // 获取最新的对话信息，包括所有分支的消息
          const conversation = await conversationStorage.getConversation(currentConversationId);
          if (!conversation) throw new Error('获取对话失败');
          
          // 过滤出新分支的消息
          const branchMessages = conversation.messages.filter(msg => msg.branchId === branchId);
          
          // 更新状态
          set({
            currentBranchId: branchId,
            currentMessages: branchMessages,
            branches: conversation.branches || []
          });
          
          console.log(`已创建分支 "${branchName}"，ID: ${branchId}，消息数量: ${branchMessages.length}`);
          
          return branchId;
        } catch (error) {
          console.error('创建分支失败:', error);
          return null;
        }
      },
      
      switchBranch: async (branchId) => {
        const { currentConversationId } = get();
        if (!currentConversationId) return;
        
        try {
          // 切换分支，获取分支消息
          const branchMessages = await conversationStorage.switchBranch(
            currentConversationId,
            branchId
          );
          
          // 获取最新的分支列表
          const conversation = await conversationStorage.getConversation(currentConversationId);
          if (!conversation) throw new Error('获取对话失败');
          
          // 更新当前分支ID和消息
          set({
            currentBranchId: branchId,
            currentMessages: branchMessages,
            branches: conversation.branches || []
          });
          
          console.log(`已切换到分支ID: ${branchId}，消息数量: ${branchMessages.length}`);
        } catch (error) {
          console.error('切换分支失败:', error);
        }
      },

      renameBranch: async (branchId, newName) => {
        const { currentConversationId } = get();
        if (!currentConversationId) return;

        try {
          await conversationStorage.renameBranch(currentConversationId, branchId, newName);
          await get().loadBranches(); // 重新加载分支以获取更新后的名称
          console.log(`分支 "${newName}" 重命名成功`);
        } catch (error) {
          console.error('重命名分支失败:', error);
        }
      },

      deleteBranch: async (branchId) => {
        const { currentConversationId } = get();
        if (!currentConversationId) return;

        try {
          await conversationStorage.deleteBranch(currentConversationId, branchId);
          await get().loadBranches(); // 重新加载分支以获取更新后的列表
          console.log(`分支 "${branchId}" 删除成功`);
        } catch (error) {
          console.error('删除分支失败:', error);
        }
      }
    }),
    {
      name: 'ai-roleplay-chat-state',
      // 只持久化这些关键状态，其他数据从IndexedDB加载
      partialize: (state) => {
        // 只保留当前对话ID和角色ID等关键状态
        // 完整的消息和其他大数据全部存入IndexedDB
        return {
          currentConversationId: state.currentConversationId,
          currentCharacter: state.currentCharacter ? {
            id: state.currentCharacter.id,
            name: state.currentCharacter.name
          } : null,
          // 保留systemPrompt用于对话恢复
          systemPrompt: state.systemPrompt,
          // 仅保存最后一条消息的ID，不保存完整消息内容
          lastMessageId: state.currentMessages.length > 0 ? 
                        state.currentMessages[state.currentMessages.length - 1].id : null,
          currentTitle: state.currentTitle,
          lastSelectedCharacterConversation: state.lastSelectedCharacterConversation,
        };
      },
      // 加载持久化数据后的处理
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('持久化状态恢复:', {
            currentConversationId: state.currentConversationId,
            currentCharacter: state.currentCharacter,
            systemPrompt: state.systemPrompt
          });
          
          // 立即加载对话列表
          setTimeout(() => {
            state.loadConversations().then(() => {
              console.log('对话列表加载完成');
              
              // 如果有持久化的对话ID，验证数据库中是否存在
              if (state.currentConversationId) {
                console.log('尝试验证对话:', state.currentConversationId);
                conversationStorage.getConversation(state.currentConversationId)
                  .then(conversation => {
                    if (conversation) {
                      // 数据库中存在此对话，则加载
                      console.log('数据库中存在对话，加载对话:', state.currentConversationId);
                      state.setCurrentConversation(state.currentConversationId)
                        .then(() => console.log('对话加载成功'))
                        .catch(err => console.error('加载对话失败:', err));
                    } else {
                      console.warn('对话在数据库中不存在，但本地存储有记录:', state.currentConversationId);
                      // 对于不存在的对话，创建新对话但不保留任何消息
                      // 这样避免localStorage和IndexedDB不一致
                      state.startNewConversation();
                    }
                  })
                  .catch(err => console.error('验证对话失败:', err));
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
          }, 0);
        }
      },
      // 使用localStorage而非默认的sessionStorage
      storage: createJSONStorage(() => localStorage)
    }
  )
);

// 提示词预设状态管理
interface PromptPresetState {
  presets: PromptPreset[];
  currentPresetId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // 操作方法
  loadPresets: () => Promise<void>;
  getPreset: (id: string) => PromptPreset | undefined;
  savePreset: (preset: PromptPreset) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;
  applyPreset: (id: string) => Promise<void>;
  importPresetFromFile: (file: File) => Promise<PromptPreset | null>;
  exportPresetToFile: (id: string) => Promise<void>;
  setCurrentPresetId: (id: string | null) => void;
}

export const usePromptPresetStore = create<PromptPresetState>()(
  persist(
    (set, get) => ({
      presets: [],
      currentPresetId: null,
      isLoading: false,
      error: null,
      
      loadPresets: async () => {
        try {
          set({ isLoading: true, error: null });
          const presets = await promptPresetStorage.listPromptPresets();
          set({ presets, isLoading: false });
        } catch (error) {
          console.error("加载预设失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "加载预设失败" 
          });
        }
      },
      
      getPreset: (id: string) => {
        return get().presets.find(preset => preset.id === id);
      },
      
      savePreset: async (preset: PromptPreset) => {
        try {
          set({ isLoading: true, error: null });
          const savedPreset = await promptPresetStorage.savePromptPreset(preset);
          
          set(state => ({
            presets: state.presets.some(p => p.id === preset.id)
              ? state.presets.map(p => p.id === preset.id ? savedPreset : p)
              : [...state.presets, savedPreset],
            isLoading: false
          }));
        } catch (error) {
          console.error("保存预设失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "保存预设失败" 
          });
        }
      },
      
      deletePreset: async (id: string) => {
        try {
          set({ isLoading: true, error: null });
          await promptPresetStorage.deletePromptPreset(id);
          set(state => ({
            presets: state.presets.filter(p => p.id !== id),
            currentPresetId: state.currentPresetId === id ? null : state.currentPresetId,
            isLoading: false
          }));
        } catch (error) {
          console.error("删除预设失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "删除预设失败" 
          });
        }
      },
      
      // 应用预设 - 更新系统提示词和模型参数
      applyPreset: async (id: string) => {
        const preset = get().presets.find(p => p.id === id);
        if (!preset) return;
        
        try {
          set({ isLoading: true, error: null });
          
          // 构建系统提示词
          const systemPromptParts: string[] = [];
          
          // 处理已启用的提示词
          for (const promptItem of preset.prompts) {
            if (!promptItem.enabled) continue;
            
            if (promptItem.isPlaceholder) {
              // 如果是占位条目且已实现，生成动态内容
              if (promptItem.implemented) {
                const dynamicContent = await getDynamicContent(promptItem.placeholderType || "");
                if (dynamicContent) {
                  systemPromptParts.push(dynamicContent);
                }
              }
              // 未实现的占位条目暂时忽略
            } else {
              // 普通静态内容
              systemPromptParts.push(promptItem.content);
            }
          }
          
          const systemPrompt = systemPromptParts.join('\n\n');
          
          // 准备所有更新的参数 - 创建完整的更新对象，而不是逐个更新
          const modelParams = {
            temperature: preset.temperature ?? 0.7,
            maxTokens: preset.maxTokens ?? 1024,
            topK: preset.topK ?? 40,
            topP: preset.topP ?? 0.95,
          };
          
          // 批量应用所有更改，确保状态更新是原子操作
          // 创建一个Promise队列，确保所有操作按顺序执行
          await Promise.all([
            // 1. 更新聊天状态中的系统提示词
            new Promise<void>((resolve) => {
              const chatStore = useChatStore.getState();
              chatStore.setSystemPrompt(systemPrompt);
              console.log("系统提示词已更新:", systemPrompt.substring(0, 100) + "...");
              resolve();
            }),
            
            // 2. 更新模型参数
            new Promise<void>((resolve) => {
              const settingsStore = useSettingsStore.getState();
              settingsStore.updateSettings(modelParams);
              console.log("模型参数已更新:", modelParams);
              resolve();
            })
          ]);
          
          // 仅在所有操作完成后，更新当前预设ID
          set({ currentPresetId: id, isLoading: false });
          console.log("预设应用完成，ID:", id);
          
          // 添加延迟，确保状态完全更新
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              resolve();
            }, 100); // 添加短暂延迟，确保状态更新完全生效
          });
        } catch (error) {
          console.error("应用预设失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "应用预设失败" 
          });
        }
      },
      
      // 导入预设文件
      importPresetFromFile: async (file: File) => {
        try {
          set({ isLoading: true, error: null });
          
          // 读取文件内容
          const text = await file.text();
          const json = JSON.parse(text);
          
          // 导入预设
          const preset = await promptPresetStorage.importPromptPresetFromJSON(json);
          
          // 更新状态
          set(state => ({
            presets: [...state.presets, preset],
            isLoading: false
          }));
          
          return preset;
        } catch (error) {
          console.error("导入预设失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "导入预设失败" 
          });
          return null;
        }
      },
      
      // 导出预设到文件
      exportPresetToFile: async (id: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const preset = get().presets.find(p => p.id === id);
          if (!preset) {
            throw new Error("预设不存在");
          }
          
          const blob = await promptPresetStorage.exportPromptPreset(id);
          const url = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = `${preset.name || 'preset'}.json`;
          a.click();
          
          URL.revokeObjectURL(url);
          set({ isLoading: false });
        } catch (error) {
          console.error("导出预设失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "导出预设失败" 
          });
        }
      },
      
      // 设置当前预设ID
      setCurrentPresetId: (id: string | null) => {
        set({ currentPresetId: id });
      },
    }),
    {
      name: 'ai-roleplay-prompt-presets',
      // 只持久化部分状态
      partialize: (state) => ({ 
        currentPresetId: state.currentPresetId 
      }),
    }
  )
);

// 获取动态内容的辅助函数
async function getDynamicContent(placeholderType: string): Promise<string | null> {
  const chatStore = useChatStore.getState();
  
  switch (placeholderType) {
    case 'chatHistory':
      // 格式化对话历史
      return formatChatHistory(chatStore.currentMessages);
      
    case 'charDescription':
      // 获取角色描述
      return chatStore.currentCharacter?.description || null;
      
    case 'jailbreak':
      // 特殊指令（如果需要）
      return null;
      
    // 其他类型暂不处理
    default:
      return null;
  }
}

// 格式化对话历史
function formatChatHistory(messages: Message[]): string | null {
  if (!messages || messages.length === 0) {
    return null;
  }
  
  // 过滤掉系统消息，只保留用户和助手消息
  const chatMessages = messages.filter(msg => msg.role !== 'system');
  
  // 限制对话历史长度，防止超出上下文窗口
  const recentMessages = chatMessages.slice(-10);
  
  // 格式化为对话形式
  const formattedChat = recentMessages.map(msg => {
    const role = msg.role === 'user' ? '用户' : '助手';
    return `${role}: ${msg.content}`;
  }).join('\n\n');
  
  return formattedChat;
}

// 初始化时加载对话历史
// 不再需要这段代码，因为persist中间件会自动处理 