"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Message as MessageType, Character } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Copy, Check, Clock, Hash, BarChart2, Trash2, Edit, RefreshCw, User } from "lucide-react";
import { useSettingsStore, useChatStore } from "@/lib/store";
import Image from "next/image";

interface MessageProps {
  message: MessageType;
  character?: Character | null;
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
}

export function Message({ message, character, onEdit, onRegenerate }: MessageProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const { uiSettings } = useSettingsStore();
  const { updateMessage, deleteMessage } = useChatStore();
  
  // 获取UI设置
  const { showResponseTime, showCharCount, showMessageNumber } = uiSettings;

  // 根据角色确定消息的样式
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isAssistant = message.role === "assistant";

  // 复制消息内容
  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  // 删除消息
  const handleDelete = () => {
    // 直接删除，无需确认
    deleteMessage(message.id);
  };
  
  // 编辑消息
  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content);
  };
  
  // 提交编辑
  const handleSubmitEdit = () => {
    if (editContent.trim()) {
      updateMessage({
        ...message,
        content: editContent
      });
      setIsEditing(false);
    }
  };
  
  // 重新生成回复
  const handleRegenerate = () => {
    if (onRegenerate && isAssistant) {
      onRegenerate(message.id);
    }
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
    <div className="mb-6 group">
      <div
        className={cn(
          "flex gap-3",
          isUser ? "justify-end" : "justify-start"
        )}
      >
        {/* 头像 - 非用户消息时显示在左侧 */}
        {!isUser && (
          <div className="mt-1">
            <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
              {character && character.avatar ? (
                <Image
                  src={character.avatar}
                  alt={character.name || "AI"}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                  {character?.name ? character.name.charAt(0).toUpperCase() : "AI"}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 楼层号 - 非用户消息时显示在左侧（如果没有头像） */}
        {!isUser && !character && message.messageNumber && showMessageNumber && (
          <div className="flex items-start mt-1">
            <span className="text-xs text-muted-foreground opacity-50 flex items-center">
              <Hash size={10} className="mr-0.5" />
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
            {isEditing ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className={cn(
                    "w-full min-h-[100px] p-2 border rounded-md",
                    isUser
                      ? "bg-background text-foreground" // 用户消息编辑时使用亮色背景和深色文本
                      : "bg-background text-foreground"
                  )}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setIsEditing(false)}
                    className={cn(
                      "px-2 py-1 rounded-md text-xs",
                      isUser 
                        ? "bg-background text-foreground hover:bg-background/90" // 用户消息中使用亮色按钮
                        : "bg-muted hover:bg-muted/80 text-foreground" // AI消息中使用默认按钮
                    )}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSubmitEdit}
                    className="px-2 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-xs"
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : showRaw ? (
              <pre className="whitespace-pre-wrap text-sm">{message.content}</pre>
            ) : (
              <ReactMarkdown className="break-words">{message.content}</ReactMarkdown>
            )}
          </div>

          {/* 消息元数据和查看原文按钮 */}
          <div className="flex justify-between items-center mt-2 text-xs opacity-60">
            <div className="flex items-center gap-2">
              {/* 时间戳 */}
              <span className="flex items-center">
                <Clock size={10} className="mr-0.5" />
                {new Date(message.timestamp).toLocaleTimeString("zh-CN")}
              </span>
              
              {/* 字符统计 */}
              {message.charCount !== undefined && showCharCount && (
                <span className="flex items-center" title="字符数">
                  <BarChart2 size={10} className="mr-0.5" />
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
                  <Hash size={10} className="mr-0.5" />
                  {message.messageNumber}
                </span>
              )}
            </div>

            {/* 查看渲染/原文按钮（保留在消息气泡内） */}
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-1 p-0.5 rounded hover:bg-muted/50 text-xs opacity-75 hover:opacity-100"
              title={showRaw ? "查看渲染" : "查看原文"}
            >
              {showRaw ? "查看渲染" : "查看原文"}
            </button>
          </div>
        </div>

        {/* 用户头像 - 用户消息时显示在右侧 */}
        {isUser && (
          <div className="mt-1">
            <div className="h-8 w-8 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
              <User className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* 消息操作按钮 - 移至消息气泡外部，淡化显示 */}
      <div className={cn(
        "flex gap-1.5 mt-0.5 text-xs text-muted-foreground opacity-60 hover:opacity-90 transition-opacity",
        isUser ? "justify-end" : "justify-start"
      )}>
        {/* 复制内容 */}
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-0.5 p-0.5 rounded hover:bg-muted/30"
          title="复制内容"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span className="text-xs">{copied ? "已复制" : "复制"}</span>
        </button>
        
        {/* 编辑 */}
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-0.5 p-0.5 rounded hover:bg-muted/30"
            title="编辑"
          >
            <Edit size={12} />
            <span className="text-xs">编辑</span>
          </button>
        )}
        
        {/* 删除 */}
        <button
          onClick={handleDelete}
          className="flex items-center gap-0.5 p-0.5 rounded hover:bg-muted/30 text-muted-foreground hover:text-destructive"
          title="删除"
        >
          <Trash2 size={12} />
          <span className="text-xs">删除</span>
        </button>
        
        {/* 重新生成（仅针对AI消息） */}
        {isAssistant && (
          <button
            onClick={handleRegenerate}
            className="flex items-center gap-0.5 p-0.5 rounded hover:bg-muted/30"
            title="重新生成"
          >
            <RefreshCw size={12} />
            <span className="text-xs">重新生成</span>
          </button>
        )}
      </div>
    </div>
  );
} 