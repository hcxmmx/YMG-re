import { apiKeyStorage } from "./storage";

// 聊天API参数类型
export interface ChatApiParams {
  messages: any[];
  systemPrompt?: string;
  apiKey: string;
  stream: boolean;
  requestId?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topK?: number;
  topP?: number;
  model?: string;
  safetySettings?: any[];
}

// 增加API密钥使用次数的辅助函数
const incrementApiKeyUsageCount = async (apiKey: string) => {
  try {
    // 直接通过密钥匹配找到对应的API密钥记录
    const allKeys = await apiKeyStorage.listApiKeys();
    const matchingKey = allKeys.find(key => key.key === apiKey && key.enabled);
    
    if (matchingKey) {
      await apiKeyStorage.incrementApiKeyUsage(matchingKey.id);
    }
  } catch (error) {
    console.error("增加API密钥使用次数失败:", error);
  }
};

// 统一的API调用函数
export async function callChatApi(params: ChatApiParams): Promise<Response> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  // 成功时自动增加使用次数
  if (response.ok) {
    await incrementApiKeyUsageCount(params.apiKey);
  }

  return response;
}

// 流式响应处理器
export async function* handleStreamResponse(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("流式响应读取失败");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      buffer += text;

      // 处理完整的数据行
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || ""; // 保留最后一个可能不完整的行

      for (const line of lines) {
        if (!line.trim() || !line.startsWith("data: ")) continue;

        const data = line.replace("data: ", "");
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.text !== undefined) {
            yield parsed.text;
          }
        } catch (e) {
          console.error("解析流式数据失败:", e, "原始数据:", data);
        }
      }
    }

    // 处理缓冲区中剩余的数据
    if (buffer.trim()) {
      const lines = buffer.split("\n\n");
      for (const line of lines) {
        if (!line.trim() || !line.startsWith("data: ")) continue;

        const data = line.replace("data: ", "");
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.text !== undefined) {
            yield parsed.text;
          }
        } catch (e) {
          console.error("解析剩余流式数据失败:", e);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// 非流式响应处理器
export async function handleNonStreamResponse(response: Response): Promise<string> {
  const data = await response.json();
  return data.text || "";
}
