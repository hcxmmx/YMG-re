"use client";

import { useState, useRef, ChangeEvent, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Image } from "lucide-react";
import { ChatSettings } from "./chat-settings";

export interface ChatInputProps {
  onSendMessage: (content: string, images?: string[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, isLoading, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading && !disabled) {
      onSendMessage(message, images.length > 0 ? images : undefined);
      setMessage("");
      setImages([]);
      // 提交后聚焦输入框
      setTimeout(() => inputRef.current?.focus(), 0);
    }
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
          placeholder={isLoading ? "AI正在回复..." : "输入消息..."}
          className="flex-1"
          disabled={isLoading || disabled}
          autoFocus
        />
        
        <Button 
          type="submit" 
          size="icon"
          disabled={!message.trim() || isLoading || disabled}
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