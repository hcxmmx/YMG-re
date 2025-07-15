"use client";

import { useState, useRef, FormEvent, ChangeEvent, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Image as ImageIcon, Loader2, X } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string, images?: string[]) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSendMessage, isLoading = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 处理消息提交
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if ((!message.trim() && images.length === 0) || isLoading || isProcessingImage) return;

    onSendMessage(message, images.length > 0 ? images : undefined);
    setMessage("");
    setImages([]);
    
    // 聚焦输入框，准备下一次输入
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  // 处理键盘事件
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // 如果按下Enter键且没有按下Shift键，提交表单
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  };

  // 处理图片上传
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsProcessingImage(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 检查文件大小，限制在5MB以内
        if (file.size > 5 * 1024 * 1024) {
          alert("图片大小不能超过5MB");
          continue;
        }

        // 检查文件类型
        if (!file.type.startsWith('image/')) {
          alert("请上传图片文件");
          continue;
        }

        // 读取图片为DataURL
        const dataUrl = await readFileAsDataURL(file);
        setImages(prev => [...prev, dataUrl]);
      }
    } catch (error) {
      console.error("图片处理失败:", error);
      alert("图片处理失败，请重试");
    } finally {
      setIsProcessingImage(false);
      
      // 清空文件输入，以便可以再次选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 将文件读取为DataURL
  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error("读取文件失败"));
        }
      };
      reader.onerror = () => reject(new Error("读取文件失败"));
      reader.readAsDataURL(file);
    });
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
                className="h-20 w-20 object-cover rounded-md"
              />
              <button
                type="button"
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                onClick={() => removeImage(index)}
                disabled={isLoading}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? "AI正在回复..." : "输入消息..."}
          disabled={isLoading}
          className="flex-1"
          autoFocus
        />
        
        {/* 图片上传按钮 */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || isProcessingImage}
          className="relative"
        >
          {isProcessingImage ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <ImageIcon size={20} />
          )}
          {images.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {images.length}
            </span>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
          disabled={isLoading}
        />
        
        {/* 发送按钮 */}
        <Button 
          type="submit" 
          disabled={(!message.trim() && images.length === 0) || isLoading || isProcessingImage}
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </Button>
      </div>
    </form>
  );
} 