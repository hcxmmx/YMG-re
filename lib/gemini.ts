import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import type { Message, GeminiParams } from "./types";

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: string = "gemini-1.5-pro";

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  // 转换消息格式，从我们应用中的格式转为Gemini API需要的格式
  private transformMessages(messages: Message[]) {
    return messages.map((message) => {
      // 只处理用户和助手消息，忽略系统消息
      if (message.role === "system") return null;

      const parts: any[] = [{ text: message.content }];

      // 如果消息包含图片，添加到parts
      if (message.images && message.images.length > 0) {
        message.images.forEach((imageUrl) => {
          if (imageUrl.startsWith("data:image/")) {
            parts.push({
              inlineData: {
                data: imageUrl.split(",")[1],
                mimeType: imageUrl.split(";")[0].split(":")[1],
              },
            });
          }
        });
      }

      return {
        role: message.role === "user" ? "user" : "model",
        parts,
      };
    }).filter(Boolean); // 过滤掉null（系统消息）
  }

  // 生成回复（非流式）
  async generateResponse(
    messages: Message[],
    systemPrompt: string,
    params: GeminiParams = {}
  ) {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      // 使用安全的方式传递系统提示词
      generationConfig: {
        temperature: params.temperature ?? 0.7,
        topK: params.topK ?? 40,
        topP: params.topP ?? 0.95,
        maxOutputTokens: params.maxOutputTokens ?? 1024,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    const transformedMessages = this.transformMessages(messages);
    
    // 添加系统提示词作为第一条消息
    if (systemPrompt) {
      transformedMessages.unshift({
        role: "user",
        parts: [{ text: `System: ${systemPrompt}` }],
      });
    }
    
    const result = await model.generateContent({
      contents: transformedMessages as any[],
    });

    return result.response.text();
  }

  // 生成流式回复
  async *generateResponseStream(
    messages: Message[],
    systemPrompt: string,
    params: GeminiParams = {}
  ) {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      // 使用安全的方式传递系统提示词
      generationConfig: {
        temperature: params.temperature ?? 0.7,
        topK: params.topK ?? 40,
        topP: params.topP ?? 0.95,
        maxOutputTokens: params.maxOutputTokens ?? 1024,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    const transformedMessages = this.transformMessages(messages);
    
    // 添加系统提示词作为第一条消息
    if (systemPrompt) {
      transformedMessages.unshift({
        role: "user",
        parts: [{ text: `System: ${systemPrompt}` }],
      });
    }
    
    const result = await model.generateContentStream({
      contents: transformedMessages as any[],
    });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  }
} 