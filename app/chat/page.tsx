"use client";

import { useState, useEffect, useRef } from "react";
import { Message } from "@/components/chat/message";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatHeader } from "@/components/chat/chat-header";
import { useSettingsStore, useChatStore } from "@/lib/store";
import { Message as MessageType } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { useNavbar } from "@/app/layout";
import { useSearchParams } from "next/navigation";

export default function ChatPage() {
  const { settings } = useSettingsStore();
  const {
    currentMessages,
    isLoading,
    systemPrompt,
    currentCharacter,
    addMessage,
    updateMessage,
    setIsLoading,
    startNewConversation,
    startCharacterChat,
    currentConversationId,
    conversations,
    loadConversations,
    setCurrentConversation
  } = useChatStore();
  const { isNavbarVisible } = useNavbar();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const responseStartTimeRef = useRef<number>(0);
  const searchParams = useSearchParams();
  const characterIdRef = useRef<string | null>(null);
  // 标记是否已处理URL参数
  const urlParamsProcessedRef = useRef(false);

  // 处理URL参数，加载角色和对话，但只在首次加载时处理
  useEffect(() => {
    // 如果已经处理过URL参数，则不再处理
    if (urlParamsProcessedRef.current) {
      return;
    }

    const characterId = searchParams.get('characterId');
    const conversationId = searchParams.get('conversationId');

    // 标记URL参数已处理
    urlParamsProcessedRef.current = true;

    // 如果有对话ID参数，优先加载指定对话
    if (conversationId) {
      setCurrentConversation(conversationId).catch(error => {
        console.error('加载指定对话失败:', error);
      });
      return; // 已经处理了对话加载，不需要进一步处理角色
    }

    // 如果只有角色ID参数
    if (characterId) {
      characterIdRef.current = characterId;

      // 检查是否已经有该角色的对话
      const characterConversations = conversations.filter(conv => 
        conv.messages.some(msg => msg.role === 'assistant' && msg.characterId === characterId)
      );

      // 如果有该角色的对话，加载最新的
      if (characterConversations.length > 0) {
        // 按最后更新时间排序，选择最新的对话
        const sortedConversations = [...characterConversations]
          .sort((a, b) => b.lastUpdated - a.lastUpdated);
        
        setCurrentConversation(sortedConversations[0].id).catch(error => {
          console.error('加载角色最近对话失败:', error);
        });
      } else {
        // 没有该角色的对话，创建新的
        console.log('URL参数包含角色ID，启动角色聊天:', characterId);
        startCharacterChat(characterId).catch(error => {
          console.error('启动角色聊天失败:', error);
        });
      }
    }
  }, [searchParams, startCharacterChat, setCurrentConversation, conversations]);

  // 确保在页面加载时加载对话历史
  useEffect(() => {
    // 加载对话列表
    console.log('页面初始化，开始加载对话历史...');
    loadConversations().then(() => {
      console.log('页面加载时对话列表已加载，当前对话ID:', currentConversationId);
      
      // 如果有URL参数中的角色ID，优先处理
      const characterId = searchParams.get('characterId');
      const conversationId = searchParams.get('conversationId');
      
      if (characterId && conversationId) {
        console.log('URL中包含角色ID和对话ID，直接加载特定对话');
        setCurrentConversation(conversationId).catch(error => {
          console.error('加载指定对话失败:', error);
        });
      } else if (characterId) {
        console.log('URL中包含角色ID:', characterId);
        characterIdRef.current = characterId;
        
        // 检查当前是否已经是该角色的对话
        const isCurrentCharacterChat = currentCharacter && currentCharacter.id === characterId;
        
        // 如果不是当前角色的对话，启动新的角色聊天
        if (!isCurrentCharacterChat) {
          console.log('启动新的角色聊天');
          startCharacterChat(characterId).catch(error => {
            console.error('启动角色聊天失败:', error);
          });
        } else {
          console.log('当前已经是该角色的对话');
        }
      } else if (currentConversationId) {
        // 如果没有URL参数但有当前对话ID，确保对话内容已加载
        console.log('确保当前对话内容已加载，消息数量:', currentMessages.length);
      } else if (conversations.length > 0) {
        // 如果没有当前对话但有对话历史，加载最新的对话
        console.log('加载最新对话');
        const latestConversation = conversations[0];
        if (latestConversation) {
          console.log('找到最新对话:', latestConversation.id);
          setCurrentConversation(latestConversation.id).catch(error => {
            console.error('加载最新对话失败:', error);
          });
        }
      }
    }).catch(error => {
      console.error('加载对话列表失败:', error);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // 仅在组件挂载时执行一次，使用ESLint禁用规则避免警告

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

  // 重新生成AI回复
  const handleRegenerateMessage = async (messageId: string) => {
    // 找到需要重新生成的消息
    const messageToRegenerate = currentMessages.find(msg => msg.id === messageId);
    if (!messageToRegenerate || messageToRegenerate.role !== 'assistant') return;

    // 找到该消息之前的用户消息作为提示
    const messageIndex = currentMessages.findIndex(msg => msg.id === messageId);
    if (messageIndex <= 0) return; // 没有前置消息，无法重新生成

    // 获取最近的用户消息
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && currentMessages[userMessageIndex].role !== 'user') {
      userMessageIndex--;
    }

    if (userMessageIndex < 0) return; // 没有找到前置用户消息

    // 保存原始消息的楼层号，确保重新生成时保持相同的编号
    const originalMessageNumber = messageToRegenerate.messageNumber;

    // 将当前消息内容设置为"正在重新生成..."
    updateMessage({
      ...messageToRegenerate,
      content: "正在重新生成...",
      messageNumber: originalMessageNumber // 确保保留原始楼层号
    });

    setIsLoading(true);

    // 记录响应开始时间
    responseStartTimeRef.current = Date.now();

    try {
      // 构建请求消息历史（不包含当前消息和之后的消息）
      const requestMessages = currentMessages.slice(0, messageIndex);

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
                  ...messageToRegenerate,
                  content: updatedContent,
                  timestamp: new Date(),
                  messageNumber: originalMessageNumber // 保留原始楼层号
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
                  ...messageToRegenerate,
                  content: accumulatedContent,
                  timestamp: new Date(),
                  messageNumber: originalMessageNumber // 保留原始楼层号
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
                  ...messageToRegenerate,
                  content: accumulatedContent,
                  timestamp: new Date(),
                  messageNumber: originalMessageNumber // 保留原始楼层号
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
            ...messageToRegenerate,
            content: "AI未能生成回复。可能是由于安全过滤或其他原因。",
            timestamp: new Date(),
            responseTime: responseTime,
            messageNumber: originalMessageNumber // 保留原始楼层号
          });
        } else {
          // 更新最终消息，包含响应时间
          updateMessage({
            ...messageToRegenerate,
            content: accumulatedContent,
            timestamp: new Date(),
            responseTime: responseTime,
            messageNumber: originalMessageNumber // 保留原始楼层号
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

        // 更新消息
        updateMessage({
          ...messageToRegenerate,
          content: data.text,
          timestamp: new Date(),
          responseTime: responseTime,
          messageNumber: originalMessageNumber // 保留原始楼层号
        });
      }
    } catch (error: any) {
      console.error("API调用失败:", error);
      // 更新为错误消息
      updateMessage({
        ...messageToRegenerate,
        content: `重新生成失败: ${error.message || "未知错误"}。请检查网络连接和API密钥设置。`,
        timestamp: new Date(),
        messageNumber: originalMessageNumber // 保留原始楼层号
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      <ChatHeader character={currentCharacter} />
      <div className="flex-1 overflow-y-auto p-4">
        {currentMessages.map((message, index) => (
          <Message
            key={`${message.id}-${index}`}
            message={message}
            onRegenerate={handleRegenerateMessage}
            character={message.role === 'assistant' ? currentCharacter : undefined}
          />
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