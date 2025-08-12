"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { Message as MessageType, Character } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Copy, Check, Clock, Hash, BarChart2, Trash2, Edit, RefreshCw, User, ChevronLeft, ChevronRight, GitBranch, AlertCircle, FileText } from "lucide-react";
import { useSettingsStore, useChatStore, usePlayerStore, useRegexStore, usePromptPresetStore } from "@/lib/store";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { replaceMacros } from "@/lib/macroUtils";
import { parseTextWithQuotes, isQuoteHighlightEnabled, getQuoteHighlightColor, TextSegment, highlightQuotes } from "@/lib/quoteUtils";

// 简化的引号高亮组件，暂时禁用复杂逻辑以避免性能问题
const EnhancedQuoteHighlight = React.memo(({ 
  children, 
  enableHighlight = true 
}: { 
  children: React.ReactNode; 
  enableHighlight?: boolean;
}) => {
  // 在性能优化版本中暂时禁用引号高亮，避免复杂计算
  return <>{children}</>;
});

EnhancedQuoteHighlight.displayName = 'EnhancedQuoteHighlight';

interface OptimizedMessageProps {
  message: MessageType;
  character?: Character;
  onEdit?: (messageId: string, newContent: string) => void;
  onRegenerate?: (messageId: string, action: string, content?: string) => Promise<void>;
  isGeneratingVariant?: boolean;
  isRegenerating?: boolean;
}

// 优化的消息组件，使用memo和细粒度的状态管理
export const OptimizedMessage = React.memo(function OptimizedMessage({ 
  message, 
  character, 
  onEdit, 
  onRegenerate, 
  isGeneratingVariant, 
  isRegenerating 
}: OptimizedMessageProps) {
  // 本地状态，避免不必要的全局状态订阅
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [processedContent, setProcessedContent] = useState("");
  
  // 分支创建对话框状态
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const [branchName, setBranchName] = useState("");

  // 使用选择器只订阅需要的状态，避免不必要的重渲染
  const uiSettings = useSettingsStore(state => state.uiSettings);
  const { updateMessage, deleteMessage, currentMessages, createBranch, branches } = useChatStore();
  const currentPlayer = usePlayerStore(state => state.getCurrentPlayer());
  
  // 只在需要时订阅正则和预设状态
  const regexState = useRegexStore(state => ({
    scripts: state.scripts,
    regexUpdateTimestamp: state.regexUpdateTimestamp
  }));
  const currentPresetId = usePromptPresetStore(state => state.currentPresetId);

  // 判断是否有任何生成过程正在进行
  const isProcessing = isGeneratingVariant || isRegenerating;

  // 获取UI设置
  const { showResponseTime, showCharCount, showMessageNumber, enableQuoteHighlight, quoteHighlightColor } = uiSettings;

  // 根据角色确定消息的样式
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isAssistant = message.role === "assistant";

  // 使用useMemo缓存计算结果
  const isFirstMessage = useMemo(() => {
    return isAssistant && 
      currentMessages.findIndex(msg => msg.id === message.id) === 0 && 
      character?.alternateGreetings && 
      character.alternateGreetings.length > 0;
  }, [isAssistant, currentMessages, message.id, character?.alternateGreetings]);

  // 回复变体相关，使用useMemo缓存
  const alternateInfo = useMemo(() => {
    const alternates = message.alternateResponses || [];
    const hasAlternateResponses = isAssistant && alternates.length > 0;
    const currentResponseIndex = message.currentResponseIndex || 0;
    const responseCount = hasAlternateResponses ? alternates.length + 1 : 1;
    
    return {
      alternates,
      hasAlternateResponses,
      currentResponseIndex,
      responseCount
    };
  }, [message.alternateResponses, message.currentResponseIndex, isAssistant]);

  // 提取错误信息
  const hasError = !!message.errorDetails;

  // 复制消息内容，使用useCallback避免重新创建
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  // 处理编辑，使用useCallback
  const handleEditSubmit = useCallback(async () => {
    if (onEdit && editContent !== message.content) {
      onEdit(message.id, editContent);
    }
    setIsEditing(false);
  }, [onEdit, editContent, message.content, message.id]);

  const handleEditCancel = useCallback(() => {
    setEditContent(message.content);
    setIsEditing(false);
  }, [message.content]);

  // 删除消息，使用useCallback
  const handleDelete = useCallback(() => {
    if (window.confirm('确定要删除这条消息吗？')) {
      deleteMessage(message.id);
    }
  }, [deleteMessage, message.id]);

  // 处理消息操作
  const handleMessageAction = useCallback(async (messageId: string, action: string, content?: string) => {
    if (onRegenerate) {
      await onRegenerate(messageId, action, content);
    }
  }, [onRegenerate]);

  // 处理分支创建
  const handleCreateBranch = useCallback(async () => {
    if (branchName.trim()) {
      try {
        await createBranch(message.id, branchName.trim());
        setBranchName("");
        setIsBranchDialogOpen(false);
      } catch (error) {
        console.error('创建分支失败:', error);
      }
    }
  }, [branchName, createBranch, message.id]);

  // 使用useEffect和useMemo优化正则表达式处理
  useEffect(() => {
    const processMessage = async () => {
      if (!isAssistant || !message.content) {
        setProcessedContent(message.content);
        return;
      }

      try {
        const playerName = currentPlayer?.name || "玩家";
        const characterName = character?.name || "AI";

        // 宏替换
        let processed = replaceMacros(message.content, playerName, characterName);

        // 正则表达式处理（仅显示相关的脚本，避免重复处理）
        if (regexState.scripts.length > 0) {
          const { applyRegexToMessageForDisplay } = useRegexStore.getState();
          const messageIndex = currentMessages.findIndex(msg => msg.id === message.id);
          
          processed = await applyRegexToMessageForDisplay(
            processed,
            playerName,
            characterName,
            messageIndex,
            2, // AI消息固定为类型2
            character?.id
          );
        }

        setProcessedContent(processed);
      } catch (error) {
        console.error("处理消息内容时出错:", error);
        setProcessedContent(message.content);
      }
    };

    processMessage();
  }, [
    message.content,
    message.id,
    isAssistant,
    currentPlayer?.name,
    character?.name,
    character?.id,
    regexState.regexUpdateTimestamp,
    currentPresetId,
    currentMessages
  ]);

  // Markdown组件配置，使用useMemo缓存
  const markdownComponents = useMemo(() => ({
    p: ({ children }: { children: React.ReactNode }) => (
      <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
    ),
    pre: ({ children }: { children: React.ReactNode }) => (
      <pre className="bg-muted/50 rounded-md p-3 overflow-x-auto mb-2 last:mb-0">
        <code>{children}</code>
      </pre>
    ),
    code: ({ inline, children }: { inline?: boolean; children: React.ReactNode }) =>
      inline ? (
        <code className="bg-muted/50 px-1 py-0.5 rounded text-sm">{children}</code>
      ) : (
        <>{children}</>
      ),
    blockquote: ({ children }: { children: React.ReactNode }) => (
      <blockquote className="border-l-4 border-muted-foreground/20 pl-4 italic text-muted-foreground mb-2 last:mb-0">
        {children}
      </blockquote>
    ),
  }), []);

  // 消息内容渲染，使用useMemo缓存
  const messageContent = useMemo(() => {
    const content = processedContent || message.content;
    
    if (showRaw) {
      return (
        <div className="whitespace-pre-wrap break-words font-mono text-sm bg-muted/30 p-3 rounded border">
          {content}
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full min-h-[100px] p-2 border rounded resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleEditSubmit}>保存</Button>
            <Button size="sm" variant="outline" onClick={handleEditCancel}>取消</Button>
          </div>
        </div>
      );
    }

    return (
      <ReactMarkdown
        className="prose dark:prose-invert prose-sm max-w-none"
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    );
  }, [processedContent, message.content, showRaw, isEditing, editContent, markdownComponents, handleEditSubmit, handleEditCancel]);

  // 消息信息栏，使用useMemo缓存
  const messageInfo = useMemo(() => {
    const infos = [];

    if (showMessageNumber) {
      const messageIndex = currentMessages.findIndex(msg => msg.id === message.id);
      if (messageIndex !== -1) {
        infos.push(
          <span key="number" className="flex items-center gap-1">
            <Hash className="w-3 h-3" />
            #{messageIndex + 1}
          </span>
        );
      }
    }

    if (showCharCount) {
      infos.push(
        <span key="chars" className="flex items-center gap-1">
          <BarChart2 className="w-3 h-3" />
          {message.content.length}字符
        </span>
      );
    }

    if (showResponseTime && message.responseTime) {
      infos.push(
        <span key="time" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {(message.responseTime / 1000).toFixed(1)}秒
        </span>
      );
    }

    return infos;
  }, [showMessageNumber, showCharCount, showResponseTime, currentMessages, message]);

  // 返回优化的JSX，减少不必要的DOM操作
  return (
    <div className={cn("flex gap-3 mb-4 group", isSystem && "opacity-70")}>
      {/* 头像部分 */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center">
          {/* 头像内容 */}
          {isUser ? (
            currentPlayer?.avatar ? (
              <Image 
                src={currentPlayer.avatar} 
                alt={currentPlayer.name || "玩家"} 
                width={32} 
                height={32}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-muted-foreground" />
            )
          ) : character?.avatar ? (
            <Image 
              src={character.avatar} 
              alt={character.name} 
              width={32} 
              height={32}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-xs font-medium">
              {character?.name?.[0] || "AI"}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col max-w-[85%]">
        <div
          className={cn(
            "px-4 py-3 rounded-lg",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
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
                      window.open(image, '_blank');
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity cursor-pointer" />
                </div>
              ))}
            </div>
          )}
          
          {/* 渲染附加文件 */}
          {message.files && message.files.length > 0 && (
            <div className="flex flex-wrap gap-2 my-2">
              {message.files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-muted/20 rounded-md px-2 py-1">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">{file.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* 错误信息 */}
          {hasError && (
            <div className="mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-center gap-2 text-destructive text-sm mb-1">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">请求失败</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {message.errorDetails?.message || "未知错误"}
                {message.errorDetails?.code && (
                  <span className="ml-1">({message.errorDetails.code})</span>
                )}
              </div>
            </div>
          )}

          {/* 消息内容 */}
          {messageContent}
        </div>

        {/* 消息操作栏 */}
        <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {messageInfo}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              disabled={isProcessing}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRaw(!showRaw)}
              disabled={isProcessing}
            >
              <FileText className="w-4 h-4" />
            </Button>

            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={isProcessing}
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}

            {isAssistant && onRegenerate && !isProcessing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMessageAction(message.id, 'regenerate')}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isProcessing}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 分支创建对话框 */}
      <Dialog open={isBranchDialogOpen} onOpenChange={setIsBranchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新分支</DialogTitle>
            <DialogDescription>
              为此消息创建一个新的对话分支
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="输入分支名称..."
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBranchDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateBranch}>
              创建分支
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

// 比较函数，确保只在真正需要时重新渲染
OptimizedMessage.displayName = 'OptimizedMessage';
