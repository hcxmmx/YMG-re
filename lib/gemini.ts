import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import type { Message } from "./types";
import { apiKeyStorage } from "./storage";
import { 
  GeminiConfig, 
  UnifiedApiParams,
  GEMINI_DEFAULTS, 
  getDefaultModel,
  buildGeminiConfig 
} from "./config/gemini-config";
import { apiLogger } from "./logger";

// 保持向后兼容的接口
export type GeminiParams = Omit<UnifiedApiParams, 'messages' | 'systemPrompt' | 'apiKey' | 'stream' | 'requestId'>;

export class GeminiService {
  public genAI: GoogleGenAI;
  private apiKey: string;
  private activeKeyId: string | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenAI({ apiKey });
    // 在构造时不设置activeKeyId，让getActiveApiKey方法来处理
    this.activeKeyId = null;
  }
  
  // 获取活动API密钥并更新genAI实例
  private async getActiveApiKey(): Promise<string | undefined> {
    // 检查是否在客户端环境（浏览器）
    if (typeof window === 'undefined') {
      // 在服务器端，直接返回当前API密钥，不尝试访问IndexedDB
      console.log("服务器端环境，使用提供的API密钥");
      this.activeKeyId = null;
      return this.apiKey;
    }

    try {
      // 获取当前活动API密钥
      const activeKey = await apiKeyStorage.getActiveApiKey();
      
      if (activeKey) {
        // 设置当前活动密钥ID，这是关键！
        this.activeKeyId = activeKey.id;
        
        if (activeKey.key !== this.apiKey) {
          // 如果密钥发生变化，重新创建genAI实例
          this.apiKey = activeKey.key;
          this.genAI = new GoogleGenAI({ apiKey: activeKey.key });
          
          console.log(`已切换到API密钥: ${activeKey.name} (ID: ${activeKey.id})`);
        }
        return activeKey.key;
      }
      
      // 如果没有可用密钥，继续使用当前密钥，但清除activeKeyId
      this.activeKeyId = null;
      return this.apiKey;
    } catch (error) {
      console.error("获取API密钥失败，使用默认密钥:", error);
      this.activeKeyId = null;
      return this.apiKey;
    }
  }
  
  // 记录当前密钥的使用
  private async incrementApiKeyUsage() {
    console.log(`尝试增加API密钥使用次数，activeKeyId: ${this.activeKeyId}`);
    
    // 检查是否在客户端环境
    if (typeof window === 'undefined') {
      console.log("服务器端环境，跳过API密钥使用次数统计");
      return;
    }
    
    if (this.activeKeyId) {
      try {
        await apiKeyStorage.incrementApiKeyUsage(this.activeKeyId);
        console.log(`成功增加API密钥 ${this.activeKeyId} 的使用次数`);
      } catch (error) {
        console.error("增加API密钥使用次数失败:", error);
      }
    } else {
      console.warn("activeKeyId为空，无法增加使用次数");
    }
  }

  // 辅助方法：从DataURL中提取Base64数据部分
  private extractBase64FromDataUrl(dataUrl: string): string {
    // 检查是否是DataURL格式
    if (dataUrl.startsWith('data:')) {
      const base64Index = dataUrl.indexOf('base64,');
      if (base64Index !== -1) {
        // 提取base64部分
        return dataUrl.substring(base64Index + 7);
      }
    }
    
    // 如果不是DataURL格式，假设已经是Base64编码
    return dataUrl;
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
            // 处理DataURL格式，提取base64部分
            const base64Data = this.extractBase64FromDataUrl(image);
            
            userContent.parts.push({
              inlineData: {
                data: base64Data,
                mimeType: "image/jpeg" // 假设图片是JPEG格式，可以根据实际情况调整
              }
            } as any);
          }
        }
        
        // 处理新的files格式（支持多种文件类型）
        if (msg.files && msg.files.length > 0) {
          for (const file of msg.files) {
            // 根据文件类型进行处理
            if (file.type.startsWith('image/')) {
              // 图片文件：提取base64部分
              const base64Data = this.extractBase64FromDataUrl(file.data);
              
              userContent.parts.push({
                inlineData: {
                  data: base64Data,
                  mimeType: file.type
                }
              } as any);
            } else if (file.type === 'text/plain' || file.type === 'application/json' || file.type === 'text/markdown') {
              // 文本文件：作为文本内容添加
              userContent.parts.push({
                text: file.data
              });
            } else {
              // 其他类型文件：尝试作为base64处理
              try {
                const base64Data = this.extractBase64FromDataUrl(file.data);
                userContent.parts.push({
                  inlineData: {
                    data: base64Data,
                    mimeType: file.type
                  }
                } as any);
              } catch (error) {
                console.error("处理文件数据失败:", error);
                // 如果处理失败，尝试作为文本添加
                userContent.parts.push({
                  text: `[无法处理的文件: ${file.name || "未命名文件"}]`
                });
              }
            }
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

    // 使用活动API密钥
    await this.getActiveApiKey();
    
    // 构建统一配置
    const config = buildGeminiConfig(this.apiKey, {
      model: getDefaultModel(params.model),
      temperature: params.temperature,
      topK: params.topK,
      topP: params.topP,
      maxOutputTokens: params.maxOutputTokens,
      abortSignal: params.abortSignal
    });

    // 构建请求参数
    const requestParams = {
      model: config.model!,
      contents: formattedContents,
      config: {
        temperature: config.temperature,
        topK: config.topK,
        topP: config.topP,
        maxOutputTokens: config.maxOutputTokens,
        systemInstruction: finalSystemPrompt,
        safetySettings: (params.safetySettings || config.safetySettings)?.map(setting => ({
          category: setting.category as HarmCategory,
          threshold: setting.threshold as HarmBlockThreshold,
        })),
        abortSignal: config.abortSignal,
      }
    };

    // 开始日志记录
    const logId = apiLogger.startRequest(
      'gemini',
      'POST',
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}/generateContent`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey ? '[REDACTED]' : 'N/A'
        },
        body: {
          contents: formattedContents,
          generationConfig: {
            temperature: config.temperature,
            topK: config.topK,
            topP: config.topP,
            maxOutputTokens: config.maxOutputTokens,
          },
          systemInstruction: finalSystemPrompt,
          safetySettings: requestParams.config.safetySettings
        },
        config: {
          model: config.model,
          apiKeyStatus: this.apiKey ? 'Available' : 'Missing'
        }
      }
    );

    try {
      // 创建生成内容请求
      const result = await this.genAI.models.generateContent(requestParams);
      
      // 记录成功响应
      apiLogger.logSuccess(
        logId,
        'gemini',
        'POST',
        `https://generativelanguage.googleapis.com/v1beta/models/${config.model}/generateContent`,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': '[REDACTED]'
          },
          body: {
            contents: formattedContents,
            generationConfig: {
              temperature: config.temperature,
              topK: config.topK,
              topP: config.topP,
              maxOutputTokens: config.maxOutputTokens,
            },
            systemInstruction: finalSystemPrompt,
            safetySettings: requestParams.config.safetySettings
          }
        },
        {
          status: 200,
          data: {
            candidates: result.candidates,
            usageMetadata: result.usageMetadata,
            modelVersion: result.modelVersion
          },
          text: result.text || ""
        }
      );
      
      // 增加API密钥使用次数
      await this.incrementApiKeyUsage();

      return result.text || "";
    } catch (error) {
      console.error("生成回复时出错:", error);
      
      // 记录错误响应
      apiLogger.logError(
        logId,
        'gemini',
        'POST',
        `https://generativelanguage.googleapis.com/v1beta/models/${config.model}/generateContent`,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': '[REDACTED]'
          },
          body: {
            contents: formattedContents,
            generationConfig: {
              temperature: config.temperature,
              topK: config.topK,
              topP: config.topP,
              maxOutputTokens: config.maxOutputTokens,
            },
            systemInstruction: finalSystemPrompt,
            safetySettings: requestParams.config.safetySettings
          }
        },
        error as Error,
        {
          status: (error as any)?.status || undefined,
          data: (error as any)?.response?.data || undefined
        }
      );
      
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

    // 使用活动API密钥
    await this.getActiveApiKey();
    
    // 构建统一配置
    const config = buildGeminiConfig(this.apiKey, {
      model: getDefaultModel(params.model),
      temperature: params.temperature,
      topK: params.topK,
      topP: params.topP,
      maxOutputTokens: params.maxOutputTokens,
      abortSignal: params.abortSignal
    });

    // 开始日志记录
    const logId = apiLogger.startRequest(
      'gemini',
      'POST',
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}/generateContent:streamGenerateContent`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey ? '[REDACTED]' : 'N/A'
        },
        body: {
          contents: formattedContents,
          generationConfig: {
            temperature: config.temperature,
            topK: config.topK,
            topP: config.topP,
            maxOutputTokens: config.maxOutputTokens,
          },
          systemInstruction: finalSystemPrompt,
          safetySettings: (params.safetySettings || config.safetySettings)?.map(setting => ({
            category: setting.category as HarmCategory,
            threshold: setting.threshold as HarmBlockThreshold,
          }))
        },
        config: {
          model: config.model,
          apiKeyStatus: this.apiKey ? 'Available' : 'Missing',
          streamMode: true
        }
      }
    );

    try {

      // 创建流式生成内容请求
      const result = await this.genAI.models.generateContentStream({
        model: config.model!,
        contents: formattedContents,
        config: {
          temperature: config.temperature,
          topK: config.topK,
          topP: config.topP,
          maxOutputTokens: config.maxOutputTokens,
          systemInstruction: finalSystemPrompt,
          safetySettings: (params.safetySettings || config.safetySettings)?.map(setting => ({
            category: setting.category as HarmCategory,
            threshold: setting.threshold as HarmBlockThreshold,
          })),
          abortSignal: config.abortSignal,
        }
      });

      // 增加API密钥使用次数
      await this.incrementApiKeyUsage();
      
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