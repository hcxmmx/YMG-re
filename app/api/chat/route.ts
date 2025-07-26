import { NextRequest, NextResponse } from "next/server";
import { GeminiService, GeminiParams } from "@/lib/gemini";
import type { Message } from "@/lib/types";
import { apiKeyStorage } from "@/lib/storage";

// 用于存储活动请求的AbortController
const activeRequests = new Map<string, AbortController>();

// 获取活动API密钥或回退到提供的密钥
async function getApiKey(providedKey: string): Promise<string> {
  try {
    // 尝试从存储中获取活动密钥
    const activeKey = await apiKeyStorage.getActiveApiKey();
    if (activeKey) {
      console.log(`使用轮询API密钥: ${activeKey.name} (ID: ${activeKey.id})`);
      return activeKey.key;
    }
  } catch (error) {
    console.warn("获取轮询API密钥失败，使用提供的密钥", error);
  }
  
  // 如果没有可用的轮询密钥，使用提供的密钥
  return providedKey;
}

// 添加DELETE方法用于取消请求
export async function DELETE(req: NextRequest) {
  // 从URL获取requestId
  const url = new URL(req.url);
  const requestId = url.searchParams.get("requestId");
  
  if (!requestId) {
    return NextResponse.json(
      { error: "未提供请求ID" },
      { status: 400 }
    );
  }
  
  // 查找并取消请求
  if (activeRequests.has(requestId)) {
    console.log(`手动取消请求: ${requestId}`);
    const controller = activeRequests.get(requestId);
    
    // 使用try-catch以避免潜在的错误
    try {
      controller?.abort();
      activeRequests.delete(requestId);
      return NextResponse.json({ success: true, message: "请求已取消" });
    } catch (error) {
      console.error(`取消请求时出错: ${requestId}`, error);
      return NextResponse.json(
        { success: false, message: "取消请求时出错" },
        { status: 500 }
      );
    }
  } else {
    return NextResponse.json(
      { success: false, message: "未找到指定ID的活动请求" },
      { status: 404 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { 
      messages, 
      systemPrompt, 
      stream = false, 
      apiKey,
      requestId, // 添加requestId参数
      ...params 
    } = await req.json();

    // 创建AbortController，但目前不实现取消逻辑
    const abortController = new AbortController();
    
    // 如果有requestId，保存AbortController
    if (requestId) {
      console.log(`收到请求: ${requestId}`); 
      activeRequests.set(requestId, abortController);
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "API密钥未提供" },
        { status: 400 }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "消息列表为空或格式错误" },
        { status: 400 }
      );
    }

    // 获取API密钥（优先使用轮询系统的密钥）
    const effectiveApiKey = await getApiKey(apiKey);
    const geminiService = new GeminiService(effectiveApiKey);
    
    // 如果需要流式响应
    if (stream) {
      const encoder = new TextEncoder();
      const customReadable = new ReadableStream({
        async start(controller) {
          try {
            console.log("开始流式响应生成");
            const streamGenerator = geminiService.generateResponseStream(
              messages as Message[],
              systemPrompt || "",
              { 
                ...params as GeminiParams,
                abortSignal: abortController.signal // 传递AbortSignal
              }
            );

            let chunkCount = 0;
            let hasContent = false;
            
            for await (const chunk of streamGenerator) {
              // 增加调试信息
              chunkCount++;
              console.log(`接收到第 ${chunkCount} 个数据块:`, 
                chunk !== undefined ? 
                  (typeof chunk === 'string' ? 
                    (chunk ? `"${chunk.substring(0, 50)}${chunk.length > 50 ? '...' : ''}"` : '空字符串') 
                    : '非字符串类型') 
                  : 'undefined');
              
              // 确保每个chunk都被正确编码和发送，即使是空字符串也发送
              if (chunk !== undefined) {
                hasContent = true;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
              }
            }
            
            console.log(`流式响应完成，共 ${chunkCount} 个数据块，${hasContent ? '有内容' : '无内容'}`);
            
            // 如果没有任何内容，发送一个空响应提示
            if (!hasContent) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: "AI未返回任何内容，可能是由于安全过滤或API限制。" })}\n\n`));
            }
            
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error: any) {
            console.error("流式响应生成错误:", error);
            const errorMessage = error.message || "生成响应时出错";
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
              );
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            } catch (e) {
              console.error("发送错误消息失败:", e);
            } finally {
              controller.close();
              
              // 请求完成后从活动请求中移除
              if (requestId) {
                activeRequests.delete(requestId);
              }
            }
          }
        },
      });

      return new NextResponse(customReadable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no", // 禁用Nginx缓冲
        },
      });
    }
    
    // 非流式响应
    try {
      const response = await geminiService.generateResponse(
        messages as Message[],
        systemPrompt || "",
        { 
          ...params as GeminiParams,
          abortSignal: abortController.signal // 传递AbortSignal
        }
      );
      
      // 如果有requestId，记录请求完成
      if (requestId) {
        console.log(`请求完成: ${requestId}`);
        activeRequests.delete(requestId); // 请求完成后从活动请求中移除
      }
      
      return NextResponse.json({ text: response });
    } catch (error: any) {
      console.error("非流式响应生成错误:", error);
      
      // 请求完成后从活动请求中移除
      if (requestId) {
        activeRequests.delete(requestId);
      }
      
      return NextResponse.json(
        { error: error.message || "生成响应时出错" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("API处理错误:", error);
    return NextResponse.json(
      { error: error.message || "处理请求时出错" },
      { status: 500 }
    );
  }
} 