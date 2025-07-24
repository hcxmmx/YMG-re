"use client";

import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Message as MessageType, Character } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Copy, Check, Clock, Hash, BarChart2, Trash2, Edit, RefreshCw, User, ChevronLeft, ChevronRight, GitBranch, AlertCircle, FileText } from "lucide-react";
import { useSettingsStore, useChatStore, usePlayerStore, useRegexStore } from "@/lib/store";
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
import { parseTextWithQuotes, isQuoteHighlightEnabled, getQuoteHighlightColor, TextSegment } from "@/lib/quoteUtils";

// 添加一个打字动画指示器组件
function TypingIndicator({ 
  character,
  loadingType = 'new' 
}: { 
  character?: Character | null;
  loadingType?: 'new' | 'regenerate' | 'variant'; // 加载类型：新消息、重新生成、变体生成
}) {
  // 根据不同的加载类型显示不同的文本
  const loadingText = loadingType === 'regenerate' 
    ? "正在重新生成回复..." 
    : loadingType === 'variant'
      ? "正在生成回复变体..."
      : "正在回复...";

  return (
    <div className="mb-6 group">
      <div className="flex gap-3 justify-start">
        {/* 角色头像 */}
        <div className="flex flex-col items-center gap-1">
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

        {/* 正在输入的动画指示器 */}
        <div className="flex flex-col max-w-[85%]">
          <div className="px-4 py-3 rounded-lg bg-muted inline-flex items-center">
            <div className="flex space-x-1">
              <div className="w-2 h-2 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2 h-2 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "200ms" }}></div>
              <div className="w-2 h-2 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "400ms" }}></div>
            </div>
            <span className="ml-3 text-sm text-muted-foreground">{loadingText}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 引号高亮处理组件
function QuoteHighlight({ children }: { children: React.ReactNode }) {
  // 检查是否启用引号高亮
  const highlightColor = getQuoteHighlightColor();
  
  // 如果children不是字符串，直接返回
  if (!children) {
    return <>{children}</>;
  }
  
  // 将children转换为字符串
  let textContent = '';
  
  // 处理不同类型的children
  if (typeof children === 'string') {
    textContent = children;
  } else if (Array.isArray(children)) {
    // 如果是数组，尝试连接所有字符串元素
    textContent = children
      .map(child => (typeof child === 'string' ? child : ''))
      .join('');
  } else {
    // 如果不是字符串也不是数组，直接返回原内容
    return <>{children}</>;
  }
  
  // 如果处理后的文本为空，直接返回原内容
  if (!textContent) {
    return <>{children}</>;
  }
  
  // 解析文本，识别引号和引号内容
  const segments = parseTextWithQuotes(textContent);
  
  // 如果没有解析出任何段落，或者只有一个普通文本段落，直接返回原文
  if (segments.length === 0 || (segments.length === 1 && segments[0].type === 'text')) {
    return <>{children}</>;
  }
  
  return (
    <>
      {segments.map((segment, index) => {
        switch (segment.type) {
          case 'openQuote':
          case 'closeQuote':
            return (
              <span 
                key={index} 
                className="quote-mark"
                style={{
                  color: highlightColor,
                  fontWeight: 'bold'
                }}
              >
                {segment.content}
              </span>
            );
          case 'quotedText':
            return (
              <span 
                key={index} 
                className="quoted-text"
                style={{
                  backgroundColor: `${highlightColor}20`,
                  borderRadius: '0.25rem',
                  padding: '0.125rem 0',
                  boxShadow: `inset 0 -1px 0 ${highlightColor}30`,
                  color: highlightColor,
                }}
              >
                {segment.content}
              </span>
            );
          default:
            return <span key={index}>{segment.content}</span>;
        }
      })}
    </>
  );
}

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
  const { updateMessage, deleteMessage, currentMessages, createBranch, branches } = useChatStore();
  
  // 分支创建对话框状态
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  
  // 获取UI设置
  const { showResponseTime, showCharCount, showMessageNumber, enableQuoteHighlight, quoteHighlightColor } = uiSettings;
  
  // 订阅正则脚本变化，确保脚本变更时消息能够重新渲染
  // 注意：只使用scripts.length作为依赖，因为我们只关心脚本的启用/禁用状态变化
  const { scripts } = useRegexStore();

  // 根据角色确定消息的样式
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isAssistant = message.role === "assistant";
  
  // 判断是否为第一条消息
  const isFirstMessage = isAssistant && 
    currentMessages.findIndex(msg => msg.id === message.id) === 0 && 
    character?.alternateGreetings && 
    character.alternateGreetings.length > 0;
    
  // 回复变体相关
  const hasAlternateResponses = isAssistant && message.alternateResponses && message.alternateResponses.length > 0;
  const currentResponseIndex = message.currentResponseIndex || 0;
  const responseCount = hasAlternateResponses ? message.alternateResponses!.length + 1 : 1; // +1 表示原始回复
  
  // 提取错误信息
  const hasError = !!message.errorDetails;
  
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

  // 切换开场白
  const handleSwitchGreeting = (direction: 'prev' | 'next') => {
    if (!character || !character.alternateGreetings || !character.firstMessage) return;
    
    // 收集所有可能的开场白
    const allGreetings = [character.firstMessage, ...character.alternateGreetings];
    
    // 找到当前开场白的索引
    const currentIndex = allGreetings.findIndex(greeting => greeting === message.content);
    
    // 如果没找到匹配的开场白，默认使用第一个
    const currentGreetingIndex = currentIndex === -1 ? 0 : currentIndex;
    
    // 计算新的索引
    let newIndex: number;
    if (direction === 'prev') {
      newIndex = (currentGreetingIndex - 1 + allGreetings.length) % allGreetings.length;
    } else {
      newIndex = (currentGreetingIndex + 1) % allGreetings.length;
    }
    
    // 更新消息
    updateMessage({
      ...message,
      content: allGreetings[newIndex]
    });
  };
  
  // 切换回复变体
  const handleSwitchResponse = (direction: 'prev' | 'next') => {
    if (!isAssistant) return;
    
    // 如果向后切换且已经是最后一个变体，或者没有变体
    if ((direction === 'next' && (!hasAlternateResponses || currentResponseIndex === responseCount - 1)) ||
        (direction === 'prev' && !hasAlternateResponses)) {
      // 生成新变体
      if (onRegenerate) {
        onRegenerate(`variant:${message.id}`);
      }
      return;
    }
    
    // 计算新的变体索引
    let newIndex: number;
    if (direction === 'prev') {
      // 循环到最后一个变体
      newIndex = (currentResponseIndex - 1 + responseCount) % responseCount;
    } else {
      // 切换到下一个变体
      newIndex = (currentResponseIndex + 1) % responseCount;
    }
    
    // 准备内容：如果是索引0则使用原始内容，否则从alternateResponses中获取
    const newContent = newIndex === 0 
      ? message.content 
      : message.alternateResponses![newIndex - 1];
    
    // 更新消息内容
    updateMessage({
      ...message,
      content: newContent,
      currentResponseIndex: newIndex
    });
  };
  
  // 打开创建分支对话框
  const handleOpenBranchDialog = () => {
    const nextBranchNum = branches.length + 1;
    setBranchName(`分支 ${nextBranchNum}`);
    setIsBranchDialogOpen(true);
  };
  
  // 创建分支
  const handleCreateBranch = async () => {
    if (!branchName.trim()) return;
    
    // 创建分支
    await createBranch(branchName.trim(), message.id);
    
    // 关闭对话框
    setIsBranchDialogOpen(false);
    setBranchName("");
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
        {/* 头像和楼层 - 非用户消息时显示在左侧 */}
        {!isUser && (
          <div className="flex flex-col items-center gap-1">
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
            
            {/* 楼层号 - 非用户消息时显示在头像下方 */}
            {message.messageNumber && showMessageNumber && (
              <span className="text-xs text-muted-foreground opacity-50 flex items-center">
                <Hash size={10} className="mr-0.5" />
                {message.messageNumber}
              </span>
            )}
          </div>
        )}

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
                        // 点击图片时在新窗口打开
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
                  <div key={index} className="relative group">
                    {file.type.startsWith('image/') ? (
                      // 图片文件
                      <img
                        src={file.data}
                        alt={file.name || `图片 ${index + 1}`}
                        className="rounded-md max-h-[300px] max-w-full object-contain"
                        onClick={() => {
                          // 点击图片时在新窗口打开
                          window.open(file.data, '_blank');
                        }}
                      />
                    ) : (
                      // 文本文件或其他类型
                      <div 
                        className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          // 点击时下载或打开文件
                          if (file.type === 'text/plain' || file.type === 'application/json' || file.type === 'text/markdown') {
                            // 创建Blob对象
                            const blob = new Blob([file.data], { type: file.type });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = file.name || `file-${index}.${file.type.split('/')[1] || 'txt'}`;
                            a.click();
                            URL.revokeObjectURL(url);
                          } else {
                            // 其他类型尝试直接打开
                            window.open(file.data, '_blank');
                          }
                        }}
                      >
                        <FileText className="w-5 h-5" />
                        <span className="text-sm overflow-hidden text-ellipsis max-w-[200px]">
                          {file.name || `文件 ${index + 1}`}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-opacity" />
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
                      className={cn(
                        "px-2 py-1 rounded-md text-xs",
                        isUser 
                          ? "bg-primary text-primary-foreground hover:bg-primary/90" // 用户消息中使用主色按钮
                          : "bg-primary text-primary-foreground hover:bg-primary/90" // AI消息中使用主色按钮
                      )}
                    >
                      保存
                    </button>
                  </div>
                </div>
              ) : showRaw ? (
                <pre className="whitespace-pre-wrap text-sm">{message.content}</pre>
              ) : (
                <>
                  {/* 应用宏替换和正则处理后显示消息内容 */}
                  {(() => {
                    // 获取当前玩家和角色名称用于宏替换
                    const currentPlayer = usePlayerStore.getState().getCurrentPlayer();
                    const playerName = currentPlayer?.name || "玩家";
                    const characterName = character?.name || "AI";
                    
                    // 应用宏替换到消息内容
                    let processedContent = replaceMacros(
                      message.content, 
                      playerName, 
                      characterName
                    );
                    
                    // 应用正则表达式处理
                    try {
                      const { applyRegexToMessage } = useRegexStore.getState();
                      // 根据消息角色选择处理类型：1=用户输入, 2=AI响应
                      const type = isUser ? 1 : 2;
                      processedContent = applyRegexToMessage(processedContent, playerName, characterName, 0, type);
                    } catch (error) {
                      console.error("应用正则表达式处理失败:", error);
                    }
                    
                    // 使用ReactMarkdown渲染处理后的内容，添加引号高亮支持
                    return (
                      <ReactMarkdown 
                        className="break-words"
                        components={enableQuoteHighlight ? {
                          p: ({node, children, ...props}) => {
                            return <p {...props}><QuoteHighlight>{children}</QuoteHighlight></p>;
                          },
                          li: ({node, children, ...props}) => {
                            return <li {...props}><QuoteHighlight>{children}</QuoteHighlight></li>;
                          },
                          h1: ({node, children, ...props}) => {
                            return <h1 {...props}><QuoteHighlight>{children}</QuoteHighlight></h1>;
                          },
                          h2: ({node, children, ...props}) => {
                            return <h2 {...props}><QuoteHighlight>{children}</QuoteHighlight></h2>;
                          },
                          h3: ({node, children, ...props}) => {
                            return <h3 {...props}><QuoteHighlight>{children}</QuoteHighlight></h3>;
                          },
                          h4: ({node, children, ...props}) => {
                            return <h4 {...props}><QuoteHighlight>{children}</QuoteHighlight></h4>;
                          },
                          h5: ({node, children, ...props}) => {
                            return <h5 {...props}><QuoteHighlight>{children}</QuoteHighlight></h5>;
                          },
                          h6: ({node, children, ...props}) => {
                            return <h6 {...props}><QuoteHighlight>{children}</QuoteHighlight></h6>;
                          },
                          blockquote: ({node, children, ...props}) => {
                            return <blockquote {...props}><QuoteHighlight>{children}</QuoteHighlight></blockquote>;
                          },
                          strong: ({node, children, ...props}) => {
                            return <strong {...props}><QuoteHighlight>{children}</QuoteHighlight></strong>;
                          },
                          em: ({node, children, ...props}) => {
                            return <em {...props}><QuoteHighlight>{children}</QuoteHighlight></em>;
                          },
                          span: ({node, children, ...props}) => {
                            return <span {...props}><QuoteHighlight>{children}</QuoteHighlight></span>;
                          }
                        } : {}}
                      >
                        {processedContent}
                      </ReactMarkdown>
                    );
                  })()}
                </>
              )}
            </div>

            {/* 错误信息显示 */}
            {hasError && (
              <div className="mt-3 p-2 rounded border border-destructive/50 bg-destructive/10 text-destructive">
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <AlertCircle size={14} />
                  <span>
                    错误 {message.errorDetails?.code}: {message.errorDetails?.message}
                  </span>
                </div>
                {message.errorDetails?.details && (
                  <div className="text-xs mt-1 p-1 rounded bg-destructive/5 overflow-auto max-h-[150px]">
                    <pre className="whitespace-pre-wrap">
                      {typeof message.errorDetails.details === 'object' 
                        ? JSON.stringify(message.errorDetails.details, null, 2) 
                        : message.errorDetails.details}
                    </pre>
                  </div>
                )}
              </div>
            )}

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
                
                {/* 回复变体指示器 */}
                {isAssistant && hasAlternateResponses && (
                  <span className="flex items-center" title="回复变体">
                    {currentResponseIndex + 1}/{responseCount}
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

          {/* 消息操作按钮 - 移至消息气泡下方，保持对齐 */}
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
            
            {/* 创建分支按钮 */}
            <button
              onClick={handleOpenBranchDialog}
              className="flex items-center gap-0.5 p-0.5 rounded hover:bg-muted/30"
              title="从这里创建分支"
            >
              <GitBranch size={12} />
              <span className="text-xs">创建分支</span>
            </button>
            
            {/* 编辑 */}
            {!isEditing && (
              <button
                onClick={handleEdit}
                className="flex items-center gap-0.5 p-0.5 rounded hover:bg-muted/30"
                title="编辑消息"
              >
                <Edit size={12} />
                <span className="text-xs">编辑</span>
              </button>
            )}
            
            {/* 重新生成 - 仅对AI消息显示 */}
            {isAssistant && onRegenerate && (
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-0.5 p-0.5 rounded hover:bg-muted/30"
                title="重新生成"
              >
                <RefreshCw size={12} />
                <span className="text-xs">重新生成</span>
              </button>
            )}
            
            {/* 切换回复变体 - 仅对非第一条的AI消息显示 */}
            {isAssistant && !isFirstMessage && (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => handleSwitchResponse('prev')}
                  className="p-0.5 rounded hover:bg-muted/30"
                  title="上一个回复变体"
                >
                  <ChevronLeft size={12} />
                </button>
                <button
                  onClick={() => handleSwitchResponse('next')}
                  className="p-0.5 rounded hover:bg-muted/30"
                  title="下一个回复变体/生成新变体"
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            )}
            
            {/* 删除 */}
            <button
              onClick={handleDelete}
              className="flex items-center gap-0.5 p-0.5 rounded hover:bg-muted/30"
              title="删除消息"
            >
              <Trash2 size={12} />
              <span className="text-xs">删除</span>
            </button>
            
            {/* 切换开场白 - 仅在第一条消息且有可选开场白时显示 */}
            {isFirstMessage && (
              <>
                <button
                  onClick={() => handleSwitchGreeting('prev')}
                  className="flex items-center gap-0.5 p-0.5 rounded hover:bg-muted/30"
                  title="上一个开场白"
                >
                  <ChevronLeft size={12} />
                </button>
                <button
                  onClick={() => handleSwitchGreeting('next')}
                  className="flex items-center gap-0.5 p-0.5 rounded hover:bg-muted/30"
                  title="下一个开场白"
                >
                  <ChevronRight size={12} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* 用户头像 - 用户消息时显示在右侧 */}
        {isUser && (
          <div className="flex flex-col items-center gap-1">
            <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
              {usePlayerStore.getState().getCurrentPlayer()?.avatar ? (
                <Image
                  src={usePlayerStore.getState().getCurrentPlayer()!.avatar!}
                  alt="玩家头像"
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={20} className="text-muted-foreground" />
                </div>
              )}
            </div>
            
            {/* 楼层号 - 用户消息时显示在头像下方 */}
            {message.messageNumber && showMessageNumber && (
              <span className="text-xs text-muted-foreground opacity-50 flex items-center">
                <Hash size={10} className="mr-0.5" />
                {message.messageNumber}
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* 分支创建对话框 */}
      <Dialog open={isBranchDialogOpen} onOpenChange={setIsBranchDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建新分支</DialogTitle>
            <DialogDescription>
              从这条消息创建新的对话分支，探索不同的对话方向
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="分支名称"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              分支将包含从对话开始到当前消息的所有内容，之后可以继续新的对话。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBranchDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateBranch} disabled={!branchName.trim()}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 

// 导出TypingIndicator组件以便在ChatPage中使用
export { TypingIndicator }; 