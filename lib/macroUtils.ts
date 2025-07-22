/**
 * 宏替换工具函数
 * 用于在提示词和聊天消息中替换宏标记
 */

/**
 * 替换文本中的所有宏标记
 * @param text 要处理的文本
 * @param playerName 当前玩家名称
 * @param characterName 当前角色名称
 * @returns 替换后的文本
 */
export function replaceMacros(text: string, playerName: string, characterName: string): string {
  if (!text) return text;
  
  // 替换玩家名称宏
  let result = text
    .replace(/<user>/g, playerName)
    .replace(/\(user\)/g, playerName)
    .replace(/{{user}}/g, playerName);
  
  // 替换角色名称宏
  result = result
    .replace(/<char>/g, characterName)
    .replace(/\(char\)/g, characterName)
    .replace(/{{char}}/g, characterName);
  
  return result;
}

/**
 * 替换提示词中的所有宏标记
 * 这是一个专门用于处理系统提示词和其他提示词的函数
 * @param prompt 要处理的提示词
 * @param playerName 当前玩家名称
 * @param characterName 当前角色名称
 * @returns 替换后的提示词
 */
export function replacePromptsWithMacros(prompt: string, playerName: string, characterName: string): string {
  return replaceMacros(prompt, playerName, characterName);
}

/**
 * 替换消息内容中的所有宏标记
 * @param messageContent 消息内容
 * @param playerName 当前玩家名称
 * @param characterName 当前角色名称
 * @returns 替换后的消息内容
 */
export function replaceMessageWithMacros(messageContent: string, playerName: string, characterName: string): string {
  return replaceMacros(messageContent, playerName, characterName);
} 