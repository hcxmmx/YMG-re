"use client";

import { useState, useRef, FormEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Image as ImageIcon, Paperclip, X } from "lucide-react";
import { extractImageContent } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string, images?: string[]) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSendMessage, isLoading = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理消息提交
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if ((!message.trim() && images.length === 0) || isLoading) return;

    onSendMessage(message, images.length > 0 ? images : undefined);
    setMessage("");
    setImages([]);
  };

  // 处理图片上传
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // 检查文件大小，限制在5MB以内
        if (file.size > 5 * 1024 * 1024) {
          alert("图片大小不能超过5MB");
          continue;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
          const dataUrl = e.target?.result as string;
          setImages(prev => [...prev, dataUrl]);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("图片处理失败:", error);
      }
    }
    
    // 清空文件输入，以便可以再次选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 移除已上传的图片
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      {/* 显示已上传的图片 */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {images.map((img, index) => (
            <div key={index} className="relative">
              <img
                src={img}
                alt={`上传的图片 ${index + 1}`}
                className="h-16 w-16 object-cover rounded-md"
              />
              <button
                type="button"
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                onClick={() => removeImage(index)}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="输入消息..."
          disabled={isLoading}
          className="flex-1"
        />
        
        {/* 图片上传按钮 */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          <ImageIcon size={20} />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />
        
        {/* 发送按钮 */}
        <Button type="submit" disabled={(!message.trim() && images.length === 0) || isLoading}>
          <Send size={20} />
        </Button>
      </div>
    </form>
  );
} 