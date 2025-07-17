"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Message as MessageType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Copy, Check, Clock, Hash, BarChart2 } from "lucide-react";
import { useSettingsStore } from "@/lib/store";

interface MessageProps {
  message: MessageType;
}

export function Message({ message }: MessageProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const { uiSettings } = useSettingsStore();
  
  // 获取UI设置
  const { showResponseTime, showCharCount, showMessageNumber } = uiSettings;

  // 根据角色确定消息的样式
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  // 复制消息内容
  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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
        "flex gap-3 mb-4 group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* 楼层号 - 非用户消息时显示在左侧 */}
      {!isUser && message.messageNumber && showMessageNumber && (
        <div className="flex items-start mt-1">
          <span className="text-xs text-muted-foreground flex items-center">
            <Hash size={12} className="mr-1" />
            {message.messageNumber}
          </span>
        </div>
      )}

      <div
        className={cn(
          "px-4 py-3 rounded-lg",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
        style={{ maxWidth: "85%" }}
      >
        {/* 渲染图片 */}
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2 my-2">
            {message.images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image}
                  alt={`图片 ${index + 1}`}
                  className="rounded-md max-h-[300px] max-w-full object-contain"
                  onClick={() => {
                    // 点击图片时在新窗口打开
                    window.open(image, '_blank');
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity cursor-pointer" />
              </div>
            ))}
          </div>
        )}

        {/* 渲染文本内容 */}
        <div className={cn(
          "prose dark:prose-invert max-w-none",
          isUser ? "prose-primary" : ""
        )}>
          {showRaw ? (
            <pre className="whitespace-pre-wrap text-sm">{message.content}</pre>
          ) : (
            <ReactMarkdown className="break-words">{message.content}</ReactMarkdown>
          )}
        </div>

        {/* 消息元数据和操作 */}
        <div className="flex justify-between items-center mt-2 text-xs opacity-70">
          <div className="flex items-center gap-2">
            {/* 时间戳 */}
            <span className="flex items-center">
              <Clock size={12} className="mr-1" />
              {new Date(message.timestamp).toLocaleTimeString("zh-CN")}
            </span>
            
            {/* 字符统计 */}
            {message.charCount !== undefined && showCharCount && (
              <span className="flex items-center" title="字符数">
                <BarChart2 size={12} className="mr-1" />
                {message.charCount}
              </span>
            )}
            
            {/* 响应时间 */}
            {message.responseTime !== undefined && !isUser && showResponseTime && (
              <span className="flex items-center" title="响应时间">
                {(message.responseTime / 1000).toFixed(1)}s
              </span>
            )}
            
            {/* 楼层号 - 用户消息时显示在这里 */}
            {isUser && message.messageNumber && showMessageNumber && (
              <span className="flex items-center">
                <Hash size={12} className="mr-1" />
                {message.messageNumber}
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="underline underline-offset-2"
            >
              {showRaw ? "查看渲染" : "查看原文"}
            </button>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1"
              title="复制内容"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "已复制" : "复制"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 