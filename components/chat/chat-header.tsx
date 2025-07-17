"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useChatStore } from "@/lib/store";

export function ChatHeader() {
  const { currentTitle, currentConversationId, updateConversationTitle } = useChatStore();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  // 当currentTitle从store中更新时，同步本地状态
  useEffect(() => {
    setTitle(currentTitle);
  }, [currentTitle]);

  // 处理标题编辑
  const handleTitleEdit = () => {
    if (!currentConversationId) return;
    setIsEditing(true);
    // 等待DOM更新后聚焦输入框
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  // 保存编辑后的标题
  const saveTitle = () => {
    if (currentConversationId && title.trim()) {
      updateConversationTitle(title.trim());
    }
    setIsEditing(false);
  };

  // 按回车保存，按Esc取消
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveTitle();
    } else if (e.key === 'Escape') {
      setTitle(currentTitle);
      setIsEditing(false);
    }
  };

  return (
    <div className="w-full h-12 border-b flex items-center px-4">
      <div className="flex-1 truncate">
        {isEditing ? (
          <Input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={handleKeyDown}
            className="h-8"
            placeholder="对话名称"
          />
        ) : (
          <div 
            className="font-medium truncate cursor-pointer py-1"
            onClick={handleTitleEdit}
            title={currentTitle}
          >
            {currentTitle}
          </div>
        )}
      </div>
      <div className="flex items-center ml-2">
        {/* 右侧预留区域，用于后续添加功能键 */}
      </div>
    </div>
  );
} 