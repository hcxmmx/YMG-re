import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import type { Message } from "./types";

export interface GeminiParams {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
  model?: string;
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

export class GeminiService {
  private genAI: GoogleGenAI;
  private defaultModel: string = "gemini-2.5-pro";

  constructor(apiKey: string) {
    this.genAI = new GoogleGenAI({ apiKey });
  }

  // 转换消息格式，从我们应用中的格式转为Gemini API需要的格式
  private transformMessages(messages: Message[]) {
    // 提取系统消息
    const systemMessage = messages.find((msg) => msg.role === "system");
    const systemPrompt = systemMessage?.content || "";
    
    // 过滤出用户和助手消息
    const chatMessages = messages.filter((msg) => msg.role !== "system");
    
    return {
      systemPrompt,
      chatMessages
    };
  }

  // 生成回复（非流式）
  async generateResponse(
    messages: Message[],
    systemPrompt: string,
    params: GeminiParams = {}
  ) {
    const { systemPrompt: extractedSystemPrompt, chatMessages } = this.transformMessages(messages);
    const finalSystemPrompt = systemPrompt || extractedSystemPrompt;
    
    // 创建聊天实例
    const chat = this.genAI.chats.create({
      model: params.model || this.defaultModel,
      config: {
        temperature: params.temperature ?? 0.7,
        topK: params.topK ?? 40,
        topP: params.topP ?? 0.95,
        maxOutputTokens: params.maxOutputTokens ?? 1024,
        systemInstruction: finalSystemPrompt,
        safetySettings: params.safetySettings?.map(setting => ({
          category: setting.category as HarmCategory,
          threshold: setting.threshold as HarmBlockThreshold,
        })),
      }
    });

    // 构建聊天历史
    for (let i = 0; i < chatMessages.length - 1; i++) {
      const msg = chatMessages[i];
      if (msg.role === "user") {
        // 添加用户消息
        await chat.sendMessage({
          message: msg.content,
          ...(msg.images && msg.images.length > 0 && {
            parts: msg.images.map(img => ({ data: img }))
          })
        });
      }
    }
    
    // 发送最后一条用户消息并获取响应
    const lastUserMessage = chatMessages[chatMessages.length - 1];
    if (!lastUserMessage) {
      throw new Error("没有用户消息可以发送");
    }
    
    const response = await chat.sendMessage({
      message: lastUserMessage.content,
      ...(lastUserMessage.images && lastUserMessage.images.length > 0 && {
        parts: lastUserMessage.images.map(img => ({ data: img }))
      })
    });

    return response.text;
  }

  // 生成流式回复
  async *generateResponseStream(
    messages: Message[],
    systemPrompt: string,
    params: GeminiParams = {}
  ) {
    const { systemPrompt: extractedSystemPrompt, chatMessages } = this.transformMessages(messages);
    const finalSystemPrompt = systemPrompt || extractedSystemPrompt;
    
    // 创建聊天实例
    const chat = this.genAI.chats.create({
      model: params.model || this.defaultModel,
      config: {
        temperature: params.temperature ?? 0.7,
        topK: params.topK ?? 40,
        topP: params.topP ?? 0.95,
        maxOutputTokens: params.maxOutputTokens ?? 1024,
        systemInstruction: finalSystemPrompt,
        safetySettings: params.safetySettings?.map(setting => ({
          category: setting.category as HarmCategory,
          threshold: setting.threshold as HarmBlockThreshold,
        })),
      }
    });

    try {
      // 构建聊天历史
      for (let i = 0; i < chatMessages.length - 1; i++) {
        const msg = chatMessages[i];
        if (msg.role === "user") {
          // 添加用户消息
          await chat.sendMessage({
            message: msg.content,
            ...(msg.images && msg.images.length > 0 && {
              parts: msg.images.map(img => ({ data: img }))
            })
          });
        }
      }
      
      // 发送最后一条用户消息并获取流式响应
      const lastUserMessage = chatMessages[chatMessages.length - 1];
      if (!lastUserMessage) {
        throw new Error("没有用户消息可以发送");
      }
      
      const responseStream = await chat.sendMessageStream({
        message: lastUserMessage.content,
        ...(lastUserMessage.images && lastUserMessage.images.length > 0 && {
          parts: lastUserMessage.images.map(img => ({ data: img }))
        })
      });

      let hasYieldedContent = false;
      
      for await (const chunk of responseStream) {
        if (chunk.text) {
          hasYieldedContent = true;
          yield chunk.text;
        }
      }
      
      // 如果没有生成任何内容，返回一个提示信息
      if (!hasYieldedContent) {
        yield "AI没有生成任何内容。可能是由于安全过滤或其他原因。";
      }
    } catch (error: any) {
      console.error("流式生成错误:", error);
      // 将错误转发给调用者
      throw error;
    }
  }
} 