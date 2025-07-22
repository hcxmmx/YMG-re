import { Message, WorldBook, WorldBookEntry, WorldBookSettings } from './types';
import { worldBookStorage } from './storage';

// 扩展Message类型以包含name属性
interface ExtendedMessage extends Message {
  name?: string;
}

/**
 * 对文本进行扫描，查找匹配的世界书条目
 */
export async function activateWorldBookEntries(
  worldBook: WorldBook,
  scanText: string,
  options: {
    chatMessages?: ExtendedMessage[],
    characterName?: string,
    playerName?: string,
  } = {}
): Promise<{ beforeEntries: WorldBookEntry[], afterEntries: WorldBookEntry[] }> {
  const { settings } = worldBook;
  
  // 准备要返回的激活条目
  const activatedEntries: WorldBookEntry[] = [];
  
  // 处理扫描文本（可能会替换宏等）
  const processedText = preprocessScanText(scanText, options.characterName, options.playerName);
  
  // 复制条目用于处理，避免修改原始数据
  const workingEntries = JSON.parse(JSON.stringify(worldBook.entries)) as WorldBookEntry[];
  
  // 第1步：找出所有已启用的常量条目
  const constantEntries = workingEntries.filter(entry => 
    entry.enabled && entry.strategy === 'constant'
  );
  
  // 应用激活概率判定
  const activeConstantEntries = constantEntries.filter(entry => 
    Math.random() * 100 <= entry.probability
  );
  
  // 标记为已激活
  activeConstantEntries.forEach(entry => {
    entry._activated = true;
    activatedEntries.push(entry);
  });
  
  // 第2步：处理选择性条目
  // 获取要扫描的消息数量
  const scanDepth = settings.scanDepth;
  
  // 处理消息历史，获取扫描文本
  let scanTextForSelective = processedText;
  if (options.chatMessages && scanDepth > 0) {
    // 限制为最后scanDepth条消息
    const messagesToScan = options.chatMessages.slice(-scanDepth);
    scanTextForSelective = messagesToScan.map(msg => {
      if (settings.includeNames) {
        return `${msg.role === 'user' ? options.playerName : options.characterName}: ${msg.content}`;
      }
      return msg.content;
    }).join('\n\n');
  }
  
  // 找出未激活的选择性条目
  const selectiveEntries = workingEntries.filter(entry => 
    entry.enabled && 
    entry.strategy === 'selective' && 
    !entry._activated
  );
  
  // 匹配选择性条目
  const matchedSelectiveEntries = selectiveEntries.filter(entry => {
    // 检查条目是否有自定义扫描深度
    const entryScanDepth = entry.scanDepth !== undefined ? entry.scanDepth : scanDepth;
    
    // 如果扫描深度为0，不检查此条目
    if (entryScanDepth === 0) return false;
    
    // 检查关键字匹配
    return matchesEntry(entry, scanTextForSelective);
  });
  
  // 应用激活概率判定
  const activeSelectiveEntries = matchedSelectiveEntries.filter(entry => 
    Math.random() * 100 <= entry.probability
  );
  
  // 标记为已激活
  activeSelectiveEntries.forEach(entry => {
    entry._activated = true;
    activatedEntries.push(entry);
  });
  
  // 第3步：递归激活
  if (settings.maxRecursionSteps !== 0) {
    // 递归激活过程
    let recursionLevel = 0;
    let newActivations = true;
    let allScanText = scanTextForSelective;
    
    // 持续递归直到没有新激活或达到最大递归步骤
    while (newActivations && 
          (settings.maxRecursionSteps === 0 || recursionLevel < settings.maxRecursionSteps)) {
      
      recursionLevel++;
      newActivations = false;
      
      // 将已激活条目的内容添加到扫描文本中
      const activatedContent = activatedEntries
        .filter(entry => !entry.preventRecursion)
        .map(entry => entry.content)
        .join('\n\n');
      
      allScanText = `${allScanText}\n\n${activatedContent}`;
      
      // 找出未激活且未排除递归的条目
      const recursableEntries = workingEntries.filter(entry => 
        entry.enabled && 
        !entry._activated && 
        !entry.excludeRecursion
      );
      
      // 检查是否有延迟到此递归级别的条目
      const eligibleRecursiveEntries = recursableEntries.filter(entry => 
        !entry.delayUntilRecursion || entry.recursionLevel <= recursionLevel
      );
      
      // 匹配条目
      const matchedRecursiveEntries = eligibleRecursiveEntries.filter(entry => 
        matchesEntry(entry, allScanText)
      );
      
      // 应用激活概率判定
      const activeRecursiveEntries = matchedRecursiveEntries.filter(entry => 
        Math.random() * 100 <= entry.probability
      );
      
      // 标记为已激活
      if (activeRecursiveEntries.length > 0) {
        newActivations = true;
        activeRecursiveEntries.forEach(entry => {
          entry._activated = true;
          activatedEntries.push(entry);
        });
      }
    }
  }
  
  // 第4步：应用时效性功能（只是标记状态，实际应用需要在存储中维护）
  activatedEntries.forEach(entry => {
    // 设置黏性剩余时间
    if (entry.sticky > 0) {
      entry._stickyRemaining = entry.sticky;
    }
    
    // 设置冷却剩余时间
    if (entry.cooldown > 0) {
      entry._cooldownRemaining = entry.cooldown;
    }
  });
  
  // 第5步：按插入顺序排序条目
  activatedEntries.sort((a, b) => a.order - b.order);
  
  // 按位置分类
  const beforeEntries = activatedEntries.filter(entry => entry.position === 'before');
  const afterEntries = activatedEntries.filter(entry => entry.position === 'after');
  
  return { beforeEntries, afterEntries };
}

/**
 * 预处理扫描文本，替换宏等
 */
function preprocessScanText(text: string, characterName?: string, playerName?: string): string {
  let processedText = text;
  
  // 替换角色名称宏
  if (characterName) {
    processedText = processedText.replace(/\{\{char\}\}/g, characterName);
    processedText = processedText.replace(/<char>/g, characterName);
  }
  
  // 替换玩家名称宏
  if (playerName) {
    processedText = processedText.replace(/\{\{user\}\}/g, playerName);
    processedText = processedText.replace(/<user>/g, playerName);
  }
  
  return processedText;
}

/**
 * 检查文本是否匹配世界书条目
 */
function matchesEntry(entry: WorldBookEntry, text: string): boolean {
  // 如果是常量条目，始终返回true
  if (entry.strategy === 'constant') return true;
  
  // 如果没有主要关键字，则不匹配
  if (!entry.primaryKeys || entry.primaryKeys.length === 0) return false;
  
  // 应用大小写敏感设置
  const flags = entry.caseSensitive ? '' : 'i';
  
  // 检查是否匹配任一主要关键字
  const primaryMatches = entry.primaryKeys.some(key => {
    // 检查是否是正则表达式
    if (key.startsWith('/') && key.lastIndexOf('/') > 0) {
      // 提取正则表达式和标志
      const lastSlashIndex = key.lastIndexOf('/');
      const pattern = key.substring(1, lastSlashIndex);
      const regexFlags = key.substring(lastSlashIndex + 1) || flags;
      
      try {
        const regex = new RegExp(pattern, regexFlags);
        return regex.test(text);
      } catch (e) {
        console.error('无效的正则表达式:', key, e);
        return false;
      }
    } 
    // 否则进行普通文本匹配
    else {
      if (entry.matchWholeWords) {
        // 全词匹配
        const regex = new RegExp(`\\b${escapeRegExp(key)}\\b`, flags);
        return regex.test(text);
      } else {
        // 部分匹配
        return entry.caseSensitive 
          ? text.includes(key) 
          : text.toLowerCase().includes(key.toLowerCase());
      }
    }
  });
  
  // 如果主要关键字不匹配，返回false
  if (!primaryMatches) return false;
  
  // 如果没有次要关键字，返回true
  if (!entry.secondaryKeys || entry.secondaryKeys.length === 0) return true;
  
  // 处理次要关键字的逻辑
  switch (entry.selectiveLogic) {
    case 'andAny': {
      // 任意一个次要关键字匹配
      return entry.secondaryKeys.some(key => {
        if (entry.matchWholeWords) {
          const regex = new RegExp(`\\b${escapeRegExp(key)}\\b`, flags);
          return regex.test(text);
        } else {
          return entry.caseSensitive 
            ? text.includes(key) 
            : text.toLowerCase().includes(key.toLowerCase());
        }
      });
    }
    case 'andAll': {
      // 所有次要关键字都匹配
      return entry.secondaryKeys.every(key => {
        if (entry.matchWholeWords) {
          const regex = new RegExp(`\\b${escapeRegExp(key)}\\b`, flags);
          return regex.test(text);
        } else {
          return entry.caseSensitive 
            ? text.includes(key) 
            : text.toLowerCase().includes(key.toLowerCase());
        }
      });
    }
    case 'notAny': {
      // 没有任何次要关键字匹配
      return !entry.secondaryKeys.some(key => {
        if (entry.matchWholeWords) {
          const regex = new RegExp(`\\b${escapeRegExp(key)}\\b`, flags);
          return regex.test(text);
        } else {
          return entry.caseSensitive 
            ? text.includes(key) 
            : text.toLowerCase().includes(key.toLowerCase());
        }
      });
    }
    case 'notAll': {
      // 不是所有次要关键字都匹配
      return !entry.secondaryKeys.every(key => {
        if (entry.matchWholeWords) {
          const regex = new RegExp(`\\b${escapeRegExp(key)}\\b`, flags);
          return regex.test(text);
        } else {
          return entry.caseSensitive 
            ? text.includes(key) 
            : text.toLowerCase().includes(key.toLowerCase());
        }
      });
    }
    default:
      return true;
  }
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 生成世界书前置内容
 */
export async function generateWorldInfoBefore(characterId: string, messages: ExtendedMessage[]): Promise<string | null> {
  // 获取与角色关联的世界书
  const worldBook = await worldBookStorage.getWorldBookForCharacter(characterId);
  if (!worldBook || !worldBook.enabled) return null;
  
  // 准备扫描文本（整个对话历史）
  const scanText = messages.map(msg => msg.content).join('\n\n');
  
  // 激活世界书条目
  const character = messages.find(msg => msg.role === 'assistant')?.name || '';
  const player = messages.find(msg => msg.role === 'user')?.name || '';
  
  const { beforeEntries } = await activateWorldBookEntries(worldBook, scanText, {
    chatMessages: messages,
    characterName: character,
    playerName: player
  });
  
  // 如果没有激活的条目，返回null
  if (beforeEntries.length === 0) return null;
  
  // 合并条目内容
  const content = beforeEntries.map(entry => entry.content).join('\n\n');
  return content;
}

/**
 * 生成世界书后置内容
 */
export async function generateWorldInfoAfter(characterId: string, messages: ExtendedMessage[]): Promise<string | null> {
  // 获取与角色关联的世界书
  const worldBook = await worldBookStorage.getWorldBookForCharacter(characterId);
  if (!worldBook || !worldBook.enabled) return null;
  
  // 准备扫描文本（整个对话历史）
  const scanText = messages.map(msg => msg.content).join('\n\n');
  
  // 激活世界书条目
  const character = messages.find(msg => msg.role === 'assistant')?.name || '';
  const player = messages.find(msg => msg.role === 'user')?.name || '';
  
  const { afterEntries } = await activateWorldBookEntries(worldBook, scanText, {
    chatMessages: messages,
    characterName: character,
    playerName: player
  });
  
  // 如果没有激活的条目，返回null
  if (afterEntries.length === 0) return null;
  
  // 合并条目内容
  const content = afterEntries.map(entry => entry.content).join('\n\n');
  return content;
} 