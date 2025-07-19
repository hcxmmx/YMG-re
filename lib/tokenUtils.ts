import { GeminiService } from "./gemini";
import { Message, UserSettings } from "./types";

// 计算单条消息或消息数组的token数
export async function countMessageTokens(
  apiKey: string, 
  messages: Message | Message[], 
  model: string = "gemini-2.5-pro"
): Promise<number> {
  const geminiService = new GeminiService(apiKey);
  const messageArray = Array.isArray(messages) ? messages : [messages];
  
  // 转换为Gemini格式的消息
  const { formattedContents } = geminiService.transformMessages(messageArray);
  
  try {
    // 调用Gemini API计算token
    const tokenResponse = await geminiService.genAI.models.countTokens({
      model: model,
      contents: formattedContents
    });
    
    return tokenResponse.totalTokens || 0;
  } catch (error) {
    console.error("计算token时出错:", error);
    // 发生错误时使用简单的估算方法
    return estimateTokens(messageArray);
  }
}

// 当API调用失败时的简单token估算方法
function estimateTokens(messages: Message[]): number {
  let totalTokens = 0;
  
  for (const msg of messages) {
    // 简单估算：英文约1个单词1.3个token，中文约1个字符1个token
    const text = msg.content || "";
    
    // 中文字符计数
    const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    
    // 英文单词计数（粗略估计）
    const englishWordCount = text.split(/\s+/).filter(Boolean).length;
    
    // 系统消息额外添加token计数
    const roleTokens = msg.role === "system" ? 4 : 2;
    
    // 估算总token
    totalTokens += chineseCharCount + (englishWordCount * 1.3) + roleTokens;
    
    // 图片token估算（每张图片约800-1000token）
    if (msg.images && msg.images.length > 0) {
      totalTokens += msg.images.length * 900;
    }
  }
  
  return Math.round(totalTokens);
}

// 裁剪消息历史记录
export async function trimMessageHistory(
  messages: Message[], 
  settings: UserSettings, 
  apiKey: string
): Promise<Message[]> {
  // 如果没有启用上下文窗口限制或设置为0（无限制）
  if (!settings.contextWindow || settings.contextWindow <= 0) {
    return messages;
  }
  
  // 始终保留系统消息
  const systemMessages = messages.filter(msg => msg.role === "system");
  const nonSystemMessages = messages.filter(msg => msg.role !== "system");
  
  // 基于消息数量裁剪
  if (settings.contextControlMode === 'count') {
    // 保留最新的N条非系统消息
    const trimmedMessages = nonSystemMessages.slice(-settings.contextWindow);
    return [...systemMessages, ...trimmedMessages];
  }
  
  // 基于token数量裁剪
  if (settings.contextControlMode === 'token') {
    // 确保有足够的token预算给系统消息和最后一条用户消息
    let systemTokenBudget = 0;
    if (systemMessages.length > 0) {
      systemTokenBudget = await countMessageTokens(apiKey, systemMessages, settings.model);
    }
    
    // 找到最后一条用户消息（如果有）
    const lastUserMessage = [...nonSystemMessages].reverse().find(msg => msg.role === "user");
    let lastUserTokenBudget = 0;
    if (lastUserMessage) {
      lastUserTokenBudget = await countMessageTokens(apiKey, lastUserMessage, settings.model);
    }
    
    // 计算剩余可用token预算
    const remainingTokenBudget = settings.contextWindow - systemTokenBudget - lastUserTokenBudget;
    
    // 如果剩余预算不足，至少保留最后一条用户消息
    if (remainingTokenBudget <= 0) {
      return [
        ...systemMessages,
        ...(lastUserMessage ? [lastUserMessage] : [])
      ];
    }
    
    // 从最近消息开始，添加尽可能多的消息，直到达到token预算
    const reversedMessages = [...nonSystemMessages].reverse();
    const includedMessages: Message[] = [];
    let usedTokens = 0;
    
    // 移除最后一条用户消息（因为已经在预算中考虑）
    if (lastUserMessage) {
      const lastUserIndex = reversedMessages.findIndex(msg => msg.id === lastUserMessage.id);
      if (lastUserIndex !== -1) {
        reversedMessages.splice(lastUserIndex, 1);
      }
    }
    
    for (const msg of reversedMessages) {
      const msgTokens = await countMessageTokens(apiKey, msg, settings.model);
      
      if (usedTokens + msgTokens <= remainingTokenBudget) {
        includedMessages.unshift(msg); // 添加到头部
        usedTokens += msgTokens;
      } else {
        // 没有足够的token预算添加这条消息
        break;
      }
    }
    
    // 组合最终消息列表：系统消息 + 历史消息 + 最后用户消息
    return [
      ...systemMessages,
      ...includedMessages,
      ...(lastUserMessage ? [lastUserMessage] : [])
    ];
  }
  
  // 默认返回全部消息
  return messages;
} 