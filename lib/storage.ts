import { openDB, DBSchema, deleteDB } from 'idb';
import { Message, UserSettings, Character, Branch, PromptPreset, PromptPresetItem, PlaceholderInfo, WorldBook, WorldBookEntry, WorldBookSettings, CharacterImportResult, ApiKey, ApiKeySettings, RegexFolder } from './types';
import { generateId, extractCharaDataFromPng } from './utils';
import { RegexScript } from './regexUtils';

// 定义数据库架构
interface AppDB extends DBSchema {
  conversations: {
    key: string;
    value: {
      id: string;
      title: string;
      messages: Message[];
      systemPrompt?: string;
      lastUpdated: number;
      branches?: Branch[];
      currentBranchId?: string | null;
      characterId?: string; // 添加角色ID字段
    };
    indexes: { 'by-lastUpdated': number };
  };
  presets: {
    key: string;
    value: {
      id: string;
      name: string;
      description?: string;
      systemPrompt: string;
      firstMessage?: string;
      avatar?: string;
      tags?: string[];
      createdAt: number;
      updatedAt: number;
      regexScriptIds?: string[]; // 新增：预设关联的正则表达式脚本ID列表
      regexFolderIds?: string[]; // 新增：预设关联的正则表达式文件夹ID列表
    };
    indexes: { 'by-name': string };
  };
  characters: {
    key: string;
    value: {
      id: string;
      name: string;
      description?: string;
      firstMessage?: string;
      alternateGreetings?: string[];
      avatar?: string;
      tags?: string[];
      createdAt: number;
      updatedAt: number;
      worldBookIds?: string[]; // 新增：角色关联的世界书ID列表
      regexScriptIds?: string[]; // 新增：角色关联的正则表达式脚本ID列表
    };
    indexes: { 'by-name': string };
  };
  promptPresets: {
    key: string;
    value: PromptPreset;
    indexes: { 'by-name': string; 'by-updatedAt': number };
  };
  players: {
    key: string;
    value: {
      id: string;
      name: string;
      description?: string;
      avatar?: string;
      createdAt: number;
      updatedAt: number;
    };
    indexes: { 'by-name': string; 'by-updatedAt': number };
  };
  worldBooks: {
    key: string;
    value: WorldBook;
    indexes: { 'by-name': string };
  };
  regex: {
    key: string;
    value: RegexScript;
    indexes: { 'by-name': string };
  };
  regexFolders: {
    key: string;
    value: RegexFolder;
    indexes: { 'by-name': string };
  };
  apiKeys: {
    key: string;
    value: {
      id: string;
      name: string;
      key: string;
      enabled: boolean;
      priority: number;
      usageCount: number;
      lastUsed?: number;
      createdAt: number;
    };
    indexes: { 'by-priority': number, 'by-name': string };
  };
  apiKeySettings: {
    key: string;
    value: {
      id: string;
      rotationStrategy: 'sequential' | 'random' | 'least-used';
      activeKeyId: string | null;
      switchTiming: 'every-call' | 'threshold';
      switchThreshold: number;
      rotationEnabled: boolean;
    };
  };
}


// 初始化数据库
export const initDB = async () => {
  try {
    const db = await openDB<AppDB>('ai-roleplay-db', 9, {
      upgrade(db, oldVersion) {
        // 版本1: 创建conversations和presets表
        if (oldVersion < 1) {
          // 存储对话历史
          if (!db.objectStoreNames.contains('conversations')) {
            const conversationStore = db.createObjectStore('conversations', { keyPath: 'id' });
            conversationStore.createIndex('by-lastUpdated', 'lastUpdated');
          }
          
          // 存储角色预设
          if (!db.objectStoreNames.contains('presets')) {
            const presetStore = db.createObjectStore('presets', { keyPath: 'id' });
            presetStore.createIndex('by-name', 'name');
          }
        }
        
        // 版本2: 创建characters表
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('characters')) {
            const characterStore = db.createObjectStore('characters', { keyPath: 'id' });
            characterStore.createIndex('by-name', 'name');
          }
        }
        
        // 版本3: 创建promptPresets表
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains('promptPresets')) {
            const promptPresetStore = db.createObjectStore('promptPresets', { keyPath: 'id' });
            promptPresetStore.createIndex('by-name', 'name');
            promptPresetStore.createIndex('by-updatedAt', 'updatedAt');
          }
        }
        
        // 版本4: 创建players表
        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains('players')) {
            const playerStore = db.createObjectStore('players', { keyPath: 'id' });
            playerStore.createIndex('by-name', 'name');
            playerStore.createIndex('by-updatedAt', 'updatedAt');
          }
        }
        
        // 版本5: 创建worldBooks表
        if (oldVersion < 5) {
          if (!db.objectStoreNames.contains('worldBooks')) {
            const worldBookStore = db.createObjectStore('worldBooks', { keyPath: 'id' });
            worldBookStore.createIndex('by-name', 'name');
          }
        }
        
        // 版本6: 创建regex表
        if (oldVersion < 6) {
          if (!db.objectStoreNames.contains('regex')) {
            const regexStore = db.createObjectStore('regex', { keyPath: 'id' });
            regexStore.createIndex('by-name', 'scriptName');
          }
        }
        
        // 版本7: 更新conversations表，添加characterId字段
        if (oldVersion < 7) {
          // 7版本中已经处理了
        }
        
        // 版本8: 创建apiKeys和apiKeySettings表
        if (oldVersion < 8) {
          if (!db.objectStoreNames.contains('apiKeys')) {
            const apiKeyStore = db.createObjectStore('apiKeys', { keyPath: 'id' });
            apiKeyStore.createIndex('by-priority', 'priority');
            apiKeyStore.createIndex('by-name', 'name');
          }
          
          if (!db.objectStoreNames.contains('apiKeySettings')) {
            db.createObjectStore('apiKeySettings', { keyPath: 'id' });
          }
        }
        
        // 版本9: 创建regexFolders表，并更新presets表支持关联正则
        if (oldVersion < 9) {
          // 创建正则表达式文件夹表
          if (!db.objectStoreNames.contains('regexFolders')) {
            const regexFolderStore = db.createObjectStore('regexFolders', { keyPath: 'id' });
            regexFolderStore.createIndex('by-name', 'name');
            
            // 创建默认的"未分类"文件夹
            const defaultFolder: RegexFolder = {
              id: 'default',
              name: '未分类',
              description: '默认文件夹，存放未分类的正则脚本',
              disabled: false,
              type: 'global' as const, // 明确指定为全局类型
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            regexFolderStore.add(defaultFolder);
          }
        }
      }
    });
    
    // 数据库初始化后，确保所有正则脚本都有文件夹ID
    await updateRegexScriptsFolders(db);
    
    return db;
  } catch (error) {
    console.error("数据库初始化错误:", error);
    // 如果是版本变更错误，尝试删除数据库并重新创建
    if (error instanceof DOMException && error.name === 'VersionError') {
      console.warn("检测到版本错误，尝试删除并重建数据库");
      try {
        await deleteDB('ai-roleplay-db');
        return openDB<AppDB>('ai-roleplay-db', 9, {
          upgrade(db) {
            // 重新创建所有表
            const conversationStore = db.createObjectStore('conversations', { keyPath: 'id' });
            conversationStore.createIndex('by-lastUpdated', 'lastUpdated');
            
            const presetStore = db.createObjectStore('presets', { keyPath: 'id' });
            presetStore.createIndex('by-name', 'name');
            
            const characterStore = db.createObjectStore('characters', { keyPath: 'id' });
            characterStore.createIndex('by-name', 'name');
            
            const promptPresetStore = db.createObjectStore('promptPresets', { keyPath: 'id' });
            promptPresetStore.createIndex('by-name', 'name');
            promptPresetStore.createIndex('by-updatedAt', 'updatedAt');
            
            const playerStore = db.createObjectStore('players', { keyPath: 'id' });
            playerStore.createIndex('by-name', 'name');
            playerStore.createIndex('by-updatedAt', 'updatedAt');
            
            const worldBookStore = db.createObjectStore('worldBooks', { keyPath: 'id' });
            worldBookStore.createIndex('by-name', 'name');
            
            const regexStore = db.createObjectStore('regex', { keyPath: 'id' });
            regexStore.createIndex('by-name', 'scriptName');
            
            const apiKeyStore = db.createObjectStore('apiKeys', { keyPath: 'id' });
            apiKeyStore.createIndex('by-priority', 'priority');
            apiKeyStore.createIndex('by-name', 'name');
            
            db.createObjectStore('apiKeySettings', { keyPath: 'id' });
            
            const regexFolderStore = db.createObjectStore('regexFolders', { keyPath: 'id' });
            regexFolderStore.createIndex('by-name', 'name');
            
            // 创建默认的"未分类"文件夹
            const defaultFolder: RegexFolder = {
              id: 'default',
              name: '未分类',
              description: '默认文件夹，存放未分类的正则脚本',
              disabled: false,
              type: 'global' as const, // 明确指定为全局类型
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            regexFolderStore.add(defaultFolder);
          }
        });
      } catch (recreateError) {
        console.error("重建数据库失败:", recreateError);
        throw recreateError;
      }
    } else {
      throw error;
    }
  }
};

// 辅助函数：更新正则脚本的文件夹ID
async function updateRegexScriptsFolders(db: any) {
  try {
    // 获取所有正则脚本
    const scripts = await db.getAll('regex');
    
    // 更新没有文件夹ID的脚本
    for (const script of scripts) {
      if (!script.folderId) {
        script.folderId = 'default';
        await db.put('regex', script);
      }
    }
    
    console.log(`已更新 ${scripts.filter((s: RegexScript) => !s.folderId).length} 个正则脚本的文件夹ID`);
  } catch (error) {
    console.error("更新正则脚本文件夹ID失败:", error);
  }
}

// 初始化主分支 - 为每个对话添加默认主分支
export const initializeMainBranch = async (conversationId: string): Promise<string> => {
  const db = await initDB();
  const conversation = await db.get('conversations', conversationId);
  
  if (!conversation) {
    throw new Error('对话不存在');
  }
  
  // 检查是否已有分支
  if (conversation.branches && conversation.branches.length > 0) {
    // 如果已有分支，返回第一个分支ID
    return conversation.branches[0].id;
  }
  
  // 创建主分支
  const mainBranchId = generateId();
  const mainBranch: Branch = {
    id: mainBranchId,
    name: '主分支',
    parentMessageId: '', // 主分支没有父消息
    createdAt: Date.now()
  };
  
  // 为所有消息添加分支ID
  if (conversation.messages) {
    conversation.messages = conversation.messages.map(msg => ({
      ...msg,
      branchId: mainBranchId
    }));
  }
  
  // 更新对话
  conversation.branches = [mainBranch];
  conversation.currentBranchId = mainBranchId;
  
  await db.put('conversations', conversation);
  
  return mainBranchId;
};

// 对话存储接口
export const conversationStorage = {
  async saveConversation(
    id: string, 
    title: string, 
    messages: Message[], 
    systemPrompt?: string, 
    branches?: Branch[], 
    currentBranchId?: string | null,
    characterId?: string // 添加角色ID参数
  ) {
    const db = await initDB();
    
    // 如果未提供分支信息或角色ID，尝试获取现有信息
    if (!branches || !currentBranchId || !characterId) {
      try {
        const existingConv = await db.get('conversations', id);
        branches = branches || existingConv?.branches;
        currentBranchId = currentBranchId || existingConv?.currentBranchId;
        // 保留现有的角色ID，除非明确提供了新值
        characterId = characterId || existingConv?.characterId;
      } catch (error) {
        // 忽略错误，可能是新对话
      }
    }
    
    await db.put('conversations', {
      id,
      title,
      messages,
      systemPrompt,
      branches,
      currentBranchId,
      characterId, // 存储角色ID
      lastUpdated: Date.now()
    });
  },
  
  async getConversation(id: string) {
    const db = await initDB();
    return db.get('conversations', id);
  },
  
  async listConversations() {
    const db = await initDB();
    return db.getAllFromIndex('conversations', 'by-lastUpdated');
  },
  
  async deleteConversation(id: string) {
    const db = await initDB();
    await db.delete('conversations', id);
  },
  
  async clearAllConversations() {
    const db = await initDB();
    await db.clear('conversations');
  },
  
  // 分支相关操作
  
  // 获取对话的所有分支
  async getBranches(conversationId: string): Promise<Branch[]> {
    const db = await initDB();
    const conversation = await db.get('conversations', conversationId);
    
    if (!conversation) {
      throw new Error('对话不存在');
    }
    
    // 如果没有分支，初始化主分支
    if (!conversation.branches || conversation.branches.length === 0) {
      await initializeMainBranch(conversationId);
      const updatedConversation = await db.get('conversations', conversationId);
      return updatedConversation?.branches || [];
    }
    
    return conversation.branches || [];
  },
  
  // 创建新分支
  async createBranch(conversationId: string, name: string, parentMessageId: string): Promise<string> {
    const db = await initDB();
    const conversation = await db.get('conversations', conversationId);
    
    if (!conversation) {
      throw new Error('对话不存在');
    }
    
    // 确保对话有分支
    if (!conversation.branches || conversation.branches.length === 0) {
      await initializeMainBranch(conversationId);
      // 重新获取对话信息
      const updatedConversation = await db.get('conversations', conversationId);
      if (!updatedConversation) throw new Error('初始化主分支后无法获取对话');
      conversation.branches = updatedConversation.branches;
      conversation.currentBranchId = updatedConversation.currentBranchId;
    }
    
    // 找到父消息在消息列表中的索引和父消息的分支ID
    const parentMessage = conversation.messages.find(m => m.id === parentMessageId);
    if (!parentMessage) throw new Error('找不到父消息');
    
    const parentBranchId = parentMessage.branchId || conversation.currentBranchId;
    if (!parentBranchId) throw new Error('无法确定父分支');
    
    // 创建新分支
    const branchId = generateId();
    const newBranch: Branch = {
      id: branchId,
      name,
      parentMessageId,
      createdAt: Date.now()
    };
    
    // 添加新分支到分支列表
    conversation.branches = [...(conversation.branches || []), newBranch];
    
    // 找到父消息的索引
    const parentIndex = conversation.messages.findIndex(m => m.id === parentMessageId);
    if (parentIndex === -1) throw new Error('找不到父消息');
    
    // 从父分支复制消息到分岔点
    const messagesUpToParent = conversation.messages.filter(msg => {
      // 如果是父分支且在分岔点之前的消息，复制过来
      return (msg.branchId === parentBranchId && 
             conversation.messages.findIndex(m => m.id === msg.id) <= parentIndex);
    });
    
    // 为复制的消息设置新的分支ID
    const newBranchMessages = messagesUpToParent.map(msg => ({
      ...msg,
      branchId // 设置新分支ID
    }));
    
    // 保存所有原有消息和新分支的消息
    const allMessages = [
      ...conversation.messages, // 保留所有原有消息
      ...newBranchMessages.filter(newMsg => 
        // 过滤掉与原消息ID相同的消息（避免重复）
        !conversation.messages.some(existingMsg => existingMsg.id === newMsg.id && existingMsg.branchId === newMsg.branchId)
      )
    ];
    
    // 更新当前分支ID
    conversation.currentBranchId = branchId;
    
    // 保存更新后的对话
    await db.put('conversations', {
      ...conversation,
      messages: allMessages,
    });
    
    return branchId;
  },
  
  // 切换分支
  async switchBranch(conversationId: string, branchId: string): Promise<Message[]> {
    const db = await initDB();
    const conversation = await db.get('conversations', conversationId);
    
    if (!conversation) {
      throw new Error('对话不存在');
    }
    
    // 检查分支是否存在
    const targetBranch = conversation.branches?.find(b => b.id === branchId);
    if (!targetBranch) {
      throw new Error('分支不存在');
    }
    
    // 记录之前的分支ID
    const previousBranchId = conversation.currentBranchId;
    
    // 查找完整的分支路径（包括父分支的消息）
    let branchMessages: Message[] = [];
    
    if (targetBranch.parentMessageId) {
      // 非主分支：找到父消息所在的分支，并包含直到父消息的所有消息
      let currentBranch = targetBranch;
      let processedBranches = new Set<string>();
      
      while (currentBranch && currentBranch.parentMessageId && !processedBranches.has(currentBranch.id)) {
        // 防止循环引用
        processedBranches.add(currentBranch.id);
        
        // 获取该分支的所有消息
        const currentBranchMessages = conversation.messages.filter(msg => msg.branchId === currentBranch.id);
        branchMessages = [...currentBranchMessages, ...branchMessages];
        
        // 找到父分支
        const parentMessage = conversation.messages.find(msg => msg.id === currentBranch.parentMessageId);
        if (!parentMessage || !parentMessage.branchId) break;
        
        // 获取父分支信息
        const parentBranch = conversation.branches?.find(b => b.id === parentMessage.branchId);
        if (!parentBranch) break;
        
        currentBranch = parentBranch;
      }
      
      // 如果存在父分支，还需要包含父分支中直到分支点的消息
      if (targetBranch.parentMessageId) {
        const parentMessage = conversation.messages.find(msg => msg.id === targetBranch.parentMessageId);
        if (parentMessage && parentMessage.branchId) {
          const parentMessages = conversation.messages.filter(msg => 
            msg.branchId === parentMessage.branchId && 
            conversation.messages.findIndex(m => m.id === msg.id) <= 
            conversation.messages.findIndex(m => m.id === targetBranch.parentMessageId)
          );
          
          // 将父分支消息添加到结果中（如果还没有包含）
          const existingIds = new Set(branchMessages.map(m => m.id));
          const newParentMessages = parentMessages.filter(m => !existingIds.has(m.id));
          branchMessages = [...newParentMessages, ...branchMessages];
        }
      }
    } else {
      // 主分支：直接获取所有属于主分支的消息
      branchMessages = conversation.messages.filter(msg => msg.branchId === branchId);
    }
    
    // 按照原始顺序对消息进行排序
    branchMessages.sort((a, b) => {
      return conversation.messages.findIndex(m => m.id === a.id) - 
             conversation.messages.findIndex(m => m.id === b.id);
    });
    
    // 去除可能的重复消息
    const uniqueMessages = Array.from(new Map(branchMessages.map(msg => [msg.id, msg])).values());
    
    // 确保至少有一条消息（开场白）
    if (uniqueMessages.length === 0 && conversation.messages.length > 0) {
      console.warn('分支切换后没有消息，尝试恢复第一条消息');
      const firstMessage = conversation.messages[0];
      if (firstMessage) {
        uniqueMessages.push(firstMessage);
      }
    }
    
    // 更新当前分支ID
    conversation.currentBranchId = branchId;
    
    await db.put('conversations', conversation);
    
    return uniqueMessages;
  },

  // 重命名分支
  async renameBranch(conversationId: string, branchId: string, newName: string): Promise<Branch[]> {
    const db = await initDB();
    const conversation = await db.get('conversations', conversationId);
    
    if (!conversation) {
      throw new Error('对话不存在');
    }
    
    if (!conversation.branches) {
      throw new Error('对话没有分支');
    }
    
    // 查找目标分支
    const branchIndex = conversation.branches.findIndex(b => b.id === branchId);
    if (branchIndex === -1) {
      throw new Error('分支不存在');
    }
    
    // 检查新名称
    if (!newName.trim()) {
      throw new Error('分支名称不能为空');
    }
    
    // 更新分支名称
    conversation.branches[branchIndex].name = newName.trim();
    
    // 保存更新后的对话
    await db.put('conversations', conversation);
    
    return conversation.branches;
  },
  
  // 删除分支
  async deleteBranch(conversationId: string, branchId: string): Promise<Branch[]> {
    const db = await initDB();
    const conversation = await db.get('conversations', conversationId);
    
    if (!conversation) {
      throw new Error('对话不存在');
    }
    
    if (!conversation.branches || conversation.branches.length === 0) {
      throw new Error('对话没有分支');
    }
    
    // 检查是否是当前分支
    if (conversation.currentBranchId === branchId) {
      throw new Error('不能删除当前活动的分支');
    }
    
    // 查找要删除的分支
    const branchToDelete = conversation.branches.find(b => b.id === branchId);
    if (!branchToDelete) {
      throw new Error('分支不存在');
    }
    
    // 检查是否是主分支（第一个创建的分支）
    const isMainBranch = conversation.branches.length > 0 && conversation.branches[0].id === branchId;
    if (isMainBranch) {
      throw new Error('不能删除主分支');
    }
    
    // 查找所有依赖于此分支的子分支
    const childBranches = conversation.branches.filter(b => {
      const parentMessage = conversation.messages.find(m => m.id === b.parentMessageId);
      return parentMessage && parentMessage.branchId === branchId;
    });
    
    // 如果有子分支依赖此分支，不允许删除
    if (childBranches.length > 0) {
      throw new Error('该分支有子分支，无法删除');
    }
    
    // 从分支列表中删除
    conversation.branches = conversation.branches.filter(b => b.id !== branchId);
    
    // 删除该分支的所有消息
    conversation.messages = conversation.messages.filter(m => m.branchId !== branchId);
    
    // 保存更新后的对话
    await db.put('conversations', conversation);
    
    return conversation.branches;
  }
};

// 预设存储接口
export const presetStorage = {
  async savePreset(preset: {
    id: string;
    name: string;
    description?: string;
    systemPrompt: string;
    firstMessage?: string;
    avatar?: string;
    tags?: string[];
    regexScriptIds?: string[];
  }) {
    const db = await initDB();
    
    // 如果是新预设，添加创建时间
    if (!preset.id) {
      preset.id = generateId();
    }
    
    const now = Date.now();
    const updatedPreset = {
      ...preset,
      createdAt: preset.id ? (await db.get('presets', preset.id))?.createdAt || now : now,
      updatedAt: now
    };
    
    await db.put('presets', updatedPreset);
    return updatedPreset;
  },
  
  async getPreset(id: string) {
    const db = await initDB();
    return db.get('presets', id);
  },
  
  async listPresets() {
    const db = await initDB();
    return db.getAllFromIndex('presets', 'by-name');
  },
  
  async deletePreset(id: string) {
    const db = await initDB();
    await db.delete('presets', id);
  }
};

// 角色存储接口
export const characterStorage = {
  async saveCharacter(character: {
    id: string;
    name: string;
    description?: string;
    firstMessage?: string;
    alternateGreetings?: string[];
    avatar?: string;
    tags?: string[];
    worldBookIds?: string[];
    regexScriptIds?: string[];
  }) {
    const db = await initDB();
    const now = Date.now();
    await db.put('characters', {
      ...character,
      createdAt: character.id ? (await db.get('characters', character.id))?.createdAt || now : now,
      updatedAt: now
    });
  },
  
  async getCharacter(id: string) {
    const db = await initDB();
    return db.get('characters', id);
  },
  
  async listCharacters() {
    const db = await initDB();
    return db.getAllFromIndex('characters', 'by-name');
  },
  
  async deleteCharacter(id: string) {
    const db = await initDB();
    await db.delete('characters', id);
  },
  
  async importCharacter(file: File): Promise<CharacterImportResult> {
    try {
      if (file.name.toLowerCase().endsWith('.json')) {
        return await this.importJsonCharacter(file);
      } else if (file.name.toLowerCase().endsWith('.png')) {
        return await this.importPngCharacter(file);
      } else {
        throw new Error('不支持的文件格式，请使用JSON或PNG格式的角色卡');
      }
    } catch (error) {
      console.error('导入角色卡失败:', error);
      return {
        characterId: null,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  },

  async importJsonCharacter(file: File): Promise<CharacterImportResult> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // 导入基本信息
      let characterData: any = {
        name: "",
        description: "",
        firstMessage: "",
        alternateGreetings: [],
        tags: [],
        worldBookIds: [], // 添加世界书ID字段
        regexScriptIds: [] // 添加正则表达式脚本ID字段
      };
      
      // 处理角色名称
      if (data.name) {
        characterData.name = data.name;
      } else if (data.data?.name) {
        characterData.name = data.data.name;
      } else if (data.char_name) {
        characterData.name = data.char_name;
      } else if (data.character?.name) {
        characterData.name = data.character.name;
      }
      
      if (!characterData.name) {
        throw new Error('角色卡缺少名称');
      }
      
      // 处理角色描述
      if (data.description) {
        characterData.description = data.description;
      } else if (data.data?.description) {
        characterData.description = data.data.description;
      } else if (data.personality) {
        characterData.description = data.personality;
      } else if (data.data?.personality) {
        characterData.description = data.data.personality;
      } else if (data.char_persona) {
        characterData.description = data.char_persona;
      } else if (data.scenario) {
        characterData.description = data.scenario;
      } else if (data.data?.scenario) {
        characterData.description = data.data.scenario;
      }
      
      // 处理开场白
      if (data.first_mes) {
        characterData.firstMessage = data.first_mes;
      } else if (data.data?.first_mes) {
        characterData.firstMessage = data.data.first_mes;
      } else if (data.greeting) {
        characterData.firstMessage = data.greeting;
      } else if (data.data?.greeting) {
        characterData.firstMessage = data.data.greeting;
      } else if (data.char_greeting) {
        characterData.firstMessage = data.char_greeting;
      } else if (data.first_message) {
        characterData.firstMessage = data.first_message;
      }
      
      // 处理可选开场白
      if (data.data?.alternate_greetings && Array.isArray(data.data.alternate_greetings)) {
        characterData.alternateGreetings = data.data.alternate_greetings.filter(Boolean);
      } else if (data.alternate_greetings && Array.isArray(data.alternate_greetings)) {
        characterData.alternateGreetings = data.alternate_greetings.filter(Boolean);
      } else if (data.data?.alternate_messages && Array.isArray(data.data.alternate_messages)) {
        characterData.alternateGreetings = data.data.alternate_messages.filter(Boolean);
      } else if (data.alternate_messages && Array.isArray(data.alternate_messages)) {
        characterData.alternateGreetings = data.alternate_messages.filter(Boolean);
      } else if (data.data?.alternateGreetings && Array.isArray(data.data.alternateGreetings)) {
        characterData.alternateGreetings = data.data.alternateGreetings.filter(Boolean);
      } else if (data.alternateGreetings && Array.isArray(data.alternateGreetings)) {
        characterData.alternateGreetings = data.alternateGreetings.filter(Boolean);
      }
      
      // 处理标签
      if (data.tags && Array.isArray(data.tags)) {
        characterData.tags = data.tags;
      } else if (data.data?.tags && Array.isArray(data.data.tags)) {
        characterData.tags = data.data.tags;
      } else if (data.character_book?.tags && Array.isArray(data.character_book.tags)) {
        characterData.tags = data.character_book.tags;
      }
      
      // 处理头像
      if (data.avatar && data.avatar !== "none") {
        try {
          if (data.avatar.startsWith("data:")) {
            characterData.avatar = data.avatar;
          }
        } catch (error) {
          console.error('处理角色头像失败:', error);
        }
      } else if (data.data?.avatar && data.data.avatar !== "none") {
        try {
          if (data.data.avatar.startsWith("data:")) {
            characterData.avatar = data.data.avatar;
          }
        } catch (error) {
          console.error('处理角色头像失败:', error);
        }
      } else if (data.image) {
        try {
          if (data.image.startsWith("data:")) {
            characterData.avatar = data.image;
          }
        } catch (error) {
          console.error('处理角色头像失败:', error);
        }
      }
      
      // 生成新ID避免覆盖
      const newId = generateId();
      
      // 导入角色卡附带的世界书
      let worldBookIds: string[] = [];
      let importedWorldBookNames: string[] = [];
      
      // 检查角色卡中是否包含世界书数据（character_book字段）
      const characterBook = data.character_book || data.data?.character_book;
      
      if (characterBook && characterBook.entries && Array.isArray(characterBook.entries) && characterBook.entries.length > 0) {
        console.log('发现角色卡中的世界书数据，开始导入...');
        
        // 创建世界书数据
        const worldBookName = `${characterData.name}的世界书`;
        
        // 提取条目
        const entries = characterBook.entries.map((entry: any, index: number) => {
          return {
            id: generateId(),
            title: entry.comment || `条目 ${index + 1}`,
            content: entry.content || '',
            strategy: entry.constant ? 'constant' : 
                     (entry.selective ? 'selective' : 'constant'),
            enabled: !entry.disabled,
            order: entry.insertion_order || 100,
            position: entry.position === 'before_char' ? 'before' : 'after',
            primaryKeys: Array.isArray(entry.keys) ? entry.keys : 
                        (entry.keys ? [entry.keys] : []),
            secondaryKeys: Array.isArray(entry.secondary_keys) ? entry.secondary_keys : 
                          (entry.secondary_keys ? [entry.secondary_keys] : []),
            selectiveLogic: entry.extensions?.selectiveLogic === 1 ? 'andAll' :
                           entry.extensions?.selectiveLogic === 2 ? 'notAny' :
                           entry.extensions?.selectiveLogic === 3 ? 'notAll' : 'andAny',
            caseSensitive: entry.extensions?.case_sensitive || false,
            matchWholeWords: entry.extensions?.match_whole_words || true,
            excludeRecursion: entry.extensions?.exclude_recursion || false,
            preventRecursion: entry.extensions?.prevent_recursion || false,
            delayUntilRecursion: entry.extensions?.delay_until_recursion || false,
            recursionLevel: entry.extensions?.recursion_level || 0,
            probability: entry.extensions?.probability || 100,
            sticky: entry.extensions?.sticky || 0,
            cooldown: entry.extensions?.cooldown || 0,
            delay: entry.extensions?.delay || 0,
            scanDepth: entry.extensions?.scan_depth
          };
        });
        
        // 提取设置
        const settings: WorldBookSettings = {
          scanDepth: characterBook.scan_depth || 5,
          includeNames: characterBook.include_usernames !== undefined ? characterBook.include_usernames : true,
          maxRecursionSteps: characterBook.max_recursion_depth || 0,
          minActivations: 0,
          maxDepth: 10,
          caseSensitive: false,
          matchWholeWords: true
        };
        
        try {
          // 创建新的世界书
          const worldBook = await worldBookStorage.saveWorldBook({
            id: generateId(),
            name: worldBookName,
            description: `自动从${characterData.name}角色卡导入的世界书`,
            entries,
            settings,
            characterIds: [newId], // 直接关联到新角色
            enabled: true
          });
          
          // 保存世界书ID，稍后关联到角色
          worldBookIds.push(worldBook.id);
          importedWorldBookNames.push(worldBookName);
          console.log(`成功导入角色卡世界书: ${worldBookName}, ID: ${worldBook.id}`);
        } catch (error) {
          console.error('导入角色卡世界书失败:', error);
        }
      }
      
      // 如果成功导入世界书，添加到角色的世界书ID列表中
      if (worldBookIds.length > 0) {
        characterData.worldBookIds = worldBookIds;
      }
      
      // 导入角色卡附带的正则表达式脚本
      let regexScriptIds: string[] = [];
      let importedRegexScriptNames: string[] = [];
      
      // 检查角色卡中是否包含正则表达式数据
      const regexScripts = data.extensions?.regex_scripts || data.data?.extensions?.regex_scripts;
      
      if (regexScripts && Array.isArray(regexScripts) && regexScripts.length > 0) {
        // 导入正则表达式脚本并关联到角色
        importedRegexScriptNames = await importRegexScriptsFromCharacterData(newId, characterData.name, regexScripts);
        
        // 获取导入脚本的ID
        const importedScripts = await Promise.all(
          importedRegexScriptNames.map(async (scriptName) => {
            const scripts = await regexStorage.listRegexScripts();
            return scripts.find(s => s.scriptName === scriptName && s.characterIds?.includes(newId));
          })
        );
        
        // 过滤出有效的脚本ID
        regexScriptIds = importedScripts.filter(Boolean).map(script => script?.id).filter(Boolean) as string[];
        
        // 添加到角色数据
        if (regexScriptIds.length > 0) {
          characterData.regexScriptIds = regexScriptIds;
        }
      }
      
      // 保存角色数据
      await this.saveCharacter({
        ...characterData,
        id: newId
      });
      
      // 返回导入结果，包括角色ID、导入的世界书和正则表达式脚本信息
      return {
        characterId: newId,
        importedWorldBooks: importedWorldBookNames.length > 0 ? importedWorldBookNames : null,
        importedRegexScripts: importedRegexScriptNames.length > 0 ? importedRegexScriptNames : null
      };
    } catch (error) {
      console.error('导入JSON角色卡失败:', error);
      return {
        characterId: null,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  },

  async importPngCharacter(file: File): Promise<CharacterImportResult> {
    try {
      // 读取文件内容为ArrayBuffer
      const buffer = await file.arrayBuffer();
      
      // 提取角色卡JSON数据
      const jsonString = extractCharaDataFromPng(buffer);
      if (!jsonString) {
        throw new Error('无法从PNG文件中提取角色卡数据');
      }
      
      // 解析JSON数据
      const data = JSON.parse(jsonString);
      
      // 创建角色数据对象
      const characterData: any = {
        name: "",
        description: "",
        firstMessage: "",
        alternateGreetings: [],
        tags: [],
        worldBookIds: [], // 添加世界书ID字段
        regexScriptIds: [] // 添加正则表达式脚本ID字段
      };
      
      // 处理角色名称
      if (data.name) {
        characterData.name = data.name;
      } else if (data.char_name) {
        characterData.name = data.char_name;
      } else if (data.data?.name) {
        characterData.name = data.data.name;
      }
      
      if (!characterData.name) {
        throw new Error('角色卡缺少名称');
      }
      
      // 处理描述相关字段
      let descriptionParts = [];
      
      if (data.description) {
        descriptionParts.push(data.description);
      } else if (data.data?.description) {
        descriptionParts.push(data.data.description);
      }
      
      if (data.personality) {
        descriptionParts.push(`性格: ${data.personality}`);
      } else if (data.data?.personality) {
        descriptionParts.push(`性格: ${data.data.personality}`);
      }
      
      if (data.scenario) {
        descriptionParts.push(`场景: ${data.scenario}`);
      } else if (data.data?.scenario) {
        descriptionParts.push(`场景: ${data.data.scenario}`);
      }
      
      characterData.description = descriptionParts.join('\n\n');
      
      // 处理开场白
      if (data.first_mes) {
        characterData.firstMessage = data.first_mes;
      } else if (data.data?.first_mes) {
        characterData.firstMessage = data.data.first_mes;
      } else if (data.greeting) {
        characterData.firstMessage = data.greeting;
      } else if (data.data?.greeting) {
        characterData.firstMessage = data.data.greeting;
      }
      
      // 处理可选开场白
      if (data.data?.alternate_greetings && Array.isArray(data.data.alternate_greetings)) {
        characterData.alternateGreetings = data.data.alternate_greetings
          .filter((g: any) => typeof g === 'string' && g.trim() !== '')
          .map((g: string) => g.trim());
      } else if (data.alternate_greetings && Array.isArray(data.alternate_greetings)) {
        characterData.alternateGreetings = data.alternate_greetings
          .filter((g: any) => typeof g === 'string' && g.trim() !== '')
          .map((g: string) => g.trim());
      } else if (data.data?.alternateGreetings && Array.isArray(data.data.alternateGreetings)) {
        characterData.alternateGreetings = data.data.alternateGreetings
          .filter((g: any) => typeof g === 'string' && g.trim() !== '')
          .map((g: string) => g.trim());
      }
      
      // 处理标签
      if (data.tags && Array.isArray(data.tags)) {
        characterData.tags = data.tags;
      } else if (data.data?.tags && Array.isArray(data.data.tags)) {
        characterData.tags = data.data.tags;
      }
      
      // 处理头像 - 使用PNG文件本身作为头像
      try {
        const reader = new FileReader();
        const avatarDataUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        characterData.avatar = avatarDataUrl;
      } catch (error) {
        console.error('处理角色头像失败:', error);
      }
      
      // 生成新ID避免覆盖
      const newId = generateId();
      
      // 导入角色卡附带的世界书
      let worldBookIds: string[] = [];
      let importedWorldBookNames: string[] = [];
      
      // 检查角色卡中是否包含世界书数据（character_book字段）
      const characterBook = data.character_book || data.data?.character_book;
      
      if (characterBook && characterBook.entries && Array.isArray(characterBook.entries) && characterBook.entries.length > 0) {
        console.log('发现角色卡中的世界书数据，开始导入...');
        
        // 创建世界书数据
        const worldBookName = `${characterData.name}的世界书`;
        
        // 提取条目
        const entries = characterBook.entries.map((entry: any, index: number) => {
          return {
            id: generateId(),
            title: entry.comment || `条目 ${index + 1}`,
            content: entry.content || '',
            strategy: entry.constant ? 'constant' : 
                     (entry.selective ? 'selective' : 'constant'),
            enabled: !entry.disabled,
            order: entry.insertion_order || 100,
            position: entry.position === 'before_char' ? 'before' : 'after',
            primaryKeys: Array.isArray(entry.keys) ? entry.keys : 
                        (entry.keys ? [entry.keys] : []),
            secondaryKeys: Array.isArray(entry.secondary_keys) ? entry.secondary_keys : 
                          (entry.secondary_keys ? [entry.secondary_keys] : []),
            selectiveLogic: entry.extensions?.selectiveLogic === 1 ? 'andAll' :
                           entry.extensions?.selectiveLogic === 2 ? 'notAny' :
                           entry.extensions?.selectiveLogic === 3 ? 'notAll' : 'andAny',
            caseSensitive: entry.extensions?.case_sensitive || false,
            matchWholeWords: entry.extensions?.match_whole_words || true,
            excludeRecursion: entry.extensions?.exclude_recursion || false,
            preventRecursion: entry.extensions?.prevent_recursion || false,
            delayUntilRecursion: entry.extensions?.delay_until_recursion || false,
            recursionLevel: entry.extensions?.recursion_level || 0,
            probability: entry.extensions?.probability || 100,
            sticky: entry.extensions?.sticky || 0,
            cooldown: entry.extensions?.cooldown || 0,
            delay: entry.extensions?.delay || 0,
            scanDepth: entry.extensions?.scan_depth
          };
        });
        
        // 提取设置
        const settings: WorldBookSettings = {
          scanDepth: characterBook.scan_depth || 5,
          includeNames: characterBook.include_usernames !== undefined ? characterBook.include_usernames : true,
          maxRecursionSteps: characterBook.max_recursion_depth || 0,
          minActivations: 0,
          maxDepth: 10,
          caseSensitive: false,
          matchWholeWords: true
        };
        
        try {
          // 创建新的世界书
          const worldBook = await worldBookStorage.saveWorldBook({
            id: generateId(),
            name: worldBookName,
            description: `自动从${characterData.name}角色卡导入的世界书`,
            entries,
            settings,
            characterIds: [], // 稍后会更新
            enabled: true
          });
          
          // 保存世界书ID，稍后关联到角色
          worldBookIds.push(worldBook.id);
          importedWorldBookNames.push(worldBookName);
          console.log(`成功导入角色卡世界书: ${worldBookName}, ID: ${worldBook.id}`);
        } catch (error) {
          console.error('导入角色卡世界书失败:', error);
        }
      }
      
      // 如果成功导入世界书，添加到角色的世界书ID列表中
      if (worldBookIds.length > 0) {
        characterData.worldBookIds = worldBookIds;
      }
      
      // 导入角色卡附带的正则表达式脚本
      let regexScriptIds: string[] = [];
      let importedRegexScriptNames: string[] = [];
      
      // 检查角色卡中是否包含正则表达式数据
      const regexScripts = data.extensions?.regex_scripts || data.data?.extensions?.regex_scripts;
      
      if (regexScripts && Array.isArray(regexScripts) && regexScripts.length > 0) {
        // 导入正则表达式脚本并关联到角色
        importedRegexScriptNames = await importRegexScriptsFromCharacterData(newId, characterData.name, regexScripts);
        
        // 获取导入脚本的ID
        const importedScripts = await Promise.all(
          importedRegexScriptNames.map(async (scriptName) => {
            const scripts = await regexStorage.listRegexScripts();
            return scripts.find(s => s.scriptName === scriptName && s.characterIds?.includes(newId));
          })
        );
        
        // 过滤出有效的脚本ID
        regexScriptIds = importedScripts.filter(Boolean).map(script => script?.id).filter(Boolean) as string[];
        
        // 添加到角色数据
        if (regexScriptIds.length > 0) {
          characterData.regexScriptIds = regexScriptIds;
        }
      }
      
      // 保存角色
      await this.saveCharacter({
        ...characterData,
        id: newId
      });
      
      // 如果有世界书，更新世界书的角色关联
      if (worldBookIds.length > 0) {
        for (const worldBookId of worldBookIds) {
          await worldBookStorage.linkToCharacter(worldBookId, newId);
        }
      }
      
      // 返回导入结果
      return {
        characterId: newId,
        importedWorldBooks: importedWorldBookNames.length > 0 ? importedWorldBookNames : null,
        importedRegexScripts: importedRegexScriptNames.length > 0 ? importedRegexScriptNames : null
      };
    } catch (error) {
      console.error('导入PNG角色卡失败:', error);
      return {
        characterId: null,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }
};

// 世界书存储接口
export const worldBookStorage = {
  /**
   * 保存世界书
   */
  async saveWorldBook(worldBook: {
    id: string;
    name: string;
    description?: string;
    entries: WorldBookEntry[];
    settings: WorldBookSettings;
    characterIds?: string[];
    enabled?: boolean;
  }): Promise<WorldBook> {
    const db = await initDB();
    const now = Date.now();
    
    // 生成新ID或使用现有ID
    const id = worldBook.id || generateId();
    
    // 获取现有数据或设置默认时间和状态
    let createdAt = now;
    let existingWorldBook: WorldBook | undefined;
    
    if (worldBook.id) {
      try {
        existingWorldBook = await db.get('worldBooks', worldBook.id);
        createdAt = existingWorldBook?.createdAt || now;
      } catch (error) {
        // 如果不存在，使用当前时间作为创建时间
      }
    }
    
    // 构建完整的世界书对象
    const completeWorldBook: WorldBook = {
      ...worldBook,
      id,
      characterIds: worldBook.characterIds || [],
      enabled: worldBook.enabled !== undefined ? worldBook.enabled : true,
      createdAt,
      updatedAt: now,
    };
    
    // 保存到数据库
    await db.put('worldBooks', completeWorldBook);
    
    // 处理角色关联
    if (worldBook.characterIds && worldBook.characterIds.length > 0) {
      await this.updateCharacterLinks(id, worldBook.characterIds);
    }
    
    return completeWorldBook;
  },

  /**
   * 获取单个世界书
   */
  async getWorldBook(id: string): Promise<WorldBook | undefined> {
    const db = await initDB();
    try {
      return await db.get('worldBooks', id);
    } catch (error) {
      console.error('获取世界书失败:', error);
      return undefined;
    }
  },

  /**
   * 列出所有世界书
   */
  async listWorldBooks(): Promise<WorldBook[]> {
    const db = await initDB();
    return await db.getAllFromIndex('worldBooks', 'by-name');
  },

  /**
   * 删除世界书
   */
  async deleteWorldBook(id: string): Promise<void> {
    const db = await initDB();
    
    // 先检查是否有角色引用此世界书
    const worldBook = await this.getWorldBook(id);
    if (worldBook?.characterIds && worldBook.characterIds.length > 0) {
      // 解除与所有角色的关联
      await this.updateCharacterLinks(id, []);
    }
    
    // 删除世界书
    await db.delete('worldBooks', id);
  },

  /**
   * 切换世界书启用状态
   */
  async toggleWorldBookEnabled(id: string): Promise<WorldBook | undefined> {
    const worldBook = await this.getWorldBook(id);
    if (!worldBook) return undefined;

    worldBook.enabled = !worldBook.enabled;
    return await this.saveWorldBook(worldBook);
  },

  /**
   * 从JSON导入世界书
   */
  async importWorldBookFromJSON(json: any, fileName?: string): Promise<WorldBook> {
    // 检查并提取世界书数据
    if (!json) {
      throw new Error('无效的JSON数据');
    }

    // 提取世界书名称
    let name = json.name;
    if (!name && fileName) {
      name = fileName.replace(/\.json$/i, '');
    }
    if (!name) {
      name = '导入的世界书';
    }

    // 提取描述
    const description = json.description || '';

    // 提取条目
    let entries: WorldBookEntry[] = [];
    if (json.entries && typeof json.entries === 'object') {
      entries = Object.values(json.entries).map((entry: any) => {
        return {
          id: entry.uid || generateId(),
          title: entry.comment || entry.title || '',
          content: entry.content || '',
          strategy: entry.constant ? 'constant' : 
                   entry.vectorized ? 'vectorized' : 'selective',
          enabled: entry.disable === undefined ? true : !entry.disable,
          order: entry.order || 100,
          position: entry.position === 0 ? 'before' : 'after',
          primaryKeys: Array.isArray(entry.key) ? entry.key : 
                      (entry.key ? [entry.key] : []),
          secondaryKeys: Array.isArray(entry.keysecondary) ? entry.keysecondary : 
                        (entry.keysecondary ? [entry.keysecondary] : []),
          selectiveLogic: entry.selectiveLogic || 'andAny',
          caseSensitive: entry.caseSensitive === undefined ? false : entry.caseSensitive,
          matchWholeWords: entry.matchWholeWords === undefined ? true : entry.matchWholeWords,
          excludeRecursion: entry.excludeRecursion || false,
          preventRecursion: entry.preventRecursion || false,
          delayUntilRecursion: entry.delayUntilRecursion || false,
          recursionLevel: entry.recursionLevel || 0,
          probability: entry.probability || 100,
          sticky: entry.sticky || 0,
          cooldown: entry.cooldown || 0,
          delay: entry.delay || 0,
          scanDepth: entry.scanDepth
        };
      });
    }

    // 提取设置
    const settings: WorldBookSettings = {
      scanDepth: json.settings?.scanDepth || 2,
      includeNames: json.settings?.includeNames === undefined ? true : json.settings.includeNames,
      maxRecursionSteps: json.settings?.maxRecursionSteps || 0,
      minActivations: json.settings?.minActivations || 0,
      maxDepth: json.settings?.maxDepth || 10,
      caseSensitive: json.settings?.caseSensitive || false,
      matchWholeWords: json.settings?.matchWholeWords || true
    };

    // 创建并保存世界书
    return await this.saveWorldBook({
      id: generateId(),
      name,
      description,
      entries,
      settings,
      characterIds: [],
      enabled: true
    });
  },

  /**
   * 导出世界书到JSON
   */
  async exportWorldBookToJSON(id: string): Promise<Record<string, any>> {
    const worldBook = await this.getWorldBook(id);
    if (!worldBook) {
      throw new Error('世界书不存在');
    }

    // 转换为兼容格式
    const entriesObj: Record<string, any> = {};
    worldBook.entries.forEach((entry, index) => {
      entriesObj[index] = {
        uid: entry.id,
        key: entry.primaryKeys,
        keysecondary: entry.secondaryKeys,
        comment: entry.title,
        content: entry.content,
        constant: entry.strategy === 'constant',
        vectorized: entry.strategy === 'vectorized',
        selective: entry.strategy === 'selective',
        selectiveLogic: entry.selectiveLogic,
        order: entry.order,
        position: entry.position === 'before' ? 0 : 4,
        disable: !entry.enabled,
        excludeRecursion: entry.excludeRecursion,
        preventRecursion: entry.preventRecursion,
        delayUntilRecursion: entry.delayUntilRecursion,
        probability: entry.probability,
        depth: 0,
        sticky: entry.sticky,
        cooldown: entry.cooldown,
        delay: entry.delay,
        scanDepth: entry.scanDepth,
        caseSensitive: entry.caseSensitive,
        matchWholeWords: entry.matchWholeWords
      };
    });

    return {
      name: worldBook.name,
      description: worldBook.description,
      entries: entriesObj,
      settings: worldBook.settings
    };
  },

  /**
   * 添加条目到世界书
   */
  async addEntry(worldBookId: string, entry: Partial<WorldBookEntry>): Promise<WorldBookEntry> {
    const worldBook = await this.getWorldBook(worldBookId);
    if (!worldBook) {
      throw new Error('世界书不存在');
    }

    // 生成唯一ID
    const entryId = generateId();
    console.log("生成新条目ID:", entryId);

    // 创建新条目
    const newEntry: WorldBookEntry = {
      id: entryId,
      title: entry.title || '新条目',
      content: entry.content || '',
      strategy: entry.strategy || 'selective',
      enabled: entry.enabled !== undefined ? entry.enabled : true,
      order: entry.order || 100,
      position: entry.position || 'after',
      primaryKeys: entry.primaryKeys || [],
      secondaryKeys: entry.secondaryKeys || [],
      selectiveLogic: entry.selectiveLogic || 'andAny',
      caseSensitive: entry.caseSensitive || false,
      matchWholeWords: entry.matchWholeWords !== undefined ? entry.matchWholeWords : true,
      excludeRecursion: entry.excludeRecursion || false,
      preventRecursion: entry.preventRecursion || false,
      delayUntilRecursion: entry.delayUntilRecursion || false,
      recursionLevel: entry.recursionLevel || 0,
      probability: entry.probability || 100,
      sticky: entry.sticky || 0,
      cooldown: entry.cooldown || 0,
      delay: entry.delay || 0,
      scanDepth: entry.scanDepth
    };

    // 添加到世界书
    worldBook.entries.push(newEntry);
    await this.saveWorldBook(worldBook);
    console.log("条目已添加到世界书，ID:", entryId);

    return newEntry;
  },

  /**
   * 更新世界书条目
   */
  async updateEntry(worldBookId: string, entry: WorldBookEntry): Promise<WorldBookEntry> {
    const worldBook = await this.getWorldBook(worldBookId);
    if (!worldBook) {
      throw new Error('世界书不存在');
    }

    // 查找并更新条目
    const entryIndex = worldBook.entries.findIndex(e => e.id === entry.id);
    if (entryIndex === -1) {
      throw new Error('条目不存在');
    }

    // 更新条目
    worldBook.entries[entryIndex] = entry;
    await this.saveWorldBook(worldBook);

    return entry;
  },

  /**
   * 切换条目启用状态
   */
  async toggleEntryEnabled(worldBookId: string, entryId: string): Promise<WorldBookEntry | undefined> {
    const worldBook = await this.getWorldBook(worldBookId);
    if (!worldBook) {
      throw new Error('世界书不存在');
    }

    // 查找条目
    const entryIndex = worldBook.entries.findIndex(e => e.id === entryId);
    if (entryIndex === -1) {
      throw new Error('条目不存在');
    }

    // 切换启用状态
    worldBook.entries[entryIndex].enabled = !worldBook.entries[entryIndex].enabled;
    await this.saveWorldBook(worldBook);

    return worldBook.entries[entryIndex];
  },

  /**
   * 删除世界书条目
   */
  async deleteEntry(worldBookId: string, entryId: string): Promise<void> {
    const worldBook = await this.getWorldBook(worldBookId);
    if (!worldBook) {
      throw new Error('世界书不存在');
    }

    // 过滤掉要删除的条目
    worldBook.entries = worldBook.entries.filter(entry => entry.id !== entryId);
    await this.saveWorldBook(worldBook);
  },

  /**
   * 更新世界书与角色的关联
   * 多对多关系：一个世界书可以关联多个角色，一个角色也可以关联多个世界书
   */
  async updateCharacterLinks(worldBookId: string, characterIds: string[]): Promise<void> {
    const db = await initDB();
    
    // 获取世界书
    const worldBook = await this.getWorldBook(worldBookId);
    if (!worldBook) {
      throw new Error('世界书不存在');
    }
    
    // 获取当前世界书的旧角色关联
    const oldCharacterIds = worldBook.characterIds || [];
    
    // 需要移除关联的角色IDs（在旧列表中但不在新列表中）
    const idsToRemove = oldCharacterIds.filter(id => !characterIds.includes(id));
    
    // 需要添加关联的角色IDs（在新列表中但不在旧列表中）
    const idsToAdd = characterIds.filter(id => !oldCharacterIds.includes(id));
    
    // 更新世界书的角色关联
    worldBook.characterIds = characterIds;
    await db.put('worldBooks', worldBook);
    
    // 更新角色的世界书关联
    // 1. 对于需要添加的角色，添加世界书ID到其worldBookIds
    for (const characterId of idsToAdd) {
      const character = await characterStorage.getCharacter(characterId);
      if (character) {
        character.worldBookIds = [...(character.worldBookIds || []), worldBookId];
        await db.put('characters', character);
      }
    }
    
    // 2. 对于需要移除的角色，从其worldBookIds中移除世界书ID
    for (const characterId of idsToRemove) {
      const character = await characterStorage.getCharacter(characterId);
      if (character && character.worldBookIds) {
        character.worldBookIds = character.worldBookIds.filter(id => id !== worldBookId);
        await db.put('characters', character);
      }
    }
  },

  /**
   * 将世界书关联到角色
   */
  async linkToCharacter(worldBookId: string, characterId: string): Promise<void> {
    const db = await initDB();
    
    // 获取世界书和角色
    const worldBook = await this.getWorldBook(worldBookId);
    const character = await characterStorage.getCharacter(characterId);
    
    if (!worldBook || !character) {
      throw new Error('世界书或角色不存在');
    }

    // 更新世界书的角色关联
    const characterIds = worldBook.characterIds || [];
    if (!characterIds.includes(characterId)) {
      worldBook.characterIds = [...characterIds, characterId];
      await db.put('worldBooks', worldBook);
    }
    
    // 更新角色的世界书关联
    const worldBookIds = character.worldBookIds || [];
    if (!worldBookIds.includes(worldBookId)) {
      character.worldBookIds = [...worldBookIds, worldBookId];
      await db.put('characters', character);
    }
  },

  /**
   * 解除世界书与角色的关联
   */
  async unlinkFromCharacter(worldBookId: string, characterId: string): Promise<void> {
    const db = await initDB();
    
    // 获取世界书和角色
    const worldBook = await this.getWorldBook(worldBookId);
    const character = await characterStorage.getCharacter(characterId);
    
    // 如果世界书或角色不存在，直接返回
    if (!worldBook && !character) {
      return;
    }

    // 更新世界书的角色关联
    if (worldBook && worldBook.characterIds) {
      worldBook.characterIds = worldBook.characterIds.filter(id => id !== characterId);
      await db.put('worldBooks', worldBook);
    }
    
    // 更新角色的世界书关联
    if (character && character.worldBookIds) {
      character.worldBookIds = character.worldBookIds.filter(id => id !== worldBookId);
      await db.put('characters', character);
    }
  },

  /**
   * 获取与角色关联的所有世界书
   */
  async getWorldBooksForCharacter(characterId: string): Promise<WorldBook[]> {
    const db = await initDB();
    
    // 获取角色信息
    const character = await characterStorage.getCharacter(characterId);
    if (!character || !character.worldBookIds || character.worldBookIds.length === 0) {
      return [];
    }
    
    // 获取所有世界书
    const allWorldBooks = await db.getAllFromIndex('worldBooks', 'by-name');
    
    // 过滤出与角色关联的启用的世界书
    return allWorldBooks.filter(worldBook => 
      worldBook.enabled && 
      character.worldBookIds?.includes(worldBook.id)
    );
  },
  
  /**
   * 获取与角色关联的世界书 (原有方法，保留向后兼容性)
   * 现在返回所有关联的启用世界书中的第一个
   */
  async getWorldBookForCharacter(characterId: string): Promise<WorldBook | undefined> {
    const worldBooks = await this.getWorldBooksForCharacter(characterId);
    return worldBooks.length > 0 ? worldBooks[0] : undefined;
  }
};

// 玩家存储接口
export const playerStorage = {
  async savePlayer(player: {
    id: string;
    name: string;
    description?: string;
    avatar?: string;
  }) {
    const db = await initDB();
    const now = Date.now();
    await db.put('players', {
      ...player,
      createdAt: player.id ? (await db.get('players', player.id))?.createdAt || now : now,
      updatedAt: now
    });
  },
  
  async getPlayer(id: string) {
    const db = await initDB();
    return db.get('players', id);
  },
  
  async getCurrentPlayer() {
    const db = await initDB();
    const players = await db.getAllFromIndex('players', 'by-updatedAt');
    // 返回最近更新的玩家作为当前玩家
    return players.length > 0 ? players[0] : null;
  },
  
  async listPlayers() {
    const db = await initDB();
    return db.getAllFromIndex('players', 'by-name');
  },
  
  async deletePlayer(id: string) {
    const db = await initDB();
    await db.delete('players', id);
  }
};

// 提示词预设存储接口
export const promptPresetStorage = {
  async savePromptPreset(preset: PromptPreset) {
    const db = await initDB();
    
    // 确保有创建和更新时间
    const now = Date.now();
    const updatedPreset = {
      ...preset,
      createdAt: preset.createdAt || now,
      updatedAt: now
    };
    
    await db.put('promptPresets', updatedPreset);
    return updatedPreset;
  },
  
  async getPromptPreset(id: string) {
    const db = await initDB();
    return db.get('promptPresets', id);
  },
  
  async listPromptPresets() {
    const db = await initDB();
    return db.getAllFromIndex('promptPresets', 'by-updatedAt');
  },
  
  async deletePromptPreset(id: string) {
    const db = await initDB();
    await db.delete('promptPresets', id);
  },
  
  // 导入预设函数
  async importPromptPresetFromJSON(json: any, fileName?: string): Promise<PromptPreset> {
    // 预设标识符
    const PLACEHOLDERS: Record<string, PlaceholderInfo> = {
      'charDescription': {
        type: 'charDescription',
        implemented: true,
        description: '角色描述'
      },
      'chatHistory': {
        type: 'chatHistory',
        implemented: true,
        description: '对话历史'
      },
      'worldInfoBefore': {
        type: 'worldInfo',
        implemented: true,
        description: '世界书信息'
      },
      'worldInfoAfter': {
        type: 'worldInfo',
        implemented: true,
        description: '世界书信息'
      },
      'personaDescription': {
        type: 'persona',
        implemented: true,
        description: '玩家角色信息'
      },
      'scenario': {
        type: 'scenario',
        implemented: false,
        description: '场景描述'
      },
      'dialogueExamples': {
        type: 'examples',
        implemented: false,
        description: '对话示例'
      },
      'jailbreak': {
        type: 'jailbreak',
        implemented: true,
        description: '特殊指令'
      },
    };
    
    // 提取提示词和排序
    const prompts = extractPromptItemsFromJSON(json, PLACEHOLDERS);
    
    // 提取模型参数
    const modelParams = extractModelParametersFromJSON(json);
    
    // 生成预设名称：优先级为 JSON内名称 > 文件名 > "导入的预设"
    let presetName = json.name;
    if (!presetName && fileName) {
      // 从文件名中提取名称（移除扩展名）
      presetName = fileName.replace(/\.json$/i, '');
    }
    
    // 创建预设对象
    const preset: PromptPreset = {
      id: generateId(),
      name: presetName || "导入的预设",
      description: json.description || "从JSON文件导入的预设",
      ...modelParams,
      prompts,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // 保存到数据库
    return await this.savePromptPreset(preset);
  },
  
  // 导出预设到文件
  async exportPromptPreset(id: string): Promise<Blob> {
    const preset = await this.getPromptPreset(id);
    if (!preset) {
      throw new Error('预设不存在');
    }
    
    const json = JSON.stringify(preset, null, 2);
    return new Blob([json], { type: 'application/json' });
  }
};

// 正则表达式脚本存储接口
export const regexStorage = {
  async saveRegexScript(script: RegexScript) {
    const db = await initDB();
    
    // 确保有作用域设置，默认为全局
    if (!script.scope) {
      script.scope = 'global';
    }
    
    // 如果是全局作用域，确保没有角色ID列表
    if (script.scope === 'global') {
      script.characterIds = [];
    } else if (script.scope === 'character' && (!script.characterIds || script.characterIds.length === 0)) {
      // 如果是角色作用域但没有关联角色，设为全局
      script.scope = 'global';
    }
    
    // 确保有文件夹ID，默认为"未分类"文件夹
    if (!script.folderId) {
      script.folderId = 'default';
    }
    
    // 确保有预设ID列表
    if (!script.presetIds) {
      script.presetIds = [];
    }
    
    await db.put('regex', script);
    return script;
  },
  
  // 关联正则表达式脚本到角色
  async linkToCharacter(scriptId: string, characterId: string): Promise<RegexScript | undefined> {
    const db = await initDB();
    const script = await db.get('regex', scriptId);
    
    if (!script) {
      console.error(`找不到正则表达式脚本: ${scriptId}`);
      return undefined;
    }
    
    // 设置为角色作用域
    script.scope = 'character';
    
    // 初始化或更新角色ID列表
    if (!script.characterIds) {
      script.characterIds = [];
    }
    
    // 如果未关联，则添加角色ID
    if (!script.characterIds.includes(characterId)) {
      script.characterIds.push(characterId);
      await db.put('regex', script);
      console.log(`正则表达式脚本 ${script.scriptName} (${scriptId}) 已关联到角色 ${characterId}`);
    }
    
    return script;
  },
  
  // 取消关联正则表达式脚本与角色
  async unlinkFromCharacter(scriptId: string, characterId: string): Promise<RegexScript | undefined> {
    const db = await initDB();
    const script = await db.get('regex', scriptId);
    
    if (!script) {
      console.error(`找不到正则表达式脚本: ${scriptId}`);
      return undefined;
    }
    
    // 如果角色ID存在于列表中，则移除
    if (script.characterIds && script.characterIds.includes(characterId)) {
      script.characterIds = script.characterIds.filter(id => id !== characterId);
      
      // 如果没有关联角色，则转换为全局作用域
      if (script.characterIds.length === 0) {
        script.scope = 'global';
      }
      
      await db.put('regex', script);
      console.log(`正则表达式脚本 ${script.scriptName} (${scriptId}) 已取消与角色 ${characterId} 的关联`);
    }
    
    return script;
  },
  
  // 关联正则表达式脚本到预设
  async linkToPreset(scriptId: string, presetId: string): Promise<RegexScript | undefined> {
    const db = await initDB();
    const script = await db.get('regex', scriptId);
    
    if (!script) {
      console.error(`找不到正则表达式脚本: ${scriptId}`);
      return undefined;
    }
    
    // 初始化或更新预设ID列表
    if (!script.presetIds) {
      script.presetIds = [];
    }
    
    // 如果未关联，则添加预设ID
    if (!script.presetIds.includes(presetId)) {
      script.presetIds.push(presetId);
      await db.put('regex', script);
      console.log(`正则表达式脚本 ${script.scriptName} (${scriptId}) 已关联到预设 ${presetId}`);
      
      // 同时更新预设的regexScriptIds
      await this.updatePresetRegexScripts(presetId);
    }
    
    return script;
  },
  
  // 取消关联正则表达式脚本与预设
  async unlinkFromPreset(scriptId: string, presetId: string): Promise<RegexScript | undefined> {
    const db = await initDB();
    const script = await db.get('regex', scriptId);
    
    if (!script) {
      console.error(`找不到正则表达式脚本: ${scriptId}`);
      return undefined;
    }
    
    // 如果预设ID存在于列表中，则移除
    if (script.presetIds && script.presetIds.includes(presetId)) {
      script.presetIds = script.presetIds.filter(id => id !== presetId);
      await db.put('regex', script);
      console.log(`正则表达式脚本 ${script.scriptName} (${scriptId}) 已取消与预设 ${presetId} 的关联`);
      
      // 同时更新预设的regexScriptIds
      await this.updatePresetRegexScripts(presetId);
    }
    
    return script;
  },
  
  // 更新预设的正则脚本ID列表
  async updatePresetRegexScripts(presetId: string): Promise<void> {
    const db = await initDB();
    const preset = await db.get('presets', presetId);
    
    if (!preset) {
      console.error(`找不到预设: ${presetId}`);
      return;
    }
    
    // 获取所有关联到该预设的脚本ID
    const allScripts = await this.listRegexScripts();
    const scriptIds = allScripts
      .filter(script => script.presetIds && script.presetIds.includes(presetId))
      .map(script => script.id);
    
    // 更新预设的regexScriptIds字段
    preset.regexScriptIds = scriptIds;
    await db.put('presets', preset);
  },
  
  async getRegexScript(id: string) {
    const db = await initDB();
    return db.get('regex', id);
  },
  
  async listRegexScripts() {
    const db = await initDB();
    return db.getAll('regex');
  },
  
  async deleteRegexScript(id: string) {
    const db = await initDB();
    
    // 获取脚本信息，用于更新关联
    const script = await db.get('regex', id);
    if (script) {
      // 如果脚本关联了预设，更新预设的regexScriptIds
      if (script.presetIds && script.presetIds.length > 0) {
        for (const presetId of script.presetIds) {
          await this.unlinkFromPreset(id, presetId);
        }
      }
    }
    
    await db.delete('regex', id);
  },
  
  // 导入正则表达式脚本
  async importRegexScriptFromFile(file: File): Promise<RegexScript | null> {
    try {
      const content = await file.text();
      const importedScript = JSON.parse(content);
      
      // 验证基本字段
      if (!importedScript.scriptName || !importedScript.findRegex) {
        throw new Error("无效的正则表达式脚本文件");
      }
      
      // 创建新的脚本ID以避免冲突
      const script: RegexScript = {
        ...importedScript,
        id: generateId() // 生成新ID
      };
      
      // 确保所有必需字段存在
      script.trimStrings = script.trimStrings || [];
      script.placement = script.placement || [2]; // 默认应用于AI响应
      script.disabled = script.disabled || false;
      script.markdownOnly = script.markdownOnly || false;
      script.promptOnly = script.promptOnly || false;
      script.runOnEdit = script.runOnEdit !== undefined ? script.runOnEdit : true;
      script.substituteRegex = script.substituteRegex || 0;
      
      // 保存到数据库
      await this.saveRegexScript(script);
      return script;
    } catch (error) {
      console.error("导入正则表达式脚本失败:", error);
      return null;
    }
  },
  
  // 获取角色关联的所有正则表达式脚本
  async getRegexScriptsForCharacter(characterId: string): Promise<RegexScript[]> {
    const db = await initDB();
    const allScripts = await db.getAll('regex');
    
    // 过滤出与指定角色关联的脚本
    return allScripts.filter(script => 
      script.scope === 'character' && 
      script.characterIds && 
      script.characterIds.includes(characterId)
    );
  },
  
  // 获取预设关联的所有正则表达式脚本
  async getRegexScriptsForPreset(presetId: string): Promise<RegexScript[]> {
    const db = await initDB();
    const allScripts = await db.getAll('regex');
    
    // 过滤出与指定预设关联的脚本
    return allScripts.filter(script => 
      script.presetIds && 
      script.presetIds.includes(presetId)
    );
  },
  
  // 获取所有活动的正则表达式脚本（考虑文件夹禁用状态）
  async getActiveRegexScripts(): Promise<RegexScript[]> {
    const db = await initDB();
    const allScripts = await db.getAll('regex');
    const folders = await regexFolderStorage.listFolders();
    
    // 创建禁用文件夹ID的集合
    const disabledFolderIds = new Set(
      folders
        .filter(folder => folder.disabled)
        .map(folder => folder.id)
    );
    
    // 过滤出活动的脚本（不在禁用文件夹中且自身未禁用）
    return allScripts.filter(script => 
      !script.disabled && 
      (!script.folderId || !disabledFolderIds.has(script.folderId))
    );
  }
};

// API密钥管理
export const apiKeyStorage = {
  // 获取单个API密钥
  async getApiKey(id: string): Promise<ApiKey | undefined> {
    const db = await initDB();
    return db.get('apiKeys', id);
  },
  
  // 获取所有API密钥，按优先级排序
  async listApiKeys(): Promise<ApiKey[]> {
    const db = await initDB();
    return db.getAllFromIndex('apiKeys', 'by-priority');
  },
  
  // 保存或更新API密钥
  async saveApiKey(apiKey: ApiKey): Promise<ApiKey> {
    const db = await initDB();
    
    // 确保有创建时间
    if (!apiKey.createdAt) {
      apiKey.createdAt = Date.now();
    }
    
    // 如果是新密钥，确保有ID和使用次数初始化为0
    if (!apiKey.id) {
      apiKey.id = generateId();
      apiKey.usageCount = 0;
    }
    
    await db.put('apiKeys', apiKey);
    return apiKey;
  },
  
  // 删除API密钥
  async deleteApiKey(id: string): Promise<void> {
    const db = await initDB();
    await db.delete('apiKeys', id);
  },
  
  // 增加API密钥使用次数
  async incrementApiKeyUsage(id: string): Promise<ApiKey | undefined> {
    console.log("incrementApiKeyUsage 被调用:", {
      id,
      environment: typeof window === 'undefined' ? 'server' : 'client'
    });

    const db = await initDB();
    const apiKey = await db.get('apiKeys', id);
    
    console.log("从数据库获取的API密钥:", apiKey ? {
      id: apiKey.id,
      name: apiKey.name,
      currentUsageCount: apiKey.usageCount,
      enabled: apiKey.enabled
    } : null);
    
    if (apiKey) {
      const oldCount = apiKey.usageCount || 0;
      apiKey.usageCount = oldCount + 1;
      apiKey.lastUsed = Date.now();
      
      console.log("准备更新API密钥:", {
        id: apiKey.id,
        name: apiKey.name,
        oldCount,
        newCount: apiKey.usageCount
      });
      
      await db.put('apiKeys', apiKey);
      
      console.log("API密钥更新完成:", {
        id: apiKey.id,
        name: apiKey.name,
        finalUsageCount: apiKey.usageCount
      });
      
      return apiKey;
    } else {
      console.log("未找到指定ID的API密钥:", id);
    }
    
    return undefined;
  },
  
  // 获取API密钥设置
  async getApiKeySettings(): Promise<ApiKeySettings> {
    const db = await initDB();
    // 使用固定ID "settings" 存储单例设置
    let settings = await db.get('apiKeySettings', 'settings');
    
    // 如果设置不存在，创建默认设置
    if (!settings) {
      settings = {
        id: 'settings',
        rotationStrategy: 'sequential',
        activeKeyId: null,
        switchTiming: 'threshold',
        switchThreshold: 50,
        rotationEnabled: false // 默认关闭轮询，需要手动启用
      };
      await db.put('apiKeySettings', settings);
      return settings;
    }
    
    // 兼容旧版本：如果存在autoSwitch字段或缺少rotationEnabled字段，转换为新格式
    if ('autoSwitch' in settings || !('rotationEnabled' in settings)) {
      const oldSettings = settings as any;
      settings = {
        id: 'settings',
        rotationStrategy: settings.rotationStrategy,
        activeKeyId: settings.activeKeyId,
        switchTiming: oldSettings.autoSwitch ? 'threshold' : (settings.switchTiming || 'threshold'),
        switchThreshold: settings.switchThreshold || 50,
        rotationEnabled: oldSettings.autoSwitch || false
      };
      await db.put('apiKeySettings', settings);
    }
    
    return settings;
  },
  
  // 更新API密钥设置
  async updateApiKeySettings(settings: Partial<ApiKeySettings>): Promise<ApiKeySettings> {
    const db = await initDB();
    const currentSettings = await this.getApiKeySettings();
    
    // 合并设置
    const updatedSettings = {
      ...currentSettings,
      ...settings,
      id: 'settings' // 确保ID不变
    };
    
    await db.put('apiKeySettings', updatedSettings);
    return updatedSettings;
  },
  
  // 获取下一个可用的API密钥（根据轮询策略和切换时机）
  async getNextApiKey(): Promise<ApiKey | undefined> {
    const settings = await this.getApiKeySettings();
    const allKeys = await this.listApiKeys();
    
    // 过滤出已启用的密钥
    const enabledKeys = allKeys.filter(key => key.enabled);
    
    if (enabledKeys.length === 0) {
      return undefined;
    }
    
    // 根据切换时机决定逻辑
    if (settings.switchTiming === 'every-call') {
      // 每次调用都切换：直接根据策略选择
      return this.selectKeyByStrategy(enabledKeys, settings);
    } else {
      // 达到阈值后切换：检查当前密钥是否需要切换
      return this.selectKeyWithThreshold(enabledKeys, settings);
    }
  },
  
  // 根据策略选择密钥（用于每次调用切换）
  async selectKeyByStrategy(enabledKeys: ApiKey[], settings: ApiKeySettings): Promise<ApiKey> {
    switch (settings.rotationStrategy) {
      case 'random':
        // 随机选择一个密钥
        return enabledKeys[Math.floor(Math.random() * enabledKeys.length)];
        
      case 'least-used':
        // 选择使用次数最少的密钥
        return enabledKeys.sort((a, b) => (a.usageCount || 0) - (b.usageCount || 0))[0];
        
      case 'sequential':
      default:
        // 顺序轮换：找到当前活动密钥的下一个
        const currentIndex = enabledKeys.findIndex(key => key.id === settings.activeKeyId);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % enabledKeys.length;
        const nextKey = enabledKeys[nextIndex];
        
        // 更新活动密钥ID
        await this.updateApiKeySettings({ activeKeyId: nextKey.id });
        return nextKey;
    }
  },
  
  // 根据阈值选择密钥（用于达到阈值后切换）
  async selectKeyWithThreshold(enabledKeys: ApiKey[], settings: ApiKeySettings): Promise<ApiKey> {
    // 找到当前活动密钥
    const currentKey = enabledKeys.find(key => key.id === settings.activeKeyId);
    
    // 如果没有当前密钥或已达到阈值，需要切换
    const needSwitch = !currentKey || 
                      !settings.activeKeyId || 
                      (currentKey.usageCount || 0) >= settings.switchThreshold;
    
    if (!needSwitch) {
      // 继续使用当前密钥
      return currentKey!;
    }
    
    // 需要切换，根据策略选择下一个密钥
    let nextKey: ApiKey;
    
    switch (settings.rotationStrategy) {
      case 'random':
        // 随机选择一个不同的密钥（如果有多个的话）
        const otherKeys = enabledKeys.filter(key => key.id !== settings.activeKeyId);
        if (otherKeys.length > 0) {
          nextKey = otherKeys[Math.floor(Math.random() * otherKeys.length)];
        } else {
          nextKey = enabledKeys[0]; // 只有一个密钥时使用它
        }
        break;
        
      case 'least-used':
        // 选择使用次数最少的密钥
        nextKey = enabledKeys.sort((a, b) => (a.usageCount || 0) - (b.usageCount || 0))[0];
        break;
        
      case 'sequential':
      default:
        // 顺序选择下一个密钥
        const currentIndex = enabledKeys.findIndex(key => key.id === settings.activeKeyId);
        const nextIndex = (currentIndex + 1) % enabledKeys.length;
        nextKey = enabledKeys[nextIndex];
        break;
    }
    
    // 更新活动密钥ID
    await this.updateApiKeySettings({ activeKeyId: nextKey.id });
    return nextKey;
  },
  
  // 获取当前活动的API密钥
  async getActiveApiKey(): Promise<ApiKey | undefined> {
    console.log("getActiveApiKey 被调用");
    
    const settings = await this.getApiKeySettings();
    const allKeys = await this.listApiKeys();
    const enabledKeys = allKeys.filter(key => key.enabled);
    
    console.log("API密钥状态:", {
      totalKeys: allKeys.length,
      enabledKeys: enabledKeys.length,
      rotationEnabled: settings.rotationEnabled,
      activeKeyId: settings.activeKeyId,
      keyNames: enabledKeys.map(k => k.name)
    });
    
    if (enabledKeys.length === 0) {
      console.log("没有启用的API密钥");
      return undefined;
    }
    
    // 优先级逻辑：轮询启用时，轮询系统优先级高于手动设置
    if (settings.rotationEnabled) {
      // 轮询系统启用，使用轮询逻辑
      console.log("使用轮询系统选择API密钥");
      const nextKey = await this.getNextApiKey();
      console.log("轮询系统选择的密钥:", nextKey ? {
        id: nextKey.id,
        name: nextKey.name,
        usageCount: nextKey.usageCount
      } : null);
      return nextKey;
    } else {
      // 轮询系统关闭，使用手动设置的活动密钥
      console.log("使用手动设置的活动密钥");
      
      if (!settings.activeKeyId) {
        // 如果没有手动设置活动密钥，返回第一个可用密钥
        console.log("没有手动设置活动密钥，使用第一个可用密钥:", enabledKeys[0]?.name);
        return enabledKeys[0];
      }
      
      // 获取手动设置的活动密钥
      const activeKey = await this.getApiKey(settings.activeKeyId);
      console.log("手动设置的活动密钥:", activeKey ? {
        id: activeKey.id,
        name: activeKey.name,
        enabled: activeKey.enabled,
        usageCount: activeKey.usageCount
      } : null);
      
      // 如果活动密钥不存在或已禁用，返回第一个可用密钥
      if (!activeKey || !activeKey.enabled) {
        console.log("活动密钥不可用，使用第一个可用密钥:", enabledKeys[0]?.name);
        return enabledKeys[0];
      }
      
      return activeKey;
    }
  }
};

// 从JSON提取提示词条目
function extractPromptItemsFromJSON(json: any, placeholders: Record<string, PlaceholderInfo>): PromptPresetItem[] {
  const prompts: PromptPresetItem[] = [];
  
  // 如果有prompt_order数组，按照其顺序处理
  if (json.prompt_order && Array.isArray(json.prompt_order)) {
    // 找到characterId为100001的部分（或其他合适的ID）
    const characterOrder = json.prompt_order.find(
      (po: any) => po.character_id === 100001
    ) || json.prompt_order[0]; // 如果没有找到指定ID，使用第一个
    
    if (characterOrder?.order && Array.isArray(characterOrder.order)) {
      // 遍历order数组
      characterOrder.order.forEach((orderItem: any) => {
        // 在prompts数组中查找对应的提示词
        if (json.prompts && Array.isArray(json.prompts)) {
          const matchingPrompt = json.prompts.find(
            (p: any) => p.identifier === orderItem.identifier
          );
          
          if (matchingPrompt) {
            const promptItem: PromptPresetItem = {
              identifier: orderItem.identifier,
              name: matchingPrompt.name || "未命名提示词",
              content: matchingPrompt.content || "",
              enabled: orderItem.enabled || false
            };
            
            // 检查是否为占位条目
            if (matchingPrompt.marker === true) {
              promptItem.isPlaceholder = true;
              promptItem.placeholderType = orderItem.identifier;
              
              // 检查是否已实现
              const placeholderInfo = placeholders[orderItem.identifier];
              if (placeholderInfo) {
                promptItem.implemented = placeholderInfo.implemented;
              } else {
                promptItem.implemented = false;
              }
            }
            
            prompts.push(promptItem);
          }
        }
      });
    }
  } else if (json.prompts && Array.isArray(json.prompts)) {
    // 没有排序信息，直接使用prompts数组
    json.prompts.forEach((p: any) => {
      if (p.identifier) {
        const promptItem: PromptPresetItem = {
          identifier: p.identifier,
          name: p.name || "未命名提示词",
          content: p.content || "",
          enabled: p.enabled !== undefined ? p.enabled : true
        };
        
        // 检查是否为占位条目
        if (p.marker === true) {
          promptItem.isPlaceholder = true;
          promptItem.placeholderType = p.identifier;
          
          // 检查是否已实现
          const placeholderInfo = placeholders[p.identifier];
          if (placeholderInfo) {
            promptItem.implemented = placeholderInfo.implemented;
          } else {
            promptItem.implemented = false;
          }
        }
        
        prompts.push(promptItem);
      }
    });
  }
  
  return prompts;
}

// 从JSON提取模型参数
function extractModelParametersFromJSON(json: any) {
  return {
    temperature: json.temperature !== undefined ? Number(json.temperature) : undefined,
    maxTokens: json.openai_max_tokens !== undefined ? Number(json.openai_max_tokens) : undefined,
    topK: json.top_k !== undefined ? Number(json.top_k) : undefined,
    topP: json.top_p !== undefined ? Number(json.top_p) : undefined,
  };
}

// 导出/导入功能
export const dataExport = {
  async exportConversation(id: string) {
    const conversation = await conversationStorage.getConversation(id);
    if (!conversation) return null;
    
    const blob = new Blob([JSON.stringify(conversation, null, 2)], { type: 'application/json' });
    return URL.createObjectURL(blob);
  },
  
  async exportPreset(id: string) {
    const preset = await presetStorage.getPreset(id);
    if (!preset) return null;
    
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
    return URL.createObjectURL(blob);
  },
  
  async importConversation(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.id || !data.title || !Array.isArray(data.messages)) {
        throw new Error('无效的对话格式');
      }
      
      // 生成新ID避免覆盖
      const newId = generateId();
      await conversationStorage.saveConversation(
        newId,
        data.title,
        data.messages,
        data.systemPrompt
      );
      
      return newId;
    } catch (error) {
      console.error('导入对话失败:', error);
      return null;
    }
  },
  
  async importPreset(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.name || !data.systemPrompt) {
        throw new Error('无效的预设格式');
      }
      
      // 生成新ID避免覆盖
      const newId = generateId();
      await presetStorage.savePreset({
        ...data,
        id: newId
      });
      
      return newId;
    } catch (error) {
      console.error('导入预设失败:', error);
      return null;
    }
  }
}; 

// 从角色卡数据导入正则表达式脚本
async function importRegexScriptsFromCharacterData(characterId: string, characterName: string, regexScripts: any[]): Promise<string[]> {
  if (!regexScripts || !Array.isArray(regexScripts) || regexScripts.length === 0) {
    return [];
  }

  console.log(`发现角色卡中的正则表达式数据，共 ${regexScripts.length} 个脚本，开始导入...`);
  
  const importedScriptIds: string[] = [];
  const importedScriptNames: string[] = [];
  
  try {
    // 创建以角色名命名的文件夹
    const folderName = `${characterName}的正则`;
    const folderDescription = `角色"${characterName}"导入的正则脚本`;
    
    // 检查是否已存在同名文件夹
    const allFolders = await regexFolderStorage.listFolders();
    let characterFolder = allFolders.find(folder => folder.name === folderName);
    
    // 如果不存在，则创建新文件夹
    if (!characterFolder) {
      characterFolder = await regexFolderStorage.createFolder({
        name: folderName,
        description: folderDescription,
        disabled: false,
        type: 'character' // 设置为角色专属文件夹类型
      });
      console.log(`为角色"${characterName}"创建了正则文件夹，ID: ${characterFolder.id}`);
    }
    
    // 获取文件夹ID
    const folderId = characterFolder.id;
    
    // 导入脚本并放入文件夹
    for (const scriptData of regexScripts) {
      try {
        // 生成新ID避免覆盖
        const newId = generateId();
        
        // 确保脚本有作用域设置，设为局部作用域
        const script: RegexScript = {
          ...scriptData,
          id: newId,
          scope: 'character', // 设置为局部作用域
          characterIds: [characterId], // 关联到角色
          folderId: folderId // 放入角色专属文件夹
        };
        
        // 保存到数据库
        await regexStorage.saveRegexScript(script);
        
        importedScriptIds.push(newId);
        importedScriptNames.push(script.scriptName);
        
        console.log(`成功导入正则表达式脚本: ${script.scriptName}, ID: ${newId}, 文件夹: ${folderName}`);
      } catch (error) {
        console.error('导入正则表达式脚本失败:', error);
      }
    }
  } catch (error) {
    console.error('创建角色正则文件夹失败:', error);
  }
  
  return importedScriptNames;
}

// 正则表达式文件夹存储接口
export const regexFolderStorage = {
  // 创建文件夹
  async createFolder(folderData: Partial<RegexFolder>): Promise<RegexFolder> {
    const db = await initDB();
    
    // 创建新文件夹
    const folder: RegexFolder = {
      id: folderData.id || generateId(),
      name: folderData.name || '新文件夹',
      description: folderData.description || '',
      parentId: folderData.parentId,
      disabled: folderData.disabled || false,
      type: folderData.type || 'global', // 默认为全局文件夹
      createdAt: Date.now(),
      updatedAt: Date.now(),
      presetIds: folderData.presetIds || []
    };
    
    await db.put('regexFolders', folder);
    return folder;
  },
  
  // 更新文件夹
  async updateFolder(id: string, updates: Partial<RegexFolder>): Promise<RegexFolder | undefined> {
    const db = await initDB();
    const folder = await db.get('regexFolders', id);
    
    if (!folder) {
      console.error(`找不到文件夹: ${id}`);
      return undefined;
    }
    
    // 保护默认文件夹不被删除或重命名
    if (id === 'default' && (updates.name || updates.description)) {
      // 允许更新禁用状态，但不允许修改名称和描述
      const updatedFolder = {
        ...folder,
        disabled: updates.disabled !== undefined ? updates.disabled : folder.disabled,
        updatedAt: Date.now()
      };
      
      await db.put('regexFolders', updatedFolder);
      return updatedFolder;
    }
    
    // 更新文件夹信息
    const updatedFolder = {
      ...folder,
      ...updates,
      updatedAt: Date.now()
    };
    
    await db.put('regexFolders', updatedFolder);
    return updatedFolder;
  },
  
  // 删除文件夹
  async deleteFolder(id: string): Promise<void> {
    const db = await initDB();
    
    // 保护默认文件夹不被删除
    if (id === 'default') {
      console.error('默认文件夹不能被删除');
      return;
    }
    
    // 获取该文件夹中的所有正则脚本
    const allScripts = await regexStorage.listRegexScripts();
    const scriptsInFolder = allScripts.filter(script => script.folderId === id);
    
    // 将文件夹中的脚本移动到默认文件夹
    for (const script of scriptsInFolder) {
      script.folderId = 'default';
      await regexStorage.saveRegexScript(script);
    }
    
    // 删除文件夹
    await db.delete('regexFolders', id);
  },
  
  // 获取文件夹
  async getFolder(id: string): Promise<RegexFolder | undefined> {
    const db = await initDB();
    return db.get('regexFolders', id);
  },
  
  // 获取所有文件夹
  async listFolders(): Promise<RegexFolder[]> {
    const db = await initDB();
    return db.getAll('regexFolders');
  },
  
  // 启用文件夹
  async enableFolder(id: string): Promise<RegexFolder | undefined> {
    return this.updateFolder(id, { disabled: false });
  },
  
  // 禁用文件夹
  async disableFolder(id: string): Promise<RegexFolder | undefined> {
    return this.updateFolder(id, { disabled: true });
  },
  
  // 获取文件夹中的所有正则脚本
  async getScriptsInFolder(folderId: string): Promise<RegexScript[]> {
    const allScripts = await regexStorage.listRegexScripts();
    return allScripts.filter(script => script.folderId === folderId);
  },
  
  // 判断文件夹是否为局部正则文件夹（只包含角色专属正则）
  async isCharacterRegexFolder(folderId: string): Promise<boolean> {
    // 获取文件夹中的所有脚本
    const scripts = await this.getScriptsInFolder(folderId);
    
    // 如果文件夹为空，不认为它是局部正则文件夹
    if (scripts.length === 0) {
      return false;
    }
    
    // 检查是否所有脚本都是角色专属的（scope === 'character'）
    return scripts.every(script => script.scope === 'character');
  },
  
  // 将正则脚本移动到指定文件夹
  async moveScriptToFolder(scriptId: string, folderId: string): Promise<RegexScript | undefined> {
    const script = await regexStorage.getRegexScript(scriptId);
    if (!script) {
      console.error(`找不到正则脚本: ${scriptId}`);
      return undefined;
    }
    
    // 检查目标文件夹是否存在
    const folder = await this.getFolder(folderId);
    if (!folder) {
      console.error(`找不到目标文件夹: ${folderId}`);
      return undefined;
    }
    
    // 更新脚本的文件夹ID
    script.folderId = folderId;
    return await regexStorage.saveRegexScript(script);
  },
  
  // 关联文件夹到预设
  async linkToPreset(folderId: string, presetId: string): Promise<RegexFolder | undefined> {
    const db = await initDB();
    const folder = await db.get('regexFolders', folderId);
    
    if (!folder) {
      console.error(`找不到文件夹: ${folderId}`);
      return undefined;
    }
    
    // 初始化或更新预设ID列表
    if (!folder.presetIds) {
      folder.presetIds = [];
    }
    
    // 如果未关联，则添加预设ID
    if (!folder.presetIds.includes(presetId)) {
      folder.presetIds.push(presetId);
      folder.updatedAt = Date.now();
      await db.put('regexFolders', folder);
      console.log(`文件夹 ${folder.name} (${folderId}) 已关联到预设 ${presetId}`);
      
      // 同时更新预设的regexFolderIds
      await this.updatePresetRegexFolders(presetId);
    }
    
    return folder;
  },
  
  // 取消关联文件夹与预设
  async unlinkFromPreset(folderId: string, presetId: string): Promise<RegexFolder | undefined> {
    const db = await initDB();
    const folder = await db.get('regexFolders', folderId);
    
    if (!folder) {
      console.error(`找不到文件夹: ${folderId}`);
      return undefined;
    }
    
    // 如果预设ID存在于列表中，则移除
    if (folder.presetIds && folder.presetIds.includes(presetId)) {
      folder.presetIds = folder.presetIds.filter(id => id !== presetId);
      folder.updatedAt = Date.now();
      await db.put('regexFolders', folder);
      console.log(`文件夹 ${folder.name} (${folderId}) 已取消与预设 ${presetId} 的关联`);
      
      // 同时更新预设的regexFolderIds
      await this.updatePresetRegexFolders(presetId);
    }
    
    return folder;
  },
  
  // 更新预设的正则文件夹ID列表
  async updatePresetRegexFolders(presetId: string): Promise<void> {
    const db = await initDB();
    const preset = await db.get('presets', presetId);
    
    if (!preset) {
      console.error(`找不到预设: ${presetId}`);
      return;
    }
    
    // 获取所有关联到该预设的文件夹ID
    const allFolders = await this.listFolders();
    const folderIds = allFolders
      .filter(folder => folder.presetIds && folder.presetIds.includes(presetId))
      .map(folder => folder.id);
    
    // 更新预设的regexFolderIds字段
    preset.regexFolderIds = folderIds;
    await db.put('presets', preset);
  },
  
  // 获取预设关联的所有文件夹
  async getFoldersForPreset(presetId: string): Promise<RegexFolder[]> {
    const db = await initDB();
    const allFolders = await db.getAll('regexFolders');
    
    // 过滤出与指定预设关联的文件夹
    return allFolders.filter(folder => 
      folder.presetIds && 
      folder.presetIds.includes(presetId)
    );
  }
};