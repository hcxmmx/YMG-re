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
  abortSignal?: AbortSignal; // 添加AbortSignal支持
}

export class GeminiService {
  public genAI: GoogleGenAI;
  private defaultModel: string = "gemini-2.5-pro";

  constructor(apiKey: string) {
    this.genAI = new GoogleGenAI({ apiKey });
  }

  // 转换消息格式，从我们应用中的格式转为Gemini API需要的格式
  public transformMessages(messages: Message[]) {
    // 提取系统消息
    const systemMessage = messages.find((msg) => msg.role === "system");
    const systemPrompt = systemMessage?.content || "";

    // 过滤出用户和助手消息
    const chatMessages = messages.filter((msg) => msg.role !== "system");

    // 确保以用户消息结尾
    if (chatMessages.length > 0 && chatMessages[chatMessages.length - 1].role === "assistant") {
      chatMessages.push({
        id: "temp-user-message",
        role: "user",
        content: "请继续",
        timestamp: new Date()
      });
    }

    // 将我们的消息格式转换为Gemini API需要的格式
    const formattedContents = [];

    // 处理所有消息
    for (const msg of chatMessages) {
      if (msg.role === "user") {
        // 处理用户消息
        const userContent = {
          role: "user",
          parts: [{ text: msg.content }]
        };

        // 如果有图片，添加到parts中
        if (msg.images && msg.images.length > 0) {
          for (const image of msg.images) {
            // 使用类型断言来处理data属性
            userContent.parts.push({
              data: image,
              type: "image/jpeg" // 假设图片是JPEG格式，可以根据实际情况调整
            } as any);
          }
        }

        formattedContents.push(userContent);
      } else if (msg.role === "assistant") {
        // 处理助手消息
        formattedContents.push({
          role: "model",
          parts: [{ text: msg.content }]
        });
      }
    }

    return {
      systemPrompt,
      formattedContents
    };
  }

  // 生成回复（非流式）
  async generateResponse(
    messages: Message[],
    systemPrompt: string,
    params: GeminiParams = {}
  ) {
    const { systemPrompt: extractedSystemPrompt, formattedContents } = this.transformMessages(messages);
    const finalSystemPrompt = systemPrompt || extractedSystemPrompt;

    // 如果没有消息，返回空字符串
    if (formattedContents.length === 0) {
      return "";
    }

    try {
      // 创建生成内容请求
      const result = await this.genAI.models.generateContent({
        model: params.model || this.defaultModel,
        contents: formattedContents,
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
          abortSignal: params.abortSignal, // 添加AbortSignal支持
        }
      });

      return result.text || "";
    } catch (error) {
      console.error("生成回复时出错:", error);
      throw error;
    }
  }

  // 生成流式回复
  async *generateResponseStream(
    messages: Message[],
    systemPrompt: string,
    params: GeminiParams = {}
  ) {
    const { systemPrompt: extractedSystemPrompt, formattedContents } = this.transformMessages(messages);
    const finalSystemPrompt = systemPrompt || extractedSystemPrompt;

    // 如果没有消息，返回空字符串
    if (formattedContents.length === 0) {
      yield "";
      return;
    }

    try {
      // 创建流式生成内容请求
      const result = await this.genAI.models.generateContentStream({
        model: params.model || this.defaultModel,
        contents: formattedContents,
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
          abortSignal: params.abortSignal, // 添加AbortSignal支持
        }
      });

      let hasYieldedContent = false;

      for await (const chunk of result) {
        // 添加调试信息
        console.debug("流式响应chunk:", JSON.stringify({
          hasText: !!chunk.text,
          hasCandidates: !!chunk.candidates,
          candidatesLength: chunk.candidates?.length,
          hasContent: !!chunk.candidates?.[0]?.content,
          partsLength: chunk.candidates?.[0]?.content?.parts?.length,
          firstPartType: chunk.candidates?.[0]?.content?.parts?.[0] ?
            Object.keys(chunk.candidates[0].content.parts[0]) : undefined
        }));

        // 尝试从chunk中提取文本
        let extractedText = "";

        // 方法1: 使用内置的text属性
        if (chunk.text !== undefined) {
          extractedText = chunk.text;
        }
        // 方法2: 手动从parts中提取文本
        else if (chunk.candidates?.[0]?.content?.parts) {
          const parts = chunk.candidates[0].content.parts;
          for (const part of parts) {
            if (typeof part.text === 'string') {
              extractedText += part.text;
            }
          }
        }

        // 无论是否提取到文本，都返回一个值（可能是空字符串）以保持流的连续性
        hasYieldedContent = true;
        yield extractedText || ""; // 确保始终返回字符串，即使是空字符串
      }

      // 如果没有生成任何内容，返回一个提示信息
      if (!hasYieldedContent) {
        console.warn("流式响应未产生任何内容");
        yield "AI没有生成任何内容。可能是由于安全过滤或其他原因。";
      }
    } catch (error: any) {
      console.error("流式生成错误:", error);
      // 将错误转发给调用者
      throw error;
    }
  }
} 