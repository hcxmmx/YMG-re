"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Message as MessageType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MessageProps {
  message: MessageType;
}

export function Message({ message }: MessageProps) {
  const [showRaw, setShowRaw] = useState(false);

  // 根据角色确定消息的样式
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  // 如果是系统消息，则使用特殊样式
  if (isSystem) {
    return (
      <div className="py-2 px-4 rounded-lg bg-muted text-muted-foreground text-sm mb-4">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    );
  }

  // 渲染用户或助手的消息
  return (
    <div
      className={cn(
        "flex gap-3 mb-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "px-4 py-3 rounded-lg",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
        style={{ maxWidth: "80%" }}
      >
        {/* 渲染图片 */}
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2 my-2">
            {message.images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`图片 ${index + 1}`}
                className="rounded-md max-h-[200px] max-w-full object-contain"
              />
            ))}
          </div>
        )}

        {/* 渲染文本内容 */}
        <div className="prose dark:prose-invert max-w-none">
          {showRaw ? (
            <pre className="whitespace-pre-wrap text-sm">{message.content}</pre>
          ) : (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          )}
        </div>

        {/* 消息元数据和操作 */}
        <div className="flex justify-between items-center mt-2 text-xs opacity-70">
          <span>
            {new Date(message.timestamp).toLocaleTimeString("zh-CN")}
          </span>
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="underline underline-offset-2"
          >
            {showRaw ? "查看渲染" : "查看原文"}
          </button>
        </div>
      </div>
    </div>
  );
} 