"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/lib/store";
import { useNavbar } from "@/app/layout";
import { ChevronUp, ChevronDown } from "lucide-react";

export function ChatHeader() {
  const { currentTitle, currentConversationId, updateConversationTitle } = useChatStore();
  const { isNavbarVisible, toggleNavbar } = useNavbar();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const inputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // 当currentTitle从store中更新时，同步本地状态
  useEffect(() => {
    setTitle(currentTitle);
  }, [currentTitle]);

  // 处理导航栏切换并滚动到适当位置
  const handleToggleNavbar = () => {
    toggleNavbar();
    
    // 如果导航栏将变为不可见，滚动页面到头部导航栏的位置
    if (isNavbarVisible) {
      // 延迟执行以等待导航栏隐藏动画
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }, 10);
    } else {
      // 如果导航栏将变为可见，等待导航栏显示后聚焦在头部
      setTimeout(() => {
        headerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 10);
    }
  };

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
    <div ref={headerRef} className="w-full h-12 border-b flex items-center px-4">
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
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleNavbar}
          className="h-8 w-8"
          title={isNavbarVisible ? "隐藏导航栏" : "显示导航栏"}
        >
          {isNavbarVisible ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          <span className="sr-only">
            {isNavbarVisible ? "隐藏导航栏" : "显示导航栏"}
          </span>
        </Button>
      </div>
    </div>
  );
} 