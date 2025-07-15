import { NextRequest, NextResponse } from "next/server";
import { GeminiService, GeminiParams } from "@/lib/gemini";
import type { Message } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { 
      messages, 
      systemPrompt, 
      stream = false, 
      apiKey,
      ...params 
    } = await req.json();

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

    const geminiService = new GeminiService(apiKey);
    
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
              params as GeminiParams
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
                // 立即发送数据，不等待其他操作
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
                
                // 添加一个小延迟，确保客户端有时间处理
                await new Promise(resolve => setTimeout(resolve, 0));
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
        params as GeminiParams
      );

      return NextResponse.json({ text: response });
    } catch (error: any) {
      console.error("非流式响应生成错误:", error);
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