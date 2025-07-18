import { openDB, DBSchema } from 'idb';
import { Message, UserSettings, Character } from './types';
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
  return openDB<AppDB>('ai-roleplay-db', 2, {
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
    }
  });
};

// 对话存储接口
export const conversationStorage = {
  async saveConversation(id: string, title: string, messages: Message[], systemPrompt?: string) {
    const db = await initDB();
    await db.put('conversations', {
      id,
      title,
      messages,
      systemPrompt,
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