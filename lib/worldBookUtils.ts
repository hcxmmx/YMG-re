import { Message, WorldBook, WorldBookEntry, WorldBookSettings } from './types';
import { worldBookStorage } from './storage';

// 扩展Message类型以包含name属性
interface ExtendedMessage extends Message {
  name?: string;
}

// 添加激活信息字段的条目类型
export interface WorldBookEntryWithActivationInfo extends WorldBookEntry {
  _activationInfo?: string;
  _activationDetails?: {
    activationReason?: string;
    matchedKeys?: string[];
    matchedPrimary?: boolean;
    matchedSecondary?: boolean;
    recursion?: boolean;
    recursionLevel?: number;
    probability?: number;
  };
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
 * 测试条目激活
 * @param params 参数对象
 */
export async function activateEntries(params: {
  worldBook: WorldBook;
  chatMessages: ExtendedMessage[];
  onDebug?: (message: string) => void;
}): Promise<WorldBookEntryWithActivationInfo[]> {
  const { worldBook, chatMessages, onDebug } = params;
  
  if (!worldBook.enabled) {
    onDebug?.("世界书已禁用，跳过激活");
    return [];
  }
  
  // 日志函数
  const log = (message: string) => {
    onDebug?.(message);
  };
  
  log(`开始处理世界书: ${worldBook.name}`);
  log(`共有 ${worldBook.entries.length} 条条目`);
  
  // 拷贝条目，添加运行时状态
  const entries = worldBook.entries.map(entry => ({
    ...entry,
    _activated: false,
    _stickyRemaining: 0,
    _cooldownRemaining: 0
  })) as WorldBookEntryWithActivationInfo[];
  
  // 按顺序排序条目
  entries.sort((a, b) => a.order - b.order);
  
  // 过滤禁用的条目
  const enabledEntries = entries.filter(entry => entry.enabled);
  log(`启用的条目: ${enabledEntries.length} 条`);
  
  const activatedEntries: WorldBookEntryWithActivationInfo[] = [];
  const scanText = composeScanText(chatMessages, worldBook.settings.scanDepth || 5);
  
  log(`扫描文本长度: ${scanText.length} 字符`);
  
  // 处理常量条目 (常量总是被激活)
  const constantEntries = enabledEntries.filter(entry => entry.strategy === 'constant');
  constantEntries.forEach(entry => {
    entry._activated = true;
    entry._activationInfo = "常量条目自动激活";
    activatedEntries.push(entry);
    log(`激活常量条目: ${entry.title}`);
  });
  
  // 处理选择性条目 (需要关键字匹配)
  const selectiveEntries = enabledEntries.filter(entry => entry.strategy === 'selective');
  for (const entry of selectiveEntries) {
    const activationResult = testSelectiveActivation(entry, scanText);
    if (activationResult.activated) {
      entry._activated = true;
      entry._activationInfo = activationResult.reason;
      activatedEntries.push(entry);
      log(`激活选择性条目: ${entry.title} - ${activationResult.reason}`);
    } else {
      log(`未激活条目: ${entry.title} - ${activationResult.reason}`);
    }
  }
  
  // 处理向量化条目 (需要语义匹配)
  const vectorEntries = enabledEntries.filter(entry => entry.strategy === 'vectorized');
  if (vectorEntries.length > 0) {
    log(`注意: 向量化条目需要额外实现，当前版本不支持`);
  }
  
  // 递归处理
  if (worldBook.settings.maxRecursionSteps > 0) {
    log(`开始递归处理, 最大步数: ${worldBook.settings.maxRecursionSteps}`);
    await processRecursion({
      worldBook,
      activatedEntries,
      allEntries: enabledEntries,
      maxSteps: worldBook.settings.maxRecursionSteps,
      log
    });
  }
  
  log(`总激活条目: ${activatedEntries.length} 条`);
  
  // 过滤并排序激活的条目
  const sortedActivatedEntries = [...activatedEntries].sort((a, b) => a.order - b.order);
  
  return sortedActivatedEntries;
}

/**
 * 测试选择性条目激活
 */
function testSelectiveActivation(entry: WorldBookEntryWithActivationInfo, scanText: string): { 
  activated: boolean;
  reason: string;
  matchedKeys?: string[];
} {
  // 如果没有主要关键字，无法激活
  if (!entry.primaryKeys || entry.primaryKeys.length === 0) {
    return { activated: false, reason: "没有主要关键字" };
  }
  
  // 准备匹配选项
  const matchOptions = {
    caseSensitive: entry.caseSensitive ?? false,
    wholeWord: entry.matchWholeWords ?? true
  };
  
  // 尝试匹配主要关键字
  const matchedPrimaryKeys = entry.primaryKeys.filter(key => 
    keywordMatches(scanText, key, matchOptions)
  );
  
  if (matchedPrimaryKeys.length === 0) {
    return { activated: false, reason: "没有匹配的主要关键字" };
  }
  
  // 如果没有次要关键字，直接激活
  if (!entry.secondaryKeys || entry.secondaryKeys.length === 0) {
    return { 
      activated: true, 
      reason: `匹配主要关键字: ${matchedPrimaryKeys.join(', ')}`,
      matchedKeys: matchedPrimaryKeys
    };
  }
  
  // 匹配次要关键字
  const matchedSecondaryKeys = entry.secondaryKeys.filter(key => 
    keywordMatches(scanText, key, matchOptions)
  );
  
  // 根据逻辑判断是否激活
  let activated = false;
  let reason = '';
  
  switch (entry.selectiveLogic) {
    case 'andAny':
      activated = matchedSecondaryKeys.length > 0;
      reason = activated 
        ? `匹配主要关键字(${matchedPrimaryKeys.join(', ')})且至少一个次要关键字(${matchedSecondaryKeys.join(', ')})`
        : "没有匹配的次要关键字(需要至少一个)";
      break;
    case 'andAll':
      activated = matchedSecondaryKeys.length === entry.secondaryKeys.length;
      reason = activated
        ? `匹配主要关键字(${matchedPrimaryKeys.join(', ')})且所有次要关键字`
        : "未匹配所有次要关键字(需要全部匹配)";
      break;
    case 'notAny':
      activated = matchedSecondaryKeys.length === 0;
      reason = activated
        ? `匹配主要关键字(${matchedPrimaryKeys.join(', ')})且不包含任何次要关键字`
        : `包含了排除的次要关键字(${matchedSecondaryKeys.join(', ')})`;
      break;
    case 'notAll':
      activated = matchedSecondaryKeys.length < entry.secondaryKeys.length;
      reason = activated
        ? `匹配主要关键字(${matchedPrimaryKeys.join(', ')})且不包含所有次要关键字`
        : "包含了所有排除的次要关键字";
      break;
  }
  
  return {
    activated,
    reason,
    matchedKeys: matchedPrimaryKeys
  };
}

/**
 * 关键字是否匹配
 */
function keywordMatches(text: string, keyword: string, options: { caseSensitive: boolean, wholeWord: boolean }): boolean {
  // 处理正则特殊字符
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // 构建正则表达式
  const pattern = options.wholeWord 
    ? `\\b${escaped}\\b` 
    : escaped;
  
  const flags = options.caseSensitive ? 'g' : 'gi';
  const regex = new RegExp(pattern, flags);
  
  return regex.test(text);
}

/**
 * 组合扫描文本
 */
function composeScanText(messages: ExtendedMessage[], scanDepth: number): string {
  // 取最近的N条消息
  const recentMessages = messages.slice(-scanDepth);
  
  // 合并消息内容
  return recentMessages.map(msg => {
    const prefix = msg.name ? `${msg.name}: ` : '';
    return `${prefix}${msg.content}`;
  }).join('\n\n');
}

/**
 * 处理递归激活
 */
async function processRecursion(params: {
  worldBook: WorldBook;
  activatedEntries: WorldBookEntryWithActivationInfo[];
  allEntries: WorldBookEntryWithActivationInfo[];
  maxSteps: number;
  log: (message: string) => void;
}): Promise<void> {
  const { worldBook, activatedEntries, allEntries, maxSteps, log } = params;
  
  // 追踪已处理的条目
  const processedIds = new Set(activatedEntries.map(e => e.id));
  let newActivations = true;
  let step = 0;
  
  // 递归激活，直到没有新激活或达到最大步数
  while (newActivations && step < maxSteps) {
    step++;
    newActivations = false;
    log(`开始递归步骤 ${step}`);
    
    // 创建当前激活条目的文本
    const recursionText = activatedEntries
      .filter(e => !e.preventRecursion) // 排除防止递归的条目
      .map(e => e.content)
      .join('\n\n');
    
    // 查找可能被递归激活的条目
    const recursionCandidates = allEntries.filter(e => 
      // 排除已激活的条目
      !processedIds.has(e.id) && 
      // 排除不可递归的条目
      !e.excludeRecursion && 
      // 包括延迟递归的条目
      (e.delayUntilRecursion || e.strategy === 'selective')
    );
    
    log(`候选递归条目数量: ${recursionCandidates.length}`);
    
    // 尝试激活每个候选条目
    for (const entry of recursionCandidates) {
      // 检查递归等级
      if (entry.recursionLevel > step) {
        log(`条目 ${entry.title} 的递归等级(${entry.recursionLevel})高于当前步骤(${step}), 跳过`);
        continue;
      }
      
      // 检查是否符合递归激活条件
      const activationResult = testSelectiveActivation(entry, recursionText);
      if (activationResult.activated) {
        entry._activated = true;
        entry._activationInfo = `递归激活(步骤${step}): ${activationResult.reason}`;
        activatedEntries.push(entry);
        processedIds.add(entry.id);
        newActivations = true;
        log(`递归激活条目: ${entry.title}`);
      }
    }
    
    if (!newActivations) {
      log(`递归步骤 ${step}: 没有新的激活`);
    }
  }
}

/**
 * 生成世界信息（角色描述前）
 * @param params 参数对象
 */
export async function generateWorldInfoBefore(params: {
  worldBook: WorldBook;
  chatMessages: Message[];
}): Promise<string> {
  const { worldBook, chatMessages } = params;
  
  // 如果世界书被禁用，返回空字符串
  if (!worldBook.enabled) {
    return '';
  }
  
  // 获取激活的条目
  const activatedEntries = await activateEntries({
    worldBook,
    chatMessages: chatMessages as ExtendedMessage[]
  });
  
  // 过滤出前置条目并按顺序排序
  const beforeEntries = activatedEntries
    .filter(entry => entry.position === 'before')
    .sort((a, b) => a.order - b.order);
  
  // 将条目内容合并为字符串
  return beforeEntries
    .map(entry => entry.content)
    .join('\n\n');
}

/**
 * 生成世界信息（角色描述后）
 * @param params 参数对象
 */
export async function generateWorldInfoAfter(params: {
  worldBook: WorldBook;
  chatMessages: Message[];
}): Promise<string> {
  const { worldBook, chatMessages } = params;
  
  // 如果世界书被禁用，返回空字符串
  if (!worldBook.enabled) {
    return '';
  }
  
  // 获取激活的条目
  const activatedEntries = await activateEntries({
    worldBook,
    chatMessages: chatMessages as ExtendedMessage[]
  });
  
  // 过滤出后置条目并按顺序排序
  const afterEntries = activatedEntries
    .filter(entry => entry.position === 'after')
    .sort((a, b) => a.order - b.order);
  
  // 将条目内容合并为字符串
  return afterEntries
    .map(entry => entry.content)
    .join('\n\n');
}