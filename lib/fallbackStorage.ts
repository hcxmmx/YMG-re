// Vercel环境下的后备存储方案
// 使用localStorage作为IndexedDB的后备

interface FallbackApiKey {
  id: string;
  name: string;
  key: string;
  enabled: boolean;
  usageCount: number;
  lastUsed: number;
}

interface FallbackSettings {
  rotationStrategy: 'sequential' | 'random' | 'least-used';
  activeKeyId: string | null;
  switchTiming: 'every-call' | 'threshold';
  switchThreshold: number;
  rotationEnabled: boolean;
}

class FallbackStorage {
  private readonly KEYS_STORAGE_KEY = 'fallback_api_keys';
  private readonly SETTINGS_STORAGE_KEY = 'fallback_api_settings';

  // 检测是否需要使用后备存储
  shouldUseFallback(): boolean {
    // 检测是否在Vercel环境或IndexedDB不可用
    if (typeof window === 'undefined') return true;
    
    try {
      // 简单检测IndexedDB是否可用
      if (!window.indexedDB) return true;
      
      // 检测是否在无痕模式或受限环境
      const test = window.indexedDB.open('test');
      return false;
    } catch (error) {
      return true;
    }
  }

  // 获取API密钥列表
  getApiKeys(): FallbackApiKey[] {
    try {
      const stored = localStorage.getItem(this.KEYS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('获取后备API密钥失败:', error);
      return [];
    }
  }

  // 保存API密钥列表
  saveApiKeys(keys: FallbackApiKey[]): void {
    try {
      localStorage.setItem(this.KEYS_STORAGE_KEY, JSON.stringify(keys));
    } catch (error) {
      console.error('保存后备API密钥失败:', error);
    }
  }

  // 增加使用计数
  incrementUsage(keyId: string): FallbackApiKey | null {
    const keys = this.getApiKeys();
    const keyIndex = keys.findIndex(k => k.id === keyId);
    
    if (keyIndex >= 0) {
      keys[keyIndex].usageCount = (keys[keyIndex].usageCount || 0) + 1;
      keys[keyIndex].lastUsed = Date.now();
      this.saveApiKeys(keys);
      
      console.log('后备存储：API密钥使用计数已更新', {
        keyId,
        name: keys[keyIndex].name,
        newCount: keys[keyIndex].usageCount
      });
      
      return keys[keyIndex];
    }
    
    return null;
  }

  // 获取设置
  getSettings(): FallbackSettings {
    try {
      const stored = localStorage.getItem(this.SETTINGS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {
        rotationStrategy: 'sequential',
        activeKeyId: null,
        switchTiming: 'threshold',
        switchThreshold: 100,
        rotationEnabled: false
      };
    } catch (error) {
      console.error('获取后备设置失败:', error);
      return {
        rotationStrategy: 'sequential',
        activeKeyId: null,
        switchTiming: 'threshold',
        switchThreshold: 100,
        rotationEnabled: false
      };
    }
  }

  // 获取活动API密钥
  getActiveApiKey(): FallbackApiKey | null {
    const keys = this.getApiKeys();
    const enabledKeys = keys.filter(k => k.enabled);
    const settings = this.getSettings();
    
    if (enabledKeys.length === 0) return null;
    
    if (settings.rotationEnabled) {
      // 使用轮询逻辑
      if (settings.rotationStrategy === 'least-used') {
        return enabledKeys.reduce((prev, curr) => 
          (curr.usageCount || 0) < (prev.usageCount || 0) ? curr : prev
        );
      } else if (settings.rotationStrategy === 'random') {
        return enabledKeys[Math.floor(Math.random() * enabledKeys.length)];
      } else {
        // sequential - 简化版，返回第一个
        return enabledKeys[0];
      }
    } else {
      // 手动选择
      if (settings.activeKeyId) {
        const activeKey = enabledKeys.find(k => k.id === settings.activeKeyId);
        if (activeKey) return activeKey;
      }
      return enabledKeys[0];
    }
  }
}

export const fallbackStorage = new FallbackStorage();
