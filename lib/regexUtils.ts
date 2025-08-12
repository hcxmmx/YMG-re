/**
 * 正则表达式处理工具
 * 用于处理消息和提示词中的正则表达式替换
 */

import { replaceMacros } from './macroUtils';

/**
 * 精细的正则宏转义处理，参考SillyTavern实现
 * 用于安全地处理宏替换后的内容，避免破坏正则表达式语法
 * @param text 要转义的文本
 * @returns 转义后的文本
 */
function sanitizeRegexMacro(text: string): string {
  if (!text || typeof text !== 'string') return text;
  
  return text.replace(/[\n\r\t\v\f\0.^$*+?{}[\]\\/|()]/g, (s) => {
    switch (s) {
      case '\n': return '\\n';  // 真实换行 -> 正则换行匹配
      case '\r': return '\\r';  // 回车符 -> 正则回车匹配
      case '\t': return '\\t';  // 制表符 -> 正则制表符匹配
      case '\v': return '\\v';  // 垂直制表符
      case '\f': return '\\f';  // 换页符
      case '\0': return '\\0';  // 空字符
      default: return '\\' + s; // 其他特殊字符前加反斜杠
    }
  });
}

/**
 * 验证正则表达式是否有效
 * @param pattern 正则表达式模式
 * @param flags 正则表达式标志
 * @returns 验证结果
 */
function validateRegex(pattern: string, flags: string = ''): { valid: boolean; error?: string } {
  try {
    new RegExp(pattern, flags);
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : '无效的正则表达式'
    };
  }
}

/**
 * 过滤字符串，移除trim字符串，参考SillyTavern的filterString实现
 * @param rawString 原始字符串
 * @param trimStrings 要移除的字符串列表
 * @param playerName 玩家名称
 * @param characterName 角色名称
 * @returns 过滤后的字符串
 */
function filterString(rawString: string, trimStrings: string[], playerName: string, characterName: string): string {
  let finalString = rawString;
  
  trimStrings.forEach((trimString) => {
    // 对trim字符串也进行宏替换
    const processedTrimString = replaceMacros(trimString, playerName, characterName);
    finalString = finalString.replaceAll(processedTrimString, '');
  });

  return finalString;
}

// 正则表达式脚本类型
export interface RegexScript {
  id: string;           // 唯一ID
  scriptName: string;   // 脚本名称
  findRegex: string;    // 匹配正则表达式
  replaceString: string;// 替换字符串
  trimStrings: string[];// 裁剪字符串
  placement: number[];  // 应用位置 [1=用户输入, 2=AI响应, 3=命令, 4=提示词]
  disabled: boolean;    // 是否禁用
  markdownOnly: boolean;// 仅影响显示
  promptOnly: boolean;  // 仅影响提示词
  runOnEdit: boolean;   // 在编辑时运行
  substituteRegex: number; // 宏替换模式: 0=不替换, 1=原始, 2=转义
  minDepth?: number|null;// 最小深度
  maxDepth?: number|null;// 最大深度
  scope?: 'global' | 'character'; // 作用域：全局或角色特定
  characterIds?: string[];      // 当 scope 为 'character' 时生效的角色 ID 列表
  folderId?: string;           // 所属文件夹ID
  presetIds?: string[];        // 关联的预设ID列表
}

/**
 * 处理单条文本的正则表达式
 * @param text 要处理的文本
 * @param scripts 正则表达式脚本列表
 * @param playerName 玩家名称 (用于宏替换)
 * @param characterName 角色名称 (用于宏替换)
 * @param depth 消息深度 (用于深度过滤)
 * @param type 处理类型: 1=用户输入, 2=AI响应, 3=命令, 4=提示词
 * @param characterId 当前角色ID (用于角色特定正则)
 * @param disabledFolderIds 禁用的文件夹ID列表 (用于文件夹隔离)
 * @param isMarkdown 是否为显示时处理（类似SillyTavern的isMarkdown标志）
 * @param isPrompt 是否为提示词构建时处理（类似SillyTavern的isPrompt标志）
 * @returns 处理后的文本
 */
export function processWithRegex(
  text: string, 
  scripts: RegexScript[],
  playerName: string, 
  characterName: string,
  depth: number = 0,
  type: number = 2, // 默认为AI响应
  characterId?: string, // 当前角色ID
  disabledFolderIds?: Set<string>, // 禁用的文件夹ID集合
  isMarkdown: boolean = false, // 显示时处理
  isPrompt: boolean = false // 提示词构建时处理
): string {
  if (!text || !scripts || scripts.length === 0) return text;

  let processedText = text;
  
  // 过滤有效的脚本
  const validScripts = scripts.filter(script => {
    // 检查脚本是否启用
    if (script.disabled) return false;
    
    // 检查脚本所在文件夹是否被禁用
    if (disabledFolderIds && script.folderId && disabledFolderIds.has(script.folderId)) {
      return false;
    }
    
    // 检查脚本是否应用于当前类型
    if (!script.placement.includes(type)) return false;
    
    // 检查深度限制
    if (script.minDepth !== undefined && script.minDepth !== null && depth < script.minDepth) return false;
    if (script.maxDepth !== undefined && script.maxDepth !== null && depth > script.maxDepth) return false;
    
    // 参考SillyTavern的逻辑，根据处理模式过滤脚本
    if (
      // 脚本设置为仅影响显示 && 当前是显示处理
      (script.markdownOnly && isMarkdown) ||
      // 脚本设置为仅影响提示词 && 当前是提示词构建
      (script.promptOnly && isPrompt) ||
      // 普通脚本 && 当前不是显示也不是提示词构建（即正常的构建时处理）
      (!script.markdownOnly && !script.promptOnly && !isMarkdown && !isPrompt)
    ) {
      return true;
    }
    
    return false;
  });
  
  // 将脚本分为全局脚本和角色特定脚本
  const globalScripts = validScripts.filter(script => 
    script.scope === 'global' || !script.scope
  );
  
  const characterScripts = validScripts.filter(script => 
    script.scope === 'character' && 
    characterId && 
    script.characterIds?.includes(characterId)
  );
  
  // 先应用全局脚本
  processedText = applyScripts(processedText, globalScripts, playerName, characterName);
  
  // 然后应用角色特定脚本
  processedText = applyScripts(processedText, characterScripts, playerName, characterName);
  
  return processedText;
}

/**
 * 应用一组脚本到文本
 * @param text 要处理的文本
 * @param scripts 要应用的脚本列表
 * @param playerName 玩家名称
 * @param characterName 角色名称
 * @returns 处理后的文本
 */
function applyScripts(text: string, scripts: RegexScript[], playerName: string, characterName: string): string {
  let processedText = text;
  
  // 应用每个脚本
  for (const script of scripts) {
    try {
      // 准备正则表达式
      let findRegexStr = script.findRegex;
      
      // 处理正则表达式中的宏替换
      if (script.substituteRegex === 1) { // 原始替换
        findRegexStr = replaceMacros(findRegexStr, playerName, characterName);
      } else if (script.substituteRegex === 2) { // 转义替换（安全模式）
        const macroReplaced = replaceMacros(findRegexStr, playerName, characterName);
        // 使用精细转义处理，确保包含特殊字符的宏不会破坏正则语法
        findRegexStr = sanitizeRegexMacro(macroReplaced);
      }
      
      // 提取正则表达式标志
      let flags = '';
      let patternString = findRegexStr;
      
      // 检查是否包含 /pattern/flags 格式
      const regexMatch = findRegexStr.match(/^\/(.+)\/([gimsu]*)$/);
      if (regexMatch) {
        patternString = regexMatch[1];
        flags = regexMatch[2];
      }
      
      // 验证正则表达式
      const validation = validateRegex(patternString, flags);
      if (!validation.valid) {
        console.warn(`正则表达式脚本 "${script.scriptName}" 包含无效正则: ${validation.error}`);
        continue; // 跳过无效的正则表达式
      }
      
      // 创建正则表达式对象
      const regex = new RegExp(patternString, flags);
      
      // 应用替换
      processedText = processedText.replace(regex, (match, ...args) => {
        let result = script.replaceString;
        
        // 替换 {{match}} 为完整匹配
        result = result.replace(/{{match}}/gi, '$0');
        
        // 替换捕获组变量 $1, $2 等
        result = result.replace(/\$(\d+)/g, (_, num) => {
          const captureIndex = Number(num);
          const captureMatch = args[captureIndex - 1]; // args数组是0开始的
          
          if (captureMatch === undefined) {
            return ''; // 没有匹配的捕获组返回空字符串
          }
          
          // 对捕获组应用trim字符串过滤（这是SillyTavern的逻辑）
          return filterString(captureMatch, script.trimStrings || [], playerName, characterName);
        });
        
        // 最后对整个替换字符串进行宏替换（SillyTavern的substituteParams）
        return replaceMacros(result, playerName, characterName);
      });
    } catch (error) {
      console.error(`正则表达式脚本 "${script.scriptName}" 执行出错:`, error);
      // 继续处理下一个脚本，不中断整个处理流程
    }
  }
  
  return processedText;
}

/**
 * 导入正则表达式脚本
 * @param fileContent JSON文件内容
 * @returns 导入的脚本对象
 */
export function importRegexScript(fileContent: string): RegexScript | null {
  try {
    const script = JSON.parse(fileContent);
    
    // 验证必要字段
    if (!script.id || !script.scriptName || !script.findRegex) {
      throw new Error("脚本文件格式错误: 缺少必要字段");
    }
    
    // 确保数组字段存在
    script.trimStrings = script.trimStrings || [];
    script.placement = script.placement || [2]; // 默认应用于AI响应
    
    return script as RegexScript;
  } catch (error) {
    console.error("导入正则表达式脚本失败:", error);
    return null;
  }
}

/**
 * 导出正则表达式脚本到JSON文件
 * @param script 要导出的脚本对象
 * @returns JSON字符串
 */
export function exportRegexScript(script: RegexScript): string {
  return JSON.stringify(script, null, 4);
}

/**
 * 清理文本中的技术标签，用于用户界面显示
 * 移除AI专用的技术标签，让用户界面保持干净
 * @param text 要清理的文本
 * @returns 清理后的文本
 */
export function cleanTechnicalTags(text: string): string {
  if (!text) return text;
  
  // 常见的AI技术标签列表
  const technicalTags = [
    'user_input',
    'ai_output', 
    'system',
    'thinking',
    'reasoning',
    'context',
    'instruction',
    'prompt',
    'response',
    'assistant',
    'human',
    'bot'
  ];
  
  let cleanedText = text;
  
  // 移除这些技术标签，但保留内容
  technicalTags.forEach(tag => {
    // 移除开标签和闭标签，保留中间内容
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    cleanedText = cleanedText.replace(regex, '$1');
    
    // 移除单独的开标签
    const openTagRegex = new RegExp(`<${tag}[^>]*>`, 'gi');
    cleanedText = cleanedText.replace(openTagRegex, '');
    
    // 移除单独的闭标签
    const closeTagRegex = new RegExp(`<\\/${tag}>`, 'gi');
    cleanedText = cleanedText.replace(closeTagRegex, '');
  });
  
  // 清理多余的空白行
  cleanedText = cleanedText.replace(/\n\s*\n\s*\n/g, '\n\n');
  cleanedText = cleanedText.trim();
  
  return cleanedText;
}

/**
 * 测试正则表达式脚本
 * @param script 要测试的脚本
 * @param inputText 输入文本
 * @param playerName 玩家名称
 * @param characterName 角色名称
 * @returns 处理后的文本
 */
export function testRegexScript(
  script: RegexScript, 
  inputText: string, 
  playerName: string, 
  characterName: string
): string {
  return processWithRegex(inputText, [script], playerName, characterName, 0, 2, undefined, undefined, false, false);
} 