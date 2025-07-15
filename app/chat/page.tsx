"use client";

import { useState, useEffect, useRef } from "react";
import { Message } from "@/components/chat/message";
import { ChatInput } from "@/components/chat/chat-input";
import { useSettingsStore } from "@/lib/store";
import { Message as MessageType } from "@/lib/types";
import { generateId } from "@/lib/utils";

export default function ChatPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const { settings } = useSettingsStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 当消息更新时滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 添加欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: generateId(),
          role: "assistant",
          content: "你好！我是基于Gemini的AI助手。有什么我可以帮助你的吗？",
          timestamp: new Date(),
        },
      ]);
    }
  }, [messages.length]);

  // 发送消息
  const handleSendMessage = async (content: string, images?: string[]) => {
    if (!settings.apiKey) {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "system",
          content: "请先在设置中配置API密钥。",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    // 添加用户消息
    const userMessage: MessageType = {
      id: generateId(),
      role: "user",
      content,
      images,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // 构建请求消息历史
      const requestMessages = [...messages, userMessage];

      // API调用参数
      const params = {
        messages: requestMessages,
        systemPrompt: "你是一个友好、乐于助人的AI助手。",
        apiKey: settings.apiKey,
        stream: settings.enableStreaming,
        temperature: settings.temperature,
        maxOutputTokens: settings.maxTokens,
        topK: settings.topK,
        topP: settings.topP,
        model: settings.model,
        safetySettings: [
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: settings.safetySettings.hateSpeech },
          { category: "HARM_CATEGORY_HARASSMENT", threshold: settings.safetySettings.harassment },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: settings.safetySettings.sexuallyExplicit },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: settings.safetySettings.dangerousContent }
        ]
      };

      // 调用API获取回复
      if (settings.enableStreaming) {
        // 创建初始空消息
        const assistantMessageId = generateId();
        const initialAssistantMessage: MessageType = {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        };
        
        // 添加初始空消息
        setMessages((prev) => [...prev, initialAssistantMessage]);

        // 流式响应处理
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "API请求失败");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("流式响应读取失败");

        // 累积的响应内容
        let accumulatedContent = "";
        let decoder = new TextDecoder();
        let buffer = ""; // 用于存储不完整的数据块

        // 处理流式数据
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // 解码为文本
          const text = decoder.decode(value, { stream: true });
          buffer += text; // 将新数据添加到缓冲区
          
          // 尝试按SSE格式分割数据
          const lines = buffer.split("\n\n");
          // 保留最后一个可能不完整的块
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (!line.trim() || !line.startsWith("data: ")) continue;
            
            const data = line.replace("data: ", "");
            if (data === "[DONE]") {
              // 流结束标记，但继续处理其他可能的数据
              continue;
            }
            
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.error) {
                console.error("流式响应错误:", parsed.error);
                // 不抛出异常，而是显示错误消息
                setMessages((prev) => 
                  prev.map((msg) => 
                    msg.id === assistantMessageId
                      ? { 
                          ...msg, 
                          content: accumulatedContent + 
                            (accumulatedContent ? "\n\n" : "") + 
                            `[错误: ${parsed.error}]` 
                        }
                      : msg
                  )
                );
                continue;
              }
              
              if (parsed.text) {
                accumulatedContent += parsed.text;
                // 更新助手消息内容
                setMessages((prev) => 
                  prev.map((msg) => 
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              }
            } catch (e) {
              // 解析失败，记录错误但不中断流程
              console.error("解析流式数据失败:", e, "原始数据:", data);
              // 继续处理下一个数据块
            }
          }
        }
        
        // 处理缓冲区中可能剩余的数据
        if (buffer.trim()) {
          const lines = buffer.split("\n\n");
          for (const line of lines) {
            if (!line.trim() || !line.startsWith("data: ")) continue;
            
            const data = line.replace("data: ", "");
            if (data === "[DONE]") continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulatedContent += parsed.text;
                setMessages((prev) => 
                  prev.map((msg) => 
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error("解析剩余流式数据失败:", e);
            }
          }
        }
      } else {
        // 非流式响应
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "API请求失败");
        }

        const data = await response.json();

        // 添加助手回复
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "assistant",
            content: data.text,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error: any) {
      console.error("API调用失败:", error);
      // 添加错误消息
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "system",
          content: `消息发送失败: ${error.message || "未知错误"}。请检查网络连接和API密钥设置。`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* 聊天头部 */}
      <header className="border-b p-4">
        <h1 className="font-bold text-lg">Gemini {settings.model.split('-').slice(1).join('-')}</h1>
        <p className="text-sm text-muted-foreground">
          与Google的AI助手直接对话
        </p>
      </header>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg) => <Message key={msg.id} message={msg} />)}
        {isLoading && !settings.enableStreaming && (
          <div className="text-center py-2">AI正在思考...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
} 