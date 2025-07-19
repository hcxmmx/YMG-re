"use client";

import { useState, useRef, ChangeEvent, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Image } from "lucide-react";
import { ChatSettings } from "./chat-settings";

export interface ChatInputProps {
  onSendMessage: (content: string, images?: string[]) => void;
  onRequestReply?: () => void; // 新增：直接请求对最后一条用户消息的回复（不重发消息）
  isLoading?: boolean;
  disabled?: boolean;
  lastUserMessage?: string | null; // 最后一条用户消息内容
  canRequestReply?: boolean; // 是否可以直接请求回复（最后一条消息是用户消息时为true）
}

export function ChatInput({ 
  onSendMessage, 
  onRequestReply, 
  isLoading, 
  disabled, 
  lastUserMessage, 
  canRequestReply 
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 判断是否可以发送消息
  // 注意：这里处理两种情况 - 1) 有新消息内容 2) 空输入框但可以请求回复
  const canSendMessage = () => {
    // 如果有输入，正常发送新消息
    if (message.trim()) return true;
    
    // 如果没有输入，但可以请求回复（最后一条是用户消息），也允许点击发送按钮
    if (!message.trim() && canRequestReply) return true;
    
    return false;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !isLoading && !disabled) {
      // 正常发送新消息
      onSendMessage(message, images.length > 0 ? images : undefined);
      setMessage("");
      setImages([]);
    } else if (!message.trim() && canRequestReply && onRequestReply && !isLoading && !disabled) {
      // 直接请求对最后一条用户消息的回复（不会重发用户消息）
      // 这个功能允许用户在输入框为空时，点击发送按钮直接获取对最后一条用户消息的回复
      onRequestReply();
    }
    
    // 提交后聚焦输入框
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 按Enter发送消息（不按Shift）
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) form.requestSubmit();
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImages(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    // 清空文件输入，以便可以再次选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="w-full p-3">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 max-h-32 overflow-y-auto">
          {images.map((img, index) => (
            <div key={index} className="relative">
              <img 
                src={img} 
                alt={`上传的图片 ${index + 1}`} 
                className="w-16 h-16 object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-xs"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex gap-2 items-center">
        <ChatSettings />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || disabled}
          className="shrink-0"
        >
          <Image className="h-5 w-5" />
          <span className="sr-only">添加图片</span>
        </Button>
        
        <Input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? "AI正在回复..." : canRequestReply ? "按发送键直接请求回复..." : "输入消息..."}
          className="flex-1"
          disabled={isLoading || disabled}
          autoFocus
        />
        
        {/* 发送按钮：根据canSendMessage()决定是否启用，处理发送新消息或请求回复 */}
        <Button 
          type="submit" 
          size="icon"
          disabled={!canSendMessage() || isLoading || disabled}
          className="shrink-0"
        >
          <Send className="h-5 w-5" />
          <span className="sr-only">发送</span>
        </Button>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        multiple
        className="hidden"
        disabled={isLoading || disabled}
      />
    </form>
  );
} 