"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Message } from "@/components/chat/message";
import { ChatInput } from "@/components/chat/chat-input";
import { Button } from "@/components/ui/button";
import { useSettingsStore, useProfilesStore, useChatsStore } from "@/lib/store";
import { Message as MessageType, Profile } from "@/lib/types";
import { generateId } from "@/lib/utils";

export default function ChatPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const { settings } = useSettingsStore();
  const { profiles, currentProfileId } = useProfilesStore();
  const { 
    dialogs, 
    currentDialogId, 
    addDialog, 
    addMessage, 
    setCurrentDialog 
  } = useChatsStore();

  // 获取当前角色和对话
  const currentProfile = profiles.find(p => p.id === currentProfileId);
  const currentDialog = dialogs.find(d => d.id === currentDialogId);
  const messages = currentDialog?.messages || [];

  // 如果没有选择角色，重定向到角色选择页面
  useEffect(() => {
    if (!currentProfileId) {
      router.push("/profiles");
    } else if (!currentDialogId) {
      // 如果有角色但没有对话，创建新对话
      const newDialogId = addDialog({
        profileId: currentProfileId,
        title: `与${currentProfile?.name || "AI"}的对话`,
        messages: [],
      });
      setCurrentDialog(newDialogId);
    }
  }, [currentProfileId, currentDialogId]);

  // 发送消息
  const handleSendMessage = async (content: string, images?: string[]) => {
    if (!currentDialogId || !currentProfile) return;

    // 添加用户消息
    const userMessage: Omit<MessageType, "id" | "timestamp"> = {
      role: "user",
      content,
      images,
    };
    addMessage(currentDialogId, userMessage);

    setIsLoading(true);

    try {
      // 构建请求消息历史
      const requestMessages = [...messages, userMessage as MessageType];

      // API调用参数
      const params = {
        messages: requestMessages,
        systemPrompt: currentProfile.systemPrompt,
        apiKey: settings.apiKey,
        stream: settings.enableStreaming,
        temperature: settings.temperature,
        maxOutputTokens: settings.maxTokens,
      };

      // 调用API获取回复
      if (settings.enableStreaming) {
        // 添加空助手消息作为流式内容的容器
        const assistantMessageId = generateId();
        const initialAssistantMessage: MessageType = {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        };
        
        // 添加初始空消息
        addMessage(currentDialogId, {
          role: "assistant",
          content: "",
        });

        // 流式响应处理
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        const reader = response.body?.getReader();
        if (!reader) throw new Error("流式响应读取失败");

        // 累积的响应内容
        let accumulatedContent = "";

        // 处理流式数据
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // 解码为文本
          const text = new TextDecoder().decode(value);
          const lines = text.split("\n\n");

          for (const line of lines) {
            if (!line.trim() || !line.startsWith("data: ")) continue;
            
            const data = line.replace("data: ", "");
            if (data === "[DONE]") break;
            
            try {
              const { text } = JSON.parse(data);
              if (text) {
                accumulatedContent += text;
                // 更新助手消息内容
                addMessage(currentDialogId, {
                  role: "assistant",
                  content: accumulatedContent,
                });
              }
            } catch (e) {
              console.error("解析流式数据失败", e);
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

        const data = await response.json();

        // 添加助手回复
        addMessage(currentDialogId, {
          role: "assistant",
          content: data.text,
        });
      }
    } catch (error) {
      console.error("API调用失败:", error);
      // 添加错误消息
      addMessage(currentDialogId, {
        role: "system",
        content: "消息发送失败，请检查网络连接和API密钥设置。",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 如果没有选择角色或正在加载数据，显示加载状态
  if (!currentProfile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">加载中...</h2>
          <p className="mb-4">请选择一个角色开始对话</p>
          <Button onClick={() => router.push("/profiles")}>
            选择角色
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* 聊天头部 */}
      <header className="border-b p-4 flex justify-between items-center">
        <div>
          <h1 className="font-bold text-lg">{currentProfile.name}</h1>
          <p className="text-sm text-muted-foreground truncate max-w-[80vw]">
            {currentProfile.description}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/profiles")}>
          切换角色
        </Button>
      </header>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <h2 className="text-2xl font-bold mb-2">{`与${currentProfile.name}的对话`}</h2>
            <p className="mb-8 text-muted-foreground">
              {currentProfile.description}
            </p>
            <p className="text-sm">发送第一条消息开始对话</p>
          </div>
        ) : (
          messages.map((msg) => <Message key={msg.id} message={msg} />)
        )}
        {isLoading && <div className="text-center py-2">AI正在回复...</div>}
      </div>

      {/* 输入区域 */}
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
} 