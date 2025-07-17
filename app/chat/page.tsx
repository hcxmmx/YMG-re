"use client";

import { useState, useEffect, useRef } from "react";
import { Message } from "@/components/chat/message";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatHeader } from "@/components/chat/chat-header";
import { useSettingsStore, useChatStore } from "@/lib/store";
import { Message as MessageType } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { useNavbar } from "@/app/layout";

export default function ChatPage() {
  const { settings } = useSettingsStore();
  const { 
    currentMessages, 
    isLoading, 
    systemPrompt,
    addMessage,
    updateMessage,
    setIsLoading,
    startNewConversation
  } = useChatStore();
  const { isNavbarVisible } = useNavbar();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const responseStartTimeRef = useRef<number>(0);

  // 当消息更新时滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);
  
  // 当导航栏状态改变时，保持滚动位置
  useEffect(() => {
    const timer = setTimeout(() => {
      // 如果有新消息，滚动到底部
      if (currentMessages.length > 0 && !isLoading) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, 300); // 等待导航栏动画完成
    
    return () => clearTimeout(timer);
  }, [isNavbarVisible, isLoading]);

  // 发送消息
  const handleSendMessage = async (content: string, images?: string[]) => {
    if (!settings.apiKey) {
      addMessage({
        id: generateId(),
        role: "system",
        content: "请先在设置中配置API密钥。",
        timestamp: new Date(),
      });
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
    
    await addMessage(userMessage);
    setIsLoading(true);
    
    // 记录响应开始时间
    responseStartTimeRef.current = Date.now();

    try {
      // 构建请求消息历史
      const requestMessages = [...currentMessages, userMessage];

      // API调用参数
      const params = {
        messages: requestMessages,
        systemPrompt: systemPrompt,
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

        console.log("流式响应开始接收");
        const reader = response.body?.getReader();
        if (!reader) throw new Error("流式响应读取失败");

        // 累积的响应内容
        let accumulatedContent = "";
        let decoder = new TextDecoder();
        let buffer = ""; // 用于存储不完整的数据块
        let chunkCount = 0;
        let dataChunkCount = 0;
        let firstChunkReceived = false;

        // 创建初始空消息
        const assistantMessageId = generateId();
        const initialAssistantMessage: MessageType = {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        };
        
        // 添加初始空消息
        await addMessage(initialAssistantMessage);

        // 处理流式数据
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log("流式响应接收完成");
            break;
          }

          // 解码为文本
          const text = decoder.decode(value, { stream: true });
          chunkCount++;
          console.log(`接收到第 ${chunkCount} 个原始数据块，长度: ${text.length}`);
          buffer += text; // 将新数据添加到缓冲区
          
          // 尝试按SSE格式分割数据
          const lines = buffer.split("\n\n");
          // 保留最后一个可能不完整的块
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            if (!line.startsWith("data: ")) {
              console.warn("非预期格式的数据行:", line);
              continue;
            }
            
            const data = line.replace("data: ", "");
            if (data === "[DONE]") {
              console.log("收到流结束标记");
              continue;
            }
            
            try {
              dataChunkCount++;
              const parsed = JSON.parse(data);
              console.log(`解析第 ${dataChunkCount} 个数据块:`, 
                parsed.text ? `文本(${parsed.text.length}字符)` : 
                parsed.error ? `错误(${parsed.error})` : "无内容");
              
              if (parsed.error) {
                console.error("流式响应错误:", parsed.error);
                // 不抛出异常，而是显示错误消息
                const updatedContent = accumulatedContent + 
                  (accumulatedContent ? "\n\n" : "") + 
                  `[错误: ${parsed.error}]`;
                
                // 使用updateMessage更新消息内容
                updateMessage({
                  id: assistantMessageId,
                  role: "assistant",
                  content: updatedContent,
                  timestamp: new Date(),
                });
                continue;
              }
              
              if (parsed.text !== undefined) {
                // 记录第一个内容块的时间
                if (!firstChunkReceived) {
                  firstChunkReceived = true;
                  const firstChunkTime = Date.now() - responseStartTimeRef.current;
                  console.log(`首个响应块接收时间: ${firstChunkTime}ms`);
                }
                
                accumulatedContent += parsed.text;
                // 使用updateMessage更新消息内容，并添加时间戳用于调试
                console.log(`更新消息内容，时间: ${new Date().toISOString()}, 新增内容: "${parsed.text}"`);
                updateMessage({
                  id: assistantMessageId,
                  role: "assistant",
                  content: accumulatedContent,
                  timestamp: new Date(),
                });
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
          console.log("处理剩余缓冲区数据");
          const lines = buffer.split("\n\n");
          for (const line of lines) {
            if (!line.trim() || !line.startsWith("data: ")) continue;
            
            const data = line.replace("data: ", "");
            if (data === "[DONE]") continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.text !== undefined) {
                accumulatedContent += parsed.text;
                // 使用updateMessage更新消息内容
                updateMessage({
                  id: assistantMessageId,
                  role: "assistant",
                  content: accumulatedContent,
                  timestamp: new Date(),
                });
              }
            } catch (e) {
              console.error("解析剩余流式数据失败:", e);
            }
          }
        }
        
        // 计算总响应时间并更新消息
        const responseTime = Date.now() - responseStartTimeRef.current;
        console.log(`总响应时间: ${responseTime}ms`);
        
        // 如果最终没有收到任何内容，显示提示信息
        if (!accumulatedContent) {
          console.warn("流式响应未产生任何内容");
          updateMessage({
            id: assistantMessageId,
            role: "assistant",
            content: "AI未能生成回复。可能是由于安全过滤或其他原因。",
            timestamp: new Date(),
            responseTime: responseTime
          });
        } else {
          // 更新最终消息，包含响应时间
          updateMessage({
            id: assistantMessageId,
            role: "assistant",
            content: accumulatedContent,
            timestamp: new Date(),
            responseTime: responseTime
          });
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
        const responseTime = Date.now() - responseStartTimeRef.current;

        // 添加助手回复
        await addMessage({
          id: generateId(),
          role: "assistant",
          content: data.text,
          timestamp: new Date(),
          responseTime: responseTime
        });
      }
    } catch (error: any) {
      console.error("API调用失败:", error);
      // 添加错误消息
      await addMessage({
        id: generateId(),
        role: "system",
        content: `消息发送失败: ${error.message || "未知错误"}。请检查网络连接和API密钥设置。`,
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col ${isNavbarVisible ? 'h-[calc(100vh-65px)]' : 'h-screen'}`}>
      <ChatHeader />
      <div className="flex-1 overflow-y-auto p-4">
        {currentMessages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t">
        <ChatInput 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading}
          disabled={isLoading}
        />
      </div>
    </div>
  );
} 