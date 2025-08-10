"use client";

import { useState, useRef, ChangeEvent, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Image, File, FileText } from "lucide-react";
import { ChatSettings } from "./chat-settings";
import { useSettingsStore } from "@/lib/store";

export interface FileData {
  data: string;  // DataURL或文本内容
  type: string;  // MIME类型
  name?: string; // 文件名
}

export interface ChatInputProps {
  onSendMessage: (content: string, files?: FileData[]) => void;
  onRequestReply?: () => void; // 新增：直接请求对最后一条用户消息的回复（不重发消息）
  onCancelRequest?: () => void; // 新增：取消当前正在处理的请求
  isLoading?: boolean;
  disabled?: boolean;
  lastUserMessage?: string | null; // 最后一条用户消息内容
  canRequestReply?: boolean; // 是否可以直接请求回复（最后一条消息是用户消息时为true）
  onShowDebugGuide?: () => void; // 调试引导面板回调
}

export function ChatInput({ 
  onSendMessage, 
  onRequestReply, 
  onCancelRequest,
  isLoading, 
  disabled, 
  lastUserMessage, 
  canRequestReply,
  onShowDebugGuide
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<FileData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const { uiSettings } = useSettingsStore();

  // 自动调整textarea高度
  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  };

  // 检测设备和运行环境
  useEffect(() => {
    // 检测是否是iOS设备
    const checkIsIOS = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      return /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    };
    
    // 检测是否是PWA模式
    const checkIsPWA = () => {
      return (window.navigator as any).standalone === true || 
             window.matchMedia('(display-mode: standalone)').matches;
    };
    
    setIsIOS(checkIsIOS());
    setIsPWA(checkIsPWA());
  }, []);

  // 调整textarea高度当message内容变化时
  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  // 判断是否可以发送消息
  // 注意：这里处理两种情况 - 1) 有新消息内容 2) 空输入框但可以请求回复
  const canSendMessage = () => {
    // 如果有文件或输入，正常发送新消息
    if (message.trim() || files.length > 0) return true;
    
    // 如果没有输入，但可以请求回复（最后一条是用户消息），也允许点击发送按钮
    if (!message.trim() && canRequestReply) return true;
    
    return false;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    // 如果正在加载，且有取消回调，则取消请求
    if (isLoading && onCancelRequest) {
      onCancelRequest();
      return;
    }
    
    if (message.trim() || files.length > 0) {
      // 正常发送新消息，即使AI正在回复中也允许发送
      onSendMessage(message, files.length > 0 ? files : undefined);
      setMessage("");
      setFiles([]);
    } else if (!message.trim() && canRequestReply && onRequestReply && !disabled) {
      // 直接请求对最后一条用户消息的回复（不会重发用户消息）
      // 这个功能允许用户在输入框为空时，点击发送按钮直接获取对最后一条用户消息的回复
      onRequestReply();
    }
    
    // 提交后聚焦输入框并重置高度
    setTimeout(() => {
      inputRef.current?.focus();
      adjustTextareaHeight();
    }, 0);
  };

  // 获取快捷键提示文本
  const getHotkeyHint = () => {
    const { sendHotkey } = uiSettings;
    switch (sendHotkey) {
      case 'enter':
        return 'Enter 发送 | Shift+Enter 换行';
      case 'shiftEnter':
        return 'Shift+Enter 发送 | Enter 换行';
      case 'ctrlEnter':
      default:
        return 'Ctrl+Enter 发送 | Enter 换行';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const { sendHotkey } = uiSettings;
    
    if (e.key === 'Enter') {
      if (sendHotkey === 'enter' && !e.shiftKey) {
        // Enter键直接发送（除非按住Shift）
        e.preventDefault();
        const form = e.currentTarget.form;
        if (form) form.requestSubmit();
      } else if (sendHotkey === 'ctrlEnter' && (e.ctrlKey || e.metaKey)) {
        // Ctrl+Enter发送
        e.preventDefault();
        const form = e.currentTarget.form;
        if (form) form.requestSubmit();
      } else if (sendHotkey === 'shiftEnter' && e.shiftKey) {
        // Shift+Enter发送
        e.preventDefault();
        const form = e.currentTarget.form;
        if (form) form.requestSubmit();
      }
      // 其他情况允许换行（默认行为）
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    Array.from(selectedFiles).forEach(file => {
      // 根据文件类型处理
      if (file.type.startsWith('image/')) {
        // 图片文件：使用DataURL
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            const fileData: FileData = {
              data: e.target.result as string,
              type: file.type,
              name: file.name
            };
            setFiles(prev => [...prev, fileData]);
          }
        };
        reader.readAsDataURL(file);
      } else if (
        file.type === 'text/plain' || 
        file.type === 'application/json' || 
        file.type === 'text/markdown'
      ) {
        // 文本文件：读取文本内容
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            const fileData: FileData = {
              data: e.target.result as string,
              type: file.type,
              name: file.name
            };
            setFiles(prev => [...prev, fileData]);
          }
        };
        reader.readAsText(file);
      } else {
        // 其他类型：尝试作为DataURL处理
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            const fileData: FileData = {
              data: e.target.result as string,
              type: file.type,
              name: file.name
            };
            setFiles(prev => [...prev, fileData]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
    
    // 清空文件输入，以便可以再次选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 根据文件类型获取适当的图标
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (fileType === 'text/plain' || fileType === 'application/json' || fileType === 'text/markdown') {
      return <FileText className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  // 获取文件预览
  const getFilePreview = (file: FileData) => {
    if (file.type.startsWith('image/')) {
      return (
        <img 
          src={file.data} 
          alt={file.name || "上传的图片"} 
          className="w-16 h-16 object-cover rounded-md"
        />
      );
    } else {
      return (
        <div className="w-16 h-16 bg-muted flex items-center justify-center rounded-md">
          {getFileIcon(file.type)}
          <span className="text-xs ml-1 max-w-[40px] overflow-hidden text-ellipsis">
            {file.name || "文件"}
          </span>
        </div>
      );
    }
  };

  // 处理输入框获得焦点，特别针对iOS PWA环境
  const handleInputFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (isIOS && isPWA) {
      // 仅针对iOS PWA环境应用特殊处理
      setTimeout(() => {
        // 滚动到视图中央
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 轻微滚动以激活键盘
        window.scrollTo(0, window.scrollY + 1);
      }, 100);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full p-3 chat-input-container">
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 max-h-32 overflow-y-auto">
          {files.map((file, index) => (
            <div key={index} className="relative">
              {getFilePreview(file)}
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-xs"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex gap-2 items-center">
        <ChatSettings onShowDebugGuide={onShowDebugGuide} />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="shrink-0"
        >
          <File className="h-5 w-5" />
          <span className="sr-only">添加文件</span>
        </Button>
        
        <Textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={canRequestReply ? `输入新消息或按发送键请求回复...\n${getHotkeyHint()}` : `输入消息...\n${getHotkeyHint()}`}
          className="flex-1 min-h-[40px] resize-none overflow-hidden"
          disabled={disabled}
          autoFocus
          rows={1}
        />
        
        {/* 发送/取消按钮：根据是否正在加载显示不同状态 */}
        <Button 
          type="submit" 
          size="icon"
          disabled={(!isLoading && (!canSendMessage() || disabled))}
          className="shrink-0"
          variant={isLoading ? "destructive" : "default"}
        >
          {isLoading ? (
            <span className="font-bold text-xs">取消</span>
          ) : (
            <Send className="h-5 w-5" />
          )}
          <span className="sr-only">{isLoading ? "取消" : "发送"}</span>
        </Button>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*,text/plain,application/json,text/markdown"
        multiple
        className="hidden"
        disabled={disabled}
      />
    </form>
  );
} 