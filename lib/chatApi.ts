import { apiKeyStorage } from "./storage";
import { fallbackStorage } from "./fallbackStorage";

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
  const timestamp = new Date().toLocaleString();
  
  try {
    // 记录API调用时间
    localStorage.setItem('debug_last_api_call', timestamp);

    // 检查是否需要使用后备存储
    const useFallback = fallbackStorage.shouldUseFallback();
    
    // 记录调试信息
    const debugLog = {
      timestamp,
      useFallback,
      environment: typeof window === 'undefined' ? 'server' : 'client',
      apiKeyPrefix: apiKey?.substring(0, 10) + '...'
    };
    
    localStorage.setItem('debug_current_state', JSON.stringify(debugLog));

    if (useFallback) {
      // 使用后备存储
      const activeKey = fallbackStorage.getActiveApiKey();
      if (activeKey && activeKey.key === apiKey) {
        fallbackStorage.incrementUsage(activeKey.id);
        localStorage.setItem('debug_last_count_update', `${timestamp} - 后备存储更新成功`);
      } else {
        localStorage.setItem('debug_last_count_update', `${timestamp} - 后备存储跳过计数`);
      }
    } else {
      // 使用正常的IndexedDB存储
      
      // 先尝试直接通过密钥找到对应的API密钥记录
      const allKeys = await apiKeyStorage.listApiKeys();
      const matchingKey = allKeys.find(key => key.key === apiKey && key.enabled);
      
      if (matchingKey) {
        // 找到匹配的密钥，直接更新
        await apiKeyStorage.incrementApiKeyUsage(matchingKey.id);
        localStorage.setItem('debug_last_count_update', 
          `${timestamp} - IndexedDB直接更新成功: ${matchingKey.name} (${(matchingKey.usageCount || 0) + 1}次)`);
      } else {
        // 没找到匹配的密钥，记录详细信息用于调试
        const activeKey = await apiKeyStorage.getActiveApiKey();
        const debugInfo = {
          allKeysCount: allKeys.length,
          enabledKeysCount: allKeys.filter(k => k.enabled).length,
          activeKeyInfo: activeKey ? {
            id: activeKey.id,
            name: activeKey.name,
            keyPrefix: activeKey.key.substring(0, 10) + '...',
            usageCount: activeKey.usageCount
          } : null,
          requestedKeyPrefix: apiKey.substring(0, 10) + '...',
          keyMatches: allKeys.map(k => ({
            name: k.name,
            keyPrefix: k.key.substring(0, 10) + '...',
            matches: k.key === apiKey,
            enabled: k.enabled
          }))
        };
        
        localStorage.setItem('debug_last_count_update', 
          `${timestamp} - IndexedDB跳过计数: 密钥不匹配 ${JSON.stringify(debugInfo)}`);
      }
    }
    
    // 触发UI更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('api-key-debug-update'));
    }
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    localStorage.setItem('debug_last_count_update', `${timestamp} - 错误: ${errorMsg}`);
    
    // 触发UI更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('api-key-debug-update'));
    }
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
