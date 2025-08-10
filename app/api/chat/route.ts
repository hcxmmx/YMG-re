import { NextRequest, NextResponse } from "next/server";
import { GeminiService, GeminiParams } from "@/lib/gemini";
import { UnifiedApiParams } from "@/lib/config/gemini-config";
import type { Message } from "@/lib/types";

// 用于存储活动请求的AbortController
const activeRequests = new Map<string, AbortController>();

// 获取活动API密钥或回退到提供的密钥
async function getApiKey(providedKey: string): Promise<string> {
  // 在服务器端，我们无法访问IndexedDB，所以直接使用提供的密钥
  // API密钥轮询逻辑应该在客户端处理
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
    // 创建GeminiService实例，它会在调用时自动获取和设置正确的activeKeyId
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
            
            // 提取详细错误信息
            let errorDetails: any = {
              code: 500,
              message: "生成响应时出错",
              timestamp: new Date().toISOString()
            };

            try {
              // 处理Gemini API错误 
              if (error.status) {
                errorDetails.code = error.status;
                
                // 尝试解析错误消息
                if (error.message) {
                  try {
                    // 如果错误消息是JSON字符串，尝试解析
                    const errorObj = JSON.parse(error.message);
                    if (errorObj.error) {
                      errorDetails.message = errorObj.error.message || errorObj.error.code || error.message;
                      errorDetails.details = errorObj.error;
                    } else {
                      errorDetails.message = error.message;
                    }
                  } catch (parseError) {
                    // 如果不是JSON，直接使用错误消息
                    errorDetails.message = error.message;
                  }
                }
              } 
              // 处理网络错误等
              else if (error.message) {
                if (error.message.includes('fetch failed') || error.message.includes('NetworkError')) {
                  errorDetails.code = 0;
                  errorDetails.message = "网络连接失败：无法连接到API服务器";
                } else if (error.message.includes('User location is not supported')) {
                  errorDetails.code = 400;
                  errorDetails.message = "用户所在地区不支持此API";
                } else {
                  errorDetails.message = error.message;
                }
              }
              
              // 添加调试信息（开发环境）
              if (process.env.NODE_ENV === 'development' && error.stack) {
                errorDetails.details = { ...errorDetails.details, stack: error.stack };
              }
            } catch (extractError) {
              console.error("提取错误详情失败:", extractError);
            }

            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: errorDetails })}\n\n`)
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
      
      // 提取详细错误信息
      let errorDetails: any = {
        code: 500,
        message: "生成响应时出错",
        timestamp: new Date().toISOString()
      };

      try {
        // 处理Gemini API错误
        if (error.status) {
          errorDetails.code = error.status;
          
          // 尝试解析错误消息
          if (error.message) {
            try {
              // 如果错误消息是JSON字符串，尝试解析
              const errorObj = JSON.parse(error.message);
              if (errorObj.error) {
                errorDetails.message = errorObj.error.message || errorObj.error.code || error.message;
                errorDetails.details = errorObj.error;
              } else {
                errorDetails.message = error.message;
              }
            } catch (parseError) {
              // 如果不是JSON，直接使用错误消息
              errorDetails.message = error.message;
            }
          }
        } 
        // 处理网络错误等
        else if (error.message) {
          if (error.message.includes('fetch failed') || error.message.includes('NetworkError')) {
            errorDetails.code = 0;
            errorDetails.message = "网络连接失败：无法连接到API服务器";
          } else if (error.message.includes('User location is not supported')) {
            errorDetails.code = 400;
            errorDetails.message = "用户所在地区不支持此API";
          } else {
            errorDetails.message = error.message;
          }
        }
        
        // 添加调试信息（开发环境）
        if (process.env.NODE_ENV === 'development' && error.stack) {
          errorDetails.details = { ...errorDetails.details, stack: error.stack };
        }
      } catch (extractError) {
        console.error("提取错误详情失败:", extractError);
      }
      
      return NextResponse.json(
        { error: errorDetails },
        { status: errorDetails.code }
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