import { deleteDB } from 'idb';

/**
 * 重置数据库 - 删除旧数据库并重新创建
 */
export async function resetDatabase() {
  try {
    console.log('开始重置数据库...');
    
    // 删除旧数据库
    await deleteDB('ai-roleplay-db');
    console.log('旧数据库已删除');
    
    // 清除localStorage中的相关缓存
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('ai-roleplay') || key.includes('idb'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('数据库重置完成，请刷新页面');
    return true;
  } catch (error) {
    console.error('重置数据库失败:', error);
    return false;
  }
}

/**
 * 检查数据库是否需要重置
 */
export async function checkDatabaseHealth() {
  try {
    // 动态导入以避免循环依赖
    const { initDB } = await import('./storage');
    const db = await initDB();
    
    // 检查必要的表是否存在
    const requiredStores = ['conversations', 'presets', 'characters', 'backgroundImages'];
    const missingStores = requiredStores.filter(store => !db.objectStoreNames.contains(store));
    
    if (missingStores.length > 0) {
      console.warn('数据库缺少必要的表:', missingStores);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('检查数据库健康状态失败:', error);
    return false;
  }
}
