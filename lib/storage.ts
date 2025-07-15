import { openDB, DBSchema } from 'idb';
import { Message, UserSettings } from './types';
import { generateId } from './utils';

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
}

// 初始化数据库
export const initDB = async () => {
  return openDB<AppDB>('ai-roleplay-db', 1, {
    upgrade(db) {
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