import { apiKeyStorage } from "./storage";
import { UnifiedApiParams } from "./config/gemini-config";

// 重新导出统一接口以保持向后兼容
export type ChatApiParams = UnifiedApiParams;

// 统一的API调用函数
// 注意: API密钥使用次数将由GeminiService内部自动处理，无需在此重复处理
export async function callChatApi(params: ChatApiParams): Promise<Response> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

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
