import { initDB } from './storage';
import { ExportOptions } from '@/components/ui/data-export-import';
import { UserSettings } from './types';
import { useSettingsStore } from './store';

/**
 * 导出所有选定的数据
 * @param options 导出选项
 * @returns 包含导出数据的Blob对象
 */
export async function exportData(options: ExportOptions): Promise<Blob> {
  const db = await initDB();
  const exportData: Record<string, any> = {
    metadata: {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      appName: 'AI对话平台'
    }
  };

  // 导出对话历史
  if (options.conversations) {
    const conversations = await db.getAll('conversations');
    exportData.conversations = conversations;
  }

  // 导出角色
  if (options.characters) {
    const characters = await db.getAll('characters');
    exportData.characters = characters;
  }

  // 导出预设
  if (options.presets) {
    const presets = await db.getAll('presets');
    exportData.presets = presets;
  }

  // 导出提示词预设
  if (options.promptPresets) {
    const promptPresets = await db.getAll('promptPresets');
    exportData.promptPresets = promptPresets;
  }

  // 导出玩家
  if (options.players) {
    const players = await db.getAll('players');
    exportData.players = players;
  }

  // 导出世界书
  if (options.worldBooks) {
    const worldBooks = await db.getAll('worldBooks');
    exportData.worldBooks = worldBooks;
  }

  // 导出正则脚本
  if (options.regexScripts) {
    const regexScripts = await db.getAll('regex');
    exportData.regexScripts = regexScripts;
  }

  // 导出正则文件夹
  if (options.regexFolders) {
    const regexFolders = await db.getAll('regexFolders');
    exportData.regexFolders = regexFolders;
  }

  // 导出API密钥
  if (options.apiKeys) {
    const apiKeys = await db.getAll('apiKeys');
    const apiKeySettings = await db.get('apiKeySettings', 'settings');
    exportData.apiKeys = {
      keys: apiKeys,
      settings: apiKeySettings
    };
  }

  // 导出设置
  if (options.settings) {
    const settings = useSettingsStore.getState().settings;
    const uiSettings = useSettingsStore.getState().uiSettings;
    exportData.settings = {
      userSettings: settings,
      uiSettings: uiSettings
    };
  }

  // 创建JSON字符串并转换为Blob
  const jsonString = JSON.stringify(exportData, null, 2);
  return new Blob([jsonString], { type: 'application/json' });
}

/**
 * 导入数据
 * @param file 导入的JSON文件
 */
export async function importData(file: File): Promise<{
  success: boolean;
  message: string;
  importedCategories: string[];
}> {
  try {
    // 读取文件内容
    const fileContent = await file.text();
    const data = JSON.parse(fileContent);

    // 验证文件格式
    if (!data.metadata) {
      return {
        success: false,
        message: '无效的数据文件格式',
        importedCategories: []
      };
    }

    const db = await initDB();
    const importedCategories: string[] = [];

    // 导入对话历史
    if (data.conversations && Array.isArray(data.conversations)) {
      await db.clear('conversations');
      for (const conversation of data.conversations) {
        await db.put('conversations', conversation);
      }
      importedCategories.push('对话历史');
    }

    // 导入角色
    if (data.characters && Array.isArray(data.characters)) {
      await db.clear('characters');
      for (const character of data.characters) {
        await db.put('characters', character);
      }
      importedCategories.push('角色');
    }

    // 导入预设
    if (data.presets && Array.isArray(data.presets)) {
      await db.clear('presets');
      for (const preset of data.presets) {
        await db.put('presets', preset);
      }
      importedCategories.push('预设');
    }

    // 导入提示词预设
    if (data.promptPresets && Array.isArray(data.promptPresets)) {
      await db.clear('promptPresets');
      for (const promptPreset of data.promptPresets) {
        await db.put('promptPresets', promptPreset);
      }
      importedCategories.push('提示词预设');
    }

    // 导入玩家
    if (data.players && Array.isArray(data.players)) {
      await db.clear('players');
      for (const player of data.players) {
        await db.put('players', player);
      }
      importedCategories.push('玩家');
    }

    // 导入世界书
    if (data.worldBooks && Array.isArray(data.worldBooks)) {
      await db.clear('worldBooks');
      for (const worldBook of data.worldBooks) {
        await db.put('worldBooks', worldBook);
      }
      importedCategories.push('世界书');
    }

    // 导入正则脚本
    if (data.regexScripts && Array.isArray(data.regexScripts)) {
      await db.clear('regex');
      for (const regexScript of data.regexScripts) {
        await db.put('regex', regexScript);
      }
      importedCategories.push('正则脚本');
    }

    // 导入正则文件夹
    if (data.regexFolders && Array.isArray(data.regexFolders)) {
      await db.clear('regexFolders');
      for (const regexFolder of data.regexFolders) {
        await db.put('regexFolders', regexFolder);
      }
      importedCategories.push('正则文件夹');
    }

    // 导入API密钥
    if (data.apiKeys) {
      if (data.apiKeys.keys) {
        await db.clear('apiKeys');
        for (const apiKey of data.apiKeys.keys) {
          await db.put('apiKeys', apiKey);
        }
      }
      if (data.apiKeys.settings) {
        await db.put('apiKeySettings', data.apiKeys.settings);
      }
      importedCategories.push('API密钥');
    }

    // 导入设置
    if (data.settings) {
      if (data.settings.userSettings) {
        useSettingsStore.getState().updateSettings(data.settings.userSettings);
      }
      if (data.settings.uiSettings) {
        useSettingsStore.getState().updateUISettings(data.settings.uiSettings);
      }
      importedCategories.push('设置');
    }

    return {
      success: true,
      message: `成功导入数据：${importedCategories.join('、')}`,
      importedCategories
    };
  } catch (error) {
    console.error('导入数据失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '导入数据时发生未知错误',
      importedCategories: []
    };
  }
}

/**
 * 下载文件
 * @param blob 文件内容
 * @param filename 文件名
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
} 