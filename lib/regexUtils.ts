/**
 * 正则表达式处理工具
 * 用于处理消息和提示词中的正则表达式替换
 */

import { replaceMacros } from './macroUtils';

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
}

/**
 * 处理单条文本的正则表达式
 * @param text 要处理的文本
 * @param scripts 正则表达式脚本列表
 * @param playerName 玩家名称 (用于宏替换)
 * @param characterName 角色名称 (用于宏替换)
 * @param depth 消息深度 (用于深度过滤)
 * @param type 处理类型: 1=用户输入, 2=AI响应, 3=命令, 4=提示词
 * @returns 处理后的文本
 */
export function processWithRegex(
  text: string, 
  scripts: RegexScript[],
  playerName: string, 
  characterName: string,
  depth: number = 0,
  type: number = 2 // 默认为AI响应
): string {
  if (!text || !scripts || scripts.length === 0) return text;

  let processedText = text;
  
  // 过滤有效的脚本
  const validScripts = scripts.filter(script => {
    // 检查脚本是否启用
    if (script.disabled) return false;
    
    // 检查脚本是否应用于当前类型
    if (!script.placement.includes(type)) return false;
    
    // 检查深度限制
    if (script.minDepth !== undefined && script.minDepth !== null && depth < script.minDepth) return false;
    if (script.maxDepth !== undefined && script.maxDepth !== null && depth > script.maxDepth) return false;
    
    return true;
  });
  
  // 应用每个脚本
  for (const script of validScripts) {
    try {
      // 准备正则表达式
      let findRegexStr = script.findRegex;
      
      // 处理正则表达式中的宏替换
      if (script.substituteRegex === 1) { // 原始替换
        findRegexStr = replaceMacros(findRegexStr, playerName, characterName);
      } else if (script.substituteRegex === 2) { // 转义替换
        const macroReplaced = replaceMacros(findRegexStr, playerName, characterName);
        // 转义特殊字符
        findRegexStr = macroReplaced.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      
      // 创建正则表达式对象
      const regex = new RegExp(patternString, flags);
      
      // 应用替换
      let replacementStr = script.replaceString;
      
      // 处理修剪字符串
      if (script.trimStrings && script.trimStrings.length > 0) {
        script.trimStrings.forEach(trim => {
          const trimRegex = new RegExp(trim, 'g');
          replacementStr = replacementStr.replace(trimRegex, '');
        });
      }
      
      // 替换匹配项
      processedText = processedText.replace(regex, (match, ...args) => {
        // 处理捕获组
        let result = replacementStr;
        
        // 替换 {{match}} 为完整匹配
        result = result.replace(/{{match}}/g, match);
        
        // 替换捕获组变量 $1, $2 等
        for (let i = 0; i < args.length - 2; i++) {
          if (args[i] !== undefined) {
            const capturegroupVar = new RegExp('\\$' + (i + 1), 'g');
            result = result.replace(capturegroupVar, args[i]);
          }
        }
        
        return result;
      });
    } catch (error) {
      console.error(`正则表达式脚本 "${script.scriptName}" 执行出错:`, error);
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
  return processWithRegex(inputText, [script], playerName, characterName, 0, 2);
} 