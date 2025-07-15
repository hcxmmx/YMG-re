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
            const streamGenerator = geminiService.generateResponseStream(
              messages as Message[],
              systemPrompt || "",
              params as GeminiParams
            );

            for await (const chunk of streamGenerator) {
              // 确保每个chunk都被正确编码和发送
              if (chunk) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
              }
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