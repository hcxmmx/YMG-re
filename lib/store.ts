import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings, Message, Conversation, Character, Branch } from './types';
import { HarmBlockThreshold } from './types';
import { conversationStorage, characterStorage, initializeMainBranch } from './storage';
import { generateId } from './utils';
import { openDB } from 'idb';
import { createJSONStorage } from 'zustand/middleware';
import { promptPresetStorage } from './storage';
import { PromptPreset } from './types';
import { playerStorage } from './storage';
import { Player } from './types';
import { worldBookStorage } from './storage';
import { WorldBook, WorldBookEntry } from './types';
import { RegexScript, importRegexScript, exportRegexScript } from './regexUtils';
import { regexStorage } from './storage';
import { devtools } from 'zustand/middleware';

// 用户设置存储
interface SettingsState {
  settings: UserSettings;
  uiSettings: {
    showResponseTime: boolean;
    showCharCount: boolean;
    showMessageNumber: boolean;
    enableQuoteHighlight: boolean;  // 启用引号高亮
    quoteHighlightColor: string;    // 引号高亮颜色
  };
  updateSettings: (settings: Partial<UserSettings>) => void;
  updateUISettings: (settings: Partial<{
    showResponseTime: boolean;
    showCharCount: boolean;
    showMessageNumber: boolean;
    enableQuoteHighlight: boolean;  // 启用引号高亮
    quoteHighlightColor: string;    // 引号高亮颜色
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
        enableQuoteHighlight: true,     // 默认启用引号高亮
        quoteHighlightColor: '#8b5cf6', // 默认使用紫色
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
          if (newUISettings.enableQuoteHighlight !== undefined) {
            localStorage.setItem('enableQuoteHighlight', String(newUISettings.enableQuoteHighlight));
          }
          if (newUISettings.quoteHighlightColor !== undefined) {
            localStorage.setItem('quoteHighlightColor', newUISettings.quoteHighlightColor);
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

            // 查找并设置当前角色
            let updatedCharacter = null;
            if (characterId) {
              try {
                // 获取角色信息
                const character = await characterStorage.getCharacter(characterId);
                if (character) {
                  updatedCharacter = character;
                  console.log(`根据对话ID ${id} 设置当前角色: ${character.name}`);
                }
              } catch (error) {
                console.error('加载角色信息失败:', error);
              }
              
              // 无论加载角色是否成功，都更新该角色的最后选择对话
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
              currentCharacter: updatedCharacter, // 使用从对话中确定的角色
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

          // 检查是否已有该角色的最后选择的对话
          const lastSelectedConversationId = get().lastSelectedCharacterConversation[characterId];
          let existingConversation = null;
          
          if (lastSelectedConversationId) {
            // 先从对话列表中查找
            const conversations = get().conversations;
            existingConversation = conversations.find(conv => conv.id === lastSelectedConversationId);
            
            // 如果在内存中找不到，从数据库加载
            if (!existingConversation) {
              try {
                const db = await openDB('ai-roleplay-app', 1);
                existingConversation = await db.get('conversations', lastSelectedConversationId);
              } catch (error) {
                console.error('从数据库加载对话失败:', error);
              }
            }
          }
          
          // 如果找不到最后选择的对话，则创建新对话
          if (!existingConversation) {
            // 创建新对话
            console.log('没有找到与该角色的最后选择的对话，创建新对话');
            const newConversationId = await get().createNewCharacterChat(characterId);
            return newConversationId !== null;
          } else {
            // 使用已有对话
            console.log('恢复角色的最后选择对话:', existingConversation.id);
            
            // 直接加载对话，让 setCurrentConversation 方法处理角色设置
            await get().setCurrentConversation(existingConversation.id);
            
            // 更新最后选择的对话ID (这部分现在由 setCurrentConversation 处理)
            console.log('已恢复与角色的已有对话');
            return true;
          }
        } catch (error) {
          console.error('开始角色聊天失败:', error);
          return false;
        }
      },

      getCharacterConversations: (characterId) => {
        const { conversations } = get();
        // 只检查消息中的characterId，确保严格匹配
        return conversations.filter(conv => {
          return conv.messages.some(msg => 
            msg.role === 'assistant' && msg.characterId === characterId
          );
        });
      },

      // 创建新角色聊天
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
              characterId: characterId // 添加角色ID，确保聊天记录与角色ID严格关联
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
          
          // 将该聊天设为角色的最后选择对话
          const updatedLastSelected = { 
            ...get().lastSelectedCharacterConversation,
            [characterId]: conversationId
          };
          set({ lastSelectedCharacterConversation: updatedLastSelected });

          // 保存对话到数据库
          await conversationStorage.saveConversation(
            conversationId,
            character.name,
            messages,
            '你是一个友好、乐于助人的AI助手。'
          );
          
          // 更新对话列表
          await get().loadConversations();

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
          
          let systemPrompt = systemPromptParts.join('\n\n');
          
          // 应用正则表达式处理提示词 (类型4=提示词)
          try {
            const { applyRegexToMessage } = useRegexStore.getState();
            const currentPlayer = usePlayerStore.getState().getCurrentPlayer();
            const playerName = currentPlayer?.name || "玩家";
            // 尝试获取当前角色，如果没有则使用默认名称
            const chatStore = useChatStore.getState();
            const characterName = chatStore.currentCharacter?.name || "AI";
            
            systemPrompt = applyRegexToMessage(systemPrompt, playerName, characterName, 0, 4);
          } catch (error) {
            console.error("应用正则表达式处理提示词时出错:", error);
          }
          
          // 准备所有更新的参数 - 创建完整的更新对象，而不是逐个更新
          const modelParams = {
            temperature: preset.temperature ?? 0.7,
            maxTokens: preset.maxTokens ?? 1024,
            topK: preset.topK ?? 40,
            topP: preset.topP ?? 0.95,
          };
          
          // 批量应用所有更改，确保状态更新是原子操作
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
          
          // 重要修复：确保当前会话的系统提示词也被保存到IndexedDB
          const chatStore = useChatStore.getState();
          const { currentConversationId, currentMessages, currentTitle } = chatStore;
          
          // 如果有当前会话，同步更新到IndexedDB
          if (currentConversationId) {
            // 获取当前会话的分支信息
            const conversation = await conversationStorage.getConversation(currentConversationId);
            if (conversation) {
              console.log("同步更新当前会话的系统提示词到IndexedDB");
              await conversationStorage.saveConversation(
                currentConversationId,
                currentTitle,
                currentMessages,
                systemPrompt, // 使用新的系统提示词
                conversation.branches || [],
                conversation.currentBranchId
              );
            }
          }
          
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
          
          // 导入预设，传递文件名
          const preset = await promptPresetStorage.importPromptPresetFromJSON(json, file.name);
          
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

// 玩家状态管理
interface PlayerState {
  players: Player[];
  currentPlayerId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // 操作方法
  loadPlayers: () => Promise<void>;
  getPlayer: (id: string) => Player | undefined;
  savePlayer: (player: Player) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  setCurrentPlayer: (id: string) => Promise<void>;
  getCurrentPlayer: () => Player | null;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      players: [],
      currentPlayerId: null,
      isLoading: false,
      error: null,
      
      loadPlayers: async () => {
        try {
          set({ isLoading: true, error: null });
          const players = await playerStorage.listPlayers();
          set({ players, isLoading: false });
          
          // 如果有玩家但没有当前玩家，设置第一个为当前玩家
          if (players.length > 0 && !get().currentPlayerId) {
            get().setCurrentPlayer(players[0].id);
          }
        } catch (error) {
          console.error("加载玩家失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "加载玩家失败" 
          });
        }
      },
      
      getPlayer: (id: string) => {
        return get().players.find(player => player.id === id);
      },
      
      getCurrentPlayer: () => {
        const { currentPlayerId, players } = get();
        if (!currentPlayerId) return null;
        return players.find(player => player.id === currentPlayerId) || null;
      },
      
      savePlayer: async (player: Player) => {
        try {
          set({ isLoading: true, error: null });
          await playerStorage.savePlayer(player);
          
          set(state => ({
            players: state.players.some(p => p.id === player.id)
              ? state.players.map(p => p.id === player.id ? player : p)
              : [...state.players, player],
            currentPlayerId: player.id, // 保存后设为当前玩家
            isLoading: false
          }));
        } catch (error) {
          console.error("保存玩家失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "保存玩家失败" 
          });
        }
      },
      
      setCurrentPlayer: async (id: string) => {
        const player = get().getPlayer(id);
        if (player) {
          // 更新时间戳使其成为最近使用的玩家
          await playerStorage.savePlayer({
            ...player
          });
          set({ currentPlayerId: id });
        }
      },
      
      deletePlayer: async (id: string) => {
        try {
          set({ isLoading: true, error: null });
          await playerStorage.deletePlayer(id);
          
          set(state => ({
            players: state.players.filter(p => p.id !== id),
            // 如果删除的是当前玩家，重置当前玩家
            currentPlayerId: state.currentPlayerId === id ? 
              (state.players.length > 1 ? 
                state.players.find(p => p.id !== id)?.id || null : null) : 
              state.currentPlayerId,
            isLoading: false
          }));
        } catch (error) {
          console.error("删除玩家失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "删除玩家失败" 
          });
        }
      }
    }),
    {
      name: 'ai-roleplay-player-state',
      partialize: (state) => ({ 
        currentPlayerId: state.currentPlayerId 
      }),
      storage: createJSONStorage(() => localStorage)
    }
  )
);

// 世界书状态管理接口
interface WorldBookState {
  worldBooks: WorldBook[];
  currentWorldBookId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // 操作方法
  loadWorldBooks: () => Promise<void>;
  getWorldBook: (id: string) => WorldBook | undefined;
  saveWorldBook: (worldBook: Partial<WorldBook>) => Promise<WorldBook>;
  deleteWorldBook: (id: string) => Promise<void>;
  importWorldBookFromFile: (file: File) => Promise<WorldBook | null>;
  exportWorldBookToFile: (id: string) => Promise<void>;
  setCurrentWorldBookId: (id: string | null) => void;
  toggleWorldBookEnabled: (id: string) => Promise<void>;
  
  // 条目操作
  addEntry: (worldBookId: string, entry: Partial<WorldBookEntry>) => Promise<WorldBookEntry>;
  updateEntry: (worldBookId: string, entry: WorldBookEntry) => Promise<WorldBookEntry>;
  deleteEntry: (worldBookId: string, entryId: string) => Promise<void>;
  toggleEntryEnabled: (worldBookId: string, entryId: string) => Promise<void>;
  
  // 与角色关联
  linkToCharacter: (worldBookId: string, characterId: string) => Promise<void>;
  unlinkFromCharacter: (worldBookId: string, characterId: string) => Promise<void>;
  getWorldBookForCharacter: (characterId: string) => Promise<WorldBook | undefined>;
  getLinkedCharacters: (worldBookId: string) => Promise<Character[]>;
  getWorldBooksForCharacter: (characterId: string) => Promise<WorldBook[]>;
}

// 世界书状态管理Store
export const useWorldBookStore = create<WorldBookState>()(
  persist(
    (set, get) => ({
      worldBooks: [],
      currentWorldBookId: null,
      isLoading: false,
      error: null,
      
      loadWorldBooks: async () => {
        try {
          set({ isLoading: true, error: null });
          const worldBooks = await worldBookStorage.listWorldBooks();
          set({ worldBooks, isLoading: false });
        } catch (error) {
          console.error("加载世界书失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "加载世界书失败" 
          });
        }
      },
      
      getWorldBook: (id: string) => {
        return get().worldBooks.find(wb => wb.id === id);
      },
      
      saveWorldBook: async (worldBook: Partial<WorldBook>) => {
        try {
          set({ isLoading: true, error: null });
          
          // 准备完整的世界书对象
          const completeWorldBook = {
            id: worldBook.id || generateId(),
            name: worldBook.name || '新世界书',
            description: worldBook.description || '',
            entries: worldBook.entries || [],
            settings: worldBook.settings || {
              scanDepth: 2,
              includeNames: true,
              maxRecursionSteps: 3,
              minActivations: 0,
              maxDepth: 10,
              caseSensitive: false,
              matchWholeWords: true
            },
            characterIds: worldBook.characterIds || [],
            enabled: worldBook.enabled !== undefined ? worldBook.enabled : true,
            createdAt: worldBook.createdAt || Date.now(),
            updatedAt: Date.now()
          };
          
          // 保存世界书
          const savedWorldBook = await worldBookStorage.saveWorldBook(completeWorldBook);
          
          // 更新状态
          set(state => ({
            worldBooks: state.worldBooks.some(wb => wb.id === savedWorldBook.id)
              ? state.worldBooks.map(wb => wb.id === savedWorldBook.id ? savedWorldBook : wb)
              : [...state.worldBooks, savedWorldBook],
            isLoading: false
          }));
          
          return savedWorldBook;
        } catch (error) {
          console.error("保存世界书失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "保存世界书失败" 
          });
          throw error;
        }
      },
      
      deleteWorldBook: async (id: string) => {
        try {
          set({ isLoading: true, error: null });
          await worldBookStorage.deleteWorldBook(id);
          
          set(state => ({
            worldBooks: state.worldBooks.filter(wb => wb.id !== id),
            currentWorldBookId: state.currentWorldBookId === id ? null : state.currentWorldBookId,
            isLoading: false
          }));
        } catch (error) {
          console.error("删除世界书失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "删除世界书失败" 
          });
        }
      },
      
      toggleWorldBookEnabled: async (id: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // 调用存储函数切换启用状态
          const updatedWorldBook = await worldBookStorage.toggleWorldBookEnabled(id);
          
          // 更新状态
          if (updatedWorldBook) {
            set(state => ({
              worldBooks: state.worldBooks.map(wb => 
                wb.id === id ? updatedWorldBook : wb
              ),
              isLoading: false
            }));
          } else {
            throw new Error("世界书不存在");
          }
        } catch (error) {
          console.error("切换世界书启用状态失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "切换世界书启用状态失败" 
          });
        }
      },
      
      importWorldBookFromFile: async (file: File) => {
        try {
          set({ isLoading: true, error: null });
          
          // 读取文件内容
          const text = await file.text();
          const json = JSON.parse(text);
          
          // 导入世界书
          const worldBook = await worldBookStorage.importWorldBookFromJSON(json, file.name);
          
          // 更新状态
          set(state => ({
            worldBooks: [...state.worldBooks, worldBook],
            isLoading: false
          }));
          
          return worldBook;
        } catch (error) {
          console.error("导入世界书失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "导入世界书失败" 
          });
          return null;
        }
      },
      
      exportWorldBookToFile: async (id: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // 获取世界书
          const worldBook = get().worldBooks.find(wb => wb.id === id);
          if (!worldBook) {
            throw new Error('世界书不存在');
          }
          
          // 导出为JSON
          const jsonData = await worldBookStorage.exportWorldBookToJSON(id);
          
          // 创建并下载文件
          const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${worldBook.name}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          set({ isLoading: false });
        } catch (error) {
          console.error("导出世界书失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "导出世界书失败" 
          });
        }
      },
      
      setCurrentWorldBookId: (id: string | null) => {
        set({ currentWorldBookId: id });
      },
      
      // 条目操作
      addEntry: async (worldBookId: string, entry: Partial<WorldBookEntry>) => {
        try {
          set({ isLoading: true, error: null });
          
          // 添加条目
          const newEntry = await worldBookStorage.addEntry(worldBookId, entry);
          
          // 更新状态
          set(state => {
            const updatedWorldBooks = state.worldBooks.map(wb => {
              if (wb.id === worldBookId) {
                return {
                  ...wb,
                  entries: [...wb.entries, newEntry]
                };
              }
              return wb;
            });
            
            return {
              worldBooks: updatedWorldBooks,
              isLoading: false
            };
          });
          
          return newEntry;
        } catch (error) {
          console.error("添加条目失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "添加条目失败" 
          });
          throw error;
        }
      },
      
      updateEntry: async (worldBookId: string, entry: WorldBookEntry) => {
        try {
          set({ isLoading: true, error: null });
          
          // 更新条目
          const updatedEntry = await worldBookStorage.updateEntry(worldBookId, entry);
          
          // 更新状态
          set(state => {
            const updatedWorldBooks = state.worldBooks.map(wb => {
              if (wb.id === worldBookId) {
                return {
                  ...wb,
                  entries: wb.entries.map(e => e.id === entry.id ? updatedEntry : e)
                };
              }
              return wb;
            });
            
            return {
              worldBooks: updatedWorldBooks,
              isLoading: false
            };
          });
          
          return updatedEntry;
        } catch (error) {
          console.error("更新条目失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "更新条目失败" 
          });
          throw error;
        }
      },
      
      toggleEntryEnabled: async (worldBookId: string, entryId: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // 切换条目启用状态
          const updatedEntry = await worldBookStorage.toggleEntryEnabled(worldBookId, entryId);
          
          // 更新状态
          if (updatedEntry) {
            set(state => {
              const updatedWorldBooks = state.worldBooks.map(wb => {
                if (wb.id === worldBookId) {
                  return {
                    ...wb,
                    entries: wb.entries.map(e => e.id === entryId ? updatedEntry : e)
                  };
                }
                return wb;
              });
              
              return {
                worldBooks: updatedWorldBooks,
                isLoading: false
              };
            });
          }
        } catch (error) {
          console.error("切换条目启用状态失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "切换条目启用状态失败" 
          });
        }
      },
      
      deleteEntry: async (worldBookId: string, entryId: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // 删除条目
          await worldBookStorage.deleteEntry(worldBookId, entryId);
          
          // 更新状态
          set(state => {
            const updatedWorldBooks = state.worldBooks.map(wb => {
              if (wb.id === worldBookId) {
                return {
                  ...wb,
                  entries: wb.entries.filter(e => e.id !== entryId)
                };
              }
              return wb;
            });
            
            return {
              worldBooks: updatedWorldBooks,
              isLoading: false
            };
          });
        } catch (error) {
          console.error("删除条目失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "删除条目失败" 
          });
        }
      },
      
      // 与角色关联
      linkToCharacter: async (worldBookId: string, characterId: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // 关联到角色
          await worldBookStorage.linkToCharacter(worldBookId, characterId);
          
          // 重新加载世界书以获取最新状态
          const updatedWorldBook = await worldBookStorage.getWorldBook(worldBookId);
          if (updatedWorldBook) {
            set(state => ({
              worldBooks: state.worldBooks.map(wb => wb.id === worldBookId ? updatedWorldBook : wb),
              isLoading: false
            }));
          }
        } catch (error) {
          console.error("关联世界书到角色失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "关联世界书到角色失败" 
          });
        }
      },
      
      unlinkFromCharacter: async (worldBookId: string, characterId: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // 解除关联
          await worldBookStorage.unlinkFromCharacter(worldBookId, characterId);
          
          // 重新加载世界书以获取最新状态
          const updatedWorldBook = await worldBookStorage.getWorldBook(worldBookId);
          if (updatedWorldBook) {
            set(state => ({
              worldBooks: state.worldBooks.map(wb => wb.id === worldBookId ? updatedWorldBook : wb),
              isLoading: false
            }));
          }
        } catch (error) {
          console.error("解除世界书与角色的关联失败:", error);
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : "解除世界书与角色的关联失败" 
          });
        }
      },
      
      getWorldBookForCharacter: async (characterId: string) => {
        try {
          return await worldBookStorage.getWorldBookForCharacter(characterId);
        } catch (error) {
          console.error("获取角色关联的世界书失败:", error);
          return undefined;
        }
      },
      
      getWorldBooksForCharacter: async (characterId: string) => {
        try {
          return await worldBookStorage.getWorldBooksForCharacter(characterId);
        } catch (error) {
          console.error("获取角色关联的所有世界书失败:", error);
          return [];
        }
      },
      
      getLinkedCharacters: async (worldBookId: string) => {
        try {
          const worldBook = get().worldBooks.find(wb => wb.id === worldBookId);
          if (!worldBook || !worldBook.characterIds || worldBook.characterIds.length === 0) {
            return [];
          }
          
          // 使用characterStorage获取关联的角色
          const characters: Character[] = [];
          for (const characterId of worldBook.characterIds) {
            try {
              const character = await characterStorage.getCharacter(characterId);
              if (character) {
                characters.push(character);
              }
            } catch (error) {
              console.error(`获取角色 ${characterId} 失败:`, error);
            }
          }
          
          return characters;
        } catch (error) {
          console.error("获取关联角色失败:", error);
          return [];
        }
      }
    }),
    {
      name: 'ai-roleplay-worldbook-state',
      partialize: (state) => ({ 
        currentWorldBookId: state.currentWorldBookId 
      }),
      storage: createJSONStorage(() => localStorage)
    }
  )
);

// 获取动态内容的辅助函数
async function getDynamicContent(placeholderType: string): Promise<string | null> {
  const chatStore = useChatStore.getState();
  const playerStore = usePlayerStore.getState();
  
  switch (placeholderType) {
    case 'chatHistory':
      // 格式化对话历史
      return formatChatHistory(chatStore.currentMessages);
      
    case 'charDescription':
      // 获取角色描述
      return chatStore.currentCharacter?.description || null;
      
    case 'personaDescription':
      // 获取玩家角色信息
      const currentPlayer = playerStore.getCurrentPlayer();
      if (currentPlayer) {
        // 生成格式化的玩家描述
        let playerInfo = `玩家信息：\n`;
        playerInfo += `名称：${currentPlayer.name}\n`;
        if (currentPlayer.description) {
          playerInfo += `描述：${currentPlayer.description}\n`;
        }
        return playerInfo;
      }
      return null;
    
    case 'worldInfo': {
      // 根据位置获取世界书内容
      const currentCharacter = chatStore.currentCharacter;
      if (!currentCharacter) return null;
      
      // 导入世界书工具函数
      const { generateWorldInfoBefore, generateWorldInfoAfter } = await import('./worldBookUtils');
      
      // 获取当前消息以扩展类型
      const extendedMessages = chatStore.currentMessages.map(msg => ({
        ...msg,
        name: msg.role === 'user' 
          ? playerStore.getCurrentPlayer()?.name || '用户' 
          : currentCharacter.name
      }));
      
      // 获取世界书
      const worldBooks = await worldBookStorage.getWorldBooksForCharacter(currentCharacter.id);
      if (worldBooks.length === 0) return null;
      
      // 使用第一个关联的世界书
      const worldBook = worldBooks[0];
      
      // 获取worldInfoBefore内容
      const beforeContent = await generateWorldInfoBefore({
        worldBook,
        chatMessages: extendedMessages
      });
      
      // 获取worldInfoAfter内容
      const afterContent = await generateWorldInfoAfter({
        worldBook,
        chatMessages: extendedMessages
      });
      
      // 合并内容（如果调用方未指定位置，则返回所有内容）
      return [beforeContent, afterContent].filter(Boolean).join('\n\n') || null;
    }
    
    // 特定位置的世界书内容
    case 'worldInfoBefore': {
      const currentCharacter = chatStore.currentCharacter;
      if (!currentCharacter) return null;
      
      const { generateWorldInfoBefore } = await import('./worldBookUtils');
      
      const extendedMessages = chatStore.currentMessages.map(msg => ({
        ...msg,
        name: msg.role === 'user' 
          ? playerStore.getCurrentPlayer()?.name || '用户' 
          : currentCharacter.name
      }));
      
      // 获取世界书
      const worldBooks = await worldBookStorage.getWorldBooksForCharacter(currentCharacter.id);
      if (worldBooks.length === 0) return null;
      
      // 使用第一个关联的世界书
      const worldBook = worldBooks[0];
      
      return await generateWorldInfoBefore({
        worldBook,
        chatMessages: extendedMessages
      });
    }
    
    case 'worldInfoAfter': {
      const currentCharacter = chatStore.currentCharacter;
      if (!currentCharacter) return null;
      
      const { generateWorldInfoAfter } = await import('./worldBookUtils');
      
      const extendedMessages = chatStore.currentMessages.map(msg => ({
        ...msg,
        name: msg.role === 'user' 
          ? playerStore.getCurrentPlayer()?.name || '用户' 
          : currentCharacter.name
      }));
      
      // 获取世界书
      const worldBooks = await worldBookStorage.getWorldBooksForCharacter(currentCharacter.id);
      if (worldBooks.length === 0) return null;
      
      // 使用第一个关联的世界书
      const worldBook = worldBooks[0];
      
      return await generateWorldInfoAfter({
        worldBook,
        chatMessages: extendedMessages
      });
    }
      
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

// 正则表达式脚本管理
interface RegexState {
  scripts: RegexScript[];
  isLoading: boolean;
  error: string | null;
  
  // 操作方法
  loadScripts: () => Promise<void>;
  getScript: (id: string) => RegexScript | undefined;
  addScript: (script: RegexScript) => Promise<void>;
  updateScript: (id: string, script: Partial<RegexScript>) => Promise<void>;
  deleteScript: (id: string) => Promise<void>;
  importScriptFromFile: (file: File) => Promise<RegexScript | null>;
  exportScriptToFile: (id: string) => Promise<void>;
  toggleScriptEnabled: (id: string) => Promise<void>;
  reorderScripts: (newScripts: RegexScript[]) => Promise<void>;
  
  // 应用正则表达式
  applyRegexToMessage: (text: string, playerName: string, characterName: string, depth?: number, type?: number) => string;
}

export const useRegexStore = create<RegexState>()(
  devtools(
    (set, get) => ({
      scripts: [],
      isLoading: false,
      error: null,
      
      // 加载脚本
      loadScripts: async () => {
        try {
          set({ isLoading: true });
          const scripts = await regexStorage.listRegexScripts();
          set({ scripts, isLoading: false });
        } catch (error) {
          console.error("加载正则表达式脚本失败:", error);
          set({ error: "加载脚本失败", isLoading: false });
        }
      },
      
      // 获取指定脚本
      getScript: (id: string) => {
        const { scripts } = get();
        return scripts.find(script => script.id === id);
      },
      
      // 添加脚本
      addScript: async (script: RegexScript) => {
        try {
          set({ isLoading: true });
          await regexStorage.saveRegexScript(script);
          set(state => ({
            scripts: [...state.scripts, script],
            isLoading: false
          }));
        } catch (error) {
          console.error("添加正则表达式脚本失败:", error);
          set({ error: "添加脚本失败", isLoading: false });
        }
      },
      
      // 更新脚本
      updateScript: async (id: string, scriptUpdate: Partial<RegexScript>) => {
        try {
          set({ isLoading: true });
          const { scripts } = get();
          const existingScript = scripts.find(s => s.id === id);
          
          if (!existingScript) {
            throw new Error("脚本不存在");
          }
          
          const updatedScript = { ...existingScript, ...scriptUpdate };
          await regexStorage.saveRegexScript(updatedScript);
          
          set(state => ({
            scripts: state.scripts.map(script => 
              script.id === id ? updatedScript : script
            ),
            isLoading: false
          }));
        } catch (error) {
          console.error("更新正则表达式脚本失败:", error);
          set({ error: "更新脚本失败", isLoading: false });
        }
      },
      
      // 删除脚本
      deleteScript: async (id: string) => {
        try {
          set({ isLoading: true });
          await regexStorage.deleteRegexScript(id);
          set(state => ({
            scripts: state.scripts.filter(script => script.id !== id),
            isLoading: false
          }));
        } catch (error) {
          console.error("删除正则表达式脚本失败:", error);
          set({ error: "删除脚本失败", isLoading: false });
        }
      },
      
      // 导入脚本
      importScriptFromFile: async (file: File): Promise<RegexScript | null> => {
        try {
          set({ isLoading: true });
          const script = await regexStorage.importRegexScriptFromFile(file);
          
          if (script) {
            set(state => ({
              scripts: [...state.scripts, script]
            }));
          }
          
          set({ isLoading: false });
          return script;
        } catch (error) {
          console.error('导入正则表达式脚本失败:', error);
          set({ error: '导入脚本失败', isLoading: false });
          return null;
        }
      },
      
      // 导出脚本
      exportScriptToFile: async (id: string) => {
        try {
          const { scripts } = get();
          const script = scripts.find(s => s.id === id);
          
          if (!script) {
            set({ error: '脚本不存在' });
            return;
          }
          
          const json = exportRegexScript(script);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          
          // 创建下载链接并点击
          const a = document.createElement('a');
          a.href = url;
          a.download = `${script.scriptName}.json`;
          document.body.appendChild(a);
          a.click();
          
          // 清理
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
        } catch (error) {
          console.error('导出正则表达式脚本失败:', error);
          set({ error: '导出脚本失败' });
        }
      },
      
      // 切换脚本启用状态
      toggleScriptEnabled: async (id: string) => {
        try {
          const { scripts } = get();
          const script = scripts.find(s => s.id === id);
          
          if (!script) {
            throw new Error("脚本不存在");
          }
          
          const updatedScript = { ...script, disabled: !script.disabled };
          await regexStorage.saveRegexScript(updatedScript);
          
          set(state => ({
            scripts: state.scripts.map(s => 
              s.id === id ? updatedScript : s
            )
          }));
        } catch (error) {
          console.error("切换脚本启用状态失败:", error);
          set({ error: "切换脚本启用状态失败" });
        }
      },
      
      // 应用正则表达式处理
      applyRegexToMessage: (text: string, playerName: string, characterName: string, depth = 0, type = 2) => {
        const { scripts } = get();
        
        // 导入处理函数
        const { processWithRegex } = require('./regexUtils');
        
        return processWithRegex(text, scripts, playerName, characterName, depth, type);
      },
      
      // 重新排序脚本
      reorderScripts: async (newScripts: RegexScript[]) => {
        try {
          set({ isLoading: true });
          
          // 保存每一个脚本到数据库
          for (const script of newScripts) {
            await regexStorage.saveRegexScript(script);
          }
          
          // 更新状态
          set({ 
            scripts: newScripts,
            isLoading: false
          });
        } catch (error) {
          console.error("重新排序正则表达式脚本失败:", error);
          set({ error: "重新排序脚本失败", isLoading: false });
        }
      }
    })
  )
); 