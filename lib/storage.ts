import { openDB, DBSchema } from 'idb';
import { Message, UserSettings, Character, Branch } from './types';
import { generateId, extractCharaDataFromPng } from './utils';

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
    };
    indexes: { 'by-name': string };
  };
}

// 初始化数据库
export const initDB = async () => {
  return openDB<AppDB>('ai-roleplay-db', 3, {
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

      // 版本2: 添加characters表
      if (oldVersion < 2) {
        // 存储角色
        if (!db.objectStoreNames.contains('characters')) {
          const characterStore = db.createObjectStore('characters', { keyPath: 'id' });
          characterStore.createIndex('by-name', 'name');
        }
      }
      
      // 版本3: 更新数据结构支持分支功能
      if (oldVersion < 3) {
        console.log("升级数据库到版本3，添加分支支持");
        // 数据迁移将在单独的函数中进行，以避免阻塞版本升级事务
      }
    }
  });
};

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
  async saveConversation(id: string, title: string, messages: Message[], systemPrompt?: string, branches?: Branch[], currentBranchId?: string | null) {
    const db = await initDB();
    
    // 如果未提供分支信息，尝试获取现有信息
    if (!branches || !currentBranchId) {
      try {
        const existingConv = await db.get('conversations', id);
        branches = branches || existingConv?.branches;
        currentBranchId = currentBranchId || existingConv?.currentBranchId;
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
          
          // 将父分支消息添加到结果中
          branchMessages = [...parentMessages, ...branchMessages];
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
  }) {
    const db = await initDB();
    const now = Date.now();
    await db.put('presets', {
      ...preset,
      createdAt: preset.id ? (await db.get('presets', preset.id))?.createdAt || now : now,
      updatedAt: now
    });
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
  
  async importCharacter(file: File) {
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
      return null;
    }
  },

  async importJsonCharacter(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // 导入基本信息
      let characterData: any = {
        name: "",
        description: "",
        firstMessage: "",
        alternateGreetings: [],
        tags: []
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
      await this.saveCharacter({
        ...characterData,
        id: newId
      });
      
      return newId;
    } catch (error) {
      console.error('导入JSON角色卡失败:', error);
      return null;
    }
  },

  async importPngCharacter(file: File) {
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
        tags: []
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
      
      // 生成新ID并保存角色
      const newId = generateId();
      await this.saveCharacter({
        ...characterData,
        id: newId
      });
      
      return newId;
    } catch (error) {
      console.error('导入PNG角色卡失败:', error);
      return null;
    }
  }
};

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