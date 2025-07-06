import { NextRequest, NextResponse } from "next/server";
import { GeminiService } from "@/lib/gemini";
import type { Message, GeminiParams } from "@/lib/types";

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
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error: any) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new NextResponse(customReadable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }
    
    // 非流式响应
    const response = await geminiService.generateResponse(
      messages as Message[],
      systemPrompt || "",
      params as GeminiParams
    );

    return NextResponse.json({ text: response });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "处理请求时出错" },
      { status: 500 }
    );
  }
} 