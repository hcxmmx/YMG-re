"use client";

import { useState, useRef, useEffect } from "react";
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

// 新的增强版引号高亮组件
function EnhancedQuoteHighlight({ children, enableHighlight = true }: { 
  children: React.ReactNode; 
  enableHighlight?: boolean;
}) {
  // 如果未启用高亮或没有内容，直接返回原始内容
  if (!enableHighlight || !children) {
    return <>{children}</>;
  }
  
  // 只处理字符串内容
  if (typeof children !== 'string') {
    return <>{children}</>;
  }

  // 获取高亮颜色
  const highlightColor = getQuoteHighlightColor();
  
  // 特殊字符，可能会导致误判，跳过包含这些字符的文本
  if (children.includes('{') || children.includes('}') || 
      children.includes('<') || children.includes('>') ||
      children.includes('`') || children.includes('\\')) {
    return <>{children}</>;
  }
  
  // 使用highlightQuotes函数处理文本
  const parts = highlightQuotes(children, highlightColor);
  
  // 如果没有处理结果或只是一个字符串，直接返回原始内容
  if (!parts || typeof parts === 'string') {
    return <>{children}</>;
  }
  
  // 渲染处理后的内容
  return (
    <>
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          return <span key={index}>{part}</span>;
        } else if (part.type === 'quote') {
          return (
            <span 
              key={index}
              className="quote-highlight"
              style={{
                backgroundColor: `${highlightColor}20`,
                color: highlightColor,
                boxShadow: `inset 0 -1px 0 ${highlightColor}30`,
                borderRadius: '0.25rem',
                padding: '0.125rem 0.25rem',
                margin: '0 0.0625rem',
                display: 'inline',
                whiteSpace: 'pre-wrap',
                boxDecorationBreak: 'clone',
                WebkitBoxDecorationBreak: 'clone',
                transition: 'all 0.2s ease-in-out',
              }}
            >
              {part.content}
            </span>
          );
        }
        return null;
      })}
    </>
  );
}

// 引号高亮处理组件 - 已禁用，直接返回原始内容
function QuoteHighlight({ children }: { children: React.ReactNode }) {
  // 直接返回原始内容，不进行任何处理
  return <>{children}</>;
  
  // 以下代码已被禁用
  /*
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
  
  // 不应用任何特殊处理
  return <>{children}</>;
  */
  
  // 以下代码不会执行
  const segments = [];
  
  // 如果没有解析出任何段落，或者只有一个普通文本段落，直接返回原文
  if (segments.length === 0 || (segments.length === 1 && segments[0].type === 'text')) {
    return <>{children}</>;
  }
  
  // 处理引号组
  type QuoteGroup = {
    segments: TextSegment[];
    isQuote: boolean;
  };
  
  // 将连续的引号相关段落（开引号、引号内容、闭引号）组合在一起
  const groupedSegments: QuoteGroup[] = [];
  let currentQuoteGroup: TextSegment[] = [];
  let inQuote = false;
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    if (segment.type === 'openQuote') {
      // 如果当前有普通文本，先添加为一个组
      if (currentQuoteGroup.length > 0 && !inQuote) {
        groupedSegments.push({
          segments: [...currentQuoteGroup],
          isQuote: false
        });
        currentQuoteGroup = [];
      }
      
      // 开始一个新的引号组
      currentQuoteGroup.push(segment);
      inQuote = true;
    } else if (segment.type === 'closeQuote') {
      // 添加闭引号到当前组
      currentQuoteGroup.push(segment);
      
      // 结束当前引号组
      groupedSegments.push({
        segments: [...currentQuoteGroup],
        isQuote: true
      });
      
      currentQuoteGroup = [];
      inQuote = false;
    } else {
      // 添加到当前组
      currentQuoteGroup.push(segment);
    }
  }
  
  // 处理剩余的段落
  if (currentQuoteGroup.length > 0) {
    groupedSegments.push({
      segments: currentQuoteGroup,
      isQuote: inQuote
    });
  }
  
  // 渲染分组后的内容
  return (
    <>
      {groupedSegments.map((group, groupIndex) => {
                  // 不再区分引号和普通文本，所有文本都使用同样的渲染方式
          const content = group.segments.map(seg => seg.content).join('');
          return <span key={`text-${groupIndex}`}>{content}</span>;
      })}
    </>
  );
}

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

interface MessageProps {
  message: MessageType;
  character?: Character | null;
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  isGeneratingVariant?: boolean;
  isRegenerating?: boolean;  // 添加是否正在重新生成标志
}

export function Message({ message, character, onEdit, onRegenerate, isGeneratingVariant, isRegenerating }: MessageProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [processedContent, setProcessedContent] = useState(message.content); // 初始值设为原始内容
  const { uiSettings } = useSettingsStore();
  const { updateMessage, deleteMessage, currentMessages, createBranch, branches } = useChatStore();
  const playerStore = usePlayerStore();
  // 使用 useStore 钩子订阅 scripts 和 regexUpdateTimestamp
  const { scripts, regexUpdateTimestamp } = useRegexStore(state => ({
    scripts: state.scripts,
    regexUpdateTimestamp: state.regexUpdateTimestamp
  }));
  // 使用 useStore 钩子订阅 currentPresetId
  const { currentPresetId } = usePromptPresetStore(state => ({
    currentPresetId: state.currentPresetId
  }));
  
  // 判断是否有任何生成过程正在进行
  const isProcessing = isGeneratingVariant || isRegenerating;

  // 分支创建对话框状态
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  
  // 获取UI设置
  const { showResponseTime, showCharCount, showMessageNumber, enableQuoteHighlight, quoteHighlightColor } = uiSettings;

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
  const alternates = message.alternateResponses || [];
  const hasAlternateResponses = isAssistant && alternates.length > 0;
  const currentResponseIndex = message.currentResponseIndex || 0;
  const responseCount = hasAlternateResponses ? alternates.length + 1 : 1; // +1 表示原始回复
  
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
  
  // 重新生成回复 - 完全重写
  const handleRegenerate = () => {
    if (onRegenerate && isAssistant && !isProcessing) {
      // 清除控制台以便更清晰地跟踪
      console.clear();
      console.log('[重新生成] 开始处理，消息ID:', message.id);
      
      // 直接调用重新生成回调
      try {
        onRegenerate(message.id);
      } catch (error) {
        console.error('[重新生成] 调用失败:', error);
      }
    } else if (isProcessing) {
      console.log('[重新生成] 忽略请求：正在处理中');
    }
  };

  // 切换开场白
  const handleSwitchGreeting = (direction: 'prev' | 'next') => {
    if (!character || !character.alternateGreetings || character.alternateGreetings.length === 0) return;
    
    // 收集所有可能的开场白，包括主开场白（如果存在且不为空）
    const allGreetings: string[] = [];
    
    // 如果有有效的主开场白，添加到列表
    if (character.firstMessage && character.firstMessage.trim() !== '') {
      allGreetings.push(character.firstMessage);
    }
    
    // 添加所有可选开场白
    allGreetings.push(...character.alternateGreetings);
    
    // 如果没有任何开场白，则不执行切换
    if (allGreetings.length === 0) return;
    
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
  
  // 切换回复变体 - 完全重写
  const handleSwitchResponse = (direction: 'prev' | 'next') => {
    // 如果不是AI消息或正在处理中，直接退出
    if (!isAssistant || isProcessing) {
      console.log('[变体切换] 忽略请求：', 
        !isAssistant ? '不是AI消息' : 
        isProcessing ? '正在处理中' : '未知原因');
      return;
    }
    
    // 清除控制台以便更清晰地跟踪
    console.clear();
    console.log('[变体切换] 开始处理');
    
    // 确保我们使用正确的变体数组
    const alternates = message.alternateResponses || [];
    
    // 显示当前状态
    console.log('[变体切换] 当前状态:', {
      direction,
      currentIndex: currentResponseIndex,
      alternatesLength: alternates.length,
      messageId: message.id,
      originalContent: message.content.substring(0, 30) + '...'
    });

    // 如果没有变体且点击了左切换按钮，不做任何操作
    if (alternates.length === 0 && direction === 'prev') {
      console.log('[变体切换] 没有变体可切换');
      return;
    }
    
    // 如果没有变体且点击了右切换按钮，生成新变体
    if (alternates.length === 0 && direction === 'next') {
      console.log('[变体切换] 没有现有变体，生成新变体');
      if (onRegenerate) {
        onRegenerate(`variant:${message.id}`);
      }
      return;
    }
    
    // 当前是最后一个变体，同时按下一个，则生成新变体
    if (direction === 'next' && currentResponseIndex >= alternates.length) {
      console.log('[变体切换] 已是最后变体，生成新变体');
      if (onRegenerate) {
        onRegenerate(`variant:${message.id}`);
      }
      return;
    }
    
    // 获取所有可能的索引值 (0 = 原始回复, 1...n = 变体)
    const totalVariants = alternates.length + 1;
    
    let newIndex: number;
    
    // 这里的逻辑调整：
    // currentResponseIndex = 0 表示显示原始回复
    // currentResponseIndex = 1...n 表示显示第n个变体
    if (direction === 'prev') {
      // 向前切换 (当前索引-1，如果小于0则循环到最大值)
      newIndex = (currentResponseIndex - 1 + totalVariants) % totalVariants;
    } else {
      // 向后切换 (当前索引+1，如果超过最大值则循环到0)
      newIndex = (currentResponseIndex + 1) % totalVariants;
    }
    
    console.log('[变体切换] 计算新索引:', {
      from: currentResponseIndex,
      to: newIndex,
      totalOptions: totalVariants
    });
    
    // 根据索引获取内容
    let newContent: string;
    
    // 关键修复：明确分离原始内容和变体内容的获取逻辑
    if (newIndex === 0) {
      // 索引0表示原始回复
      newContent = message.originalContent || message.content;
      console.log('[变体切换] 切换到原始回复:', newContent.substring(0, 30) + '...');
    } else {
      // 索引1+表示变体
      const variantIndex = newIndex - 1;
      newContent = alternates[variantIndex];
      console.log('[变体切换] 切换到变体 #', variantIndex, ':', newContent.substring(0, 30) + '...');
    }
    
    // 记录详细操作
    console.log('[变体切换] 执行切换操作:', {
      from: currentResponseIndex,
      to: newIndex,
      contentLength: newContent?.length || 0,
      isOriginalContent: newIndex === 0
    });
    
    // 构建更新对象
    const updatedMessage = {
      ...message,
      content: newContent,
      currentResponseIndex: newIndex,
      // 存储原始内容，以便以后能够正确切换回来
      originalContent: message.originalContent || (currentResponseIndex === 0 ? message.content : message.originalContent)
    };
    
    // 详细记录更新对象
    console.log('[变体切换] 更新消息对象:', {
      messageId: updatedMessage.id,
      newContent: updatedMessage.content.substring(0, 20) + '...',
      newIndex: updatedMessage.currentResponseIndex,
      alternatesCount: (updatedMessage.alternateResponses || []).length
    });
    
    // 立即更新消息
    updateMessage(updatedMessage);
  };
  
  // 打开创建分支对话框
  const handleOpenBranchDialog = () => {
    // 计算下一个分支编号：不包括主分支，只计算用户创建的分支
    const userCreatedBranches = branches.filter(b => b.parentMessageId && b.parentMessageId !== '');
    const nextBranchNum = userCreatedBranches.length + 1;
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

  // 处理消息内容
  useEffect(() => {
    const processMessage = async () => {
      try {
        // 获取当前玩家和角色名称用于宏替换
        const currentPlayer = playerStore.getCurrentPlayer();
        const playerName = currentPlayer?.name || "玩家";
        const characterName = character?.name || "AI";
        
        // 应用宏替换到消息内容
        let content = replaceMacros(
          message.content, 
          playerName, 
          characterName
        );
        
        // 应用正则表达式处理（仅显示相关的脚本，避免重复处理）
        try {
          const { applyRegexToMessageForDisplay } = useRegexStore.getState();
          // 根据消息角色选择处理类型：1=用户输入, 2=AI响应
          const type = isUser ? 1 : 2;
          content = await applyRegexToMessageForDisplay(content, playerName, characterName, 0, type, message.characterId);
        } catch (error) {
          console.error("应用正则表达式处理失败:", error);
        }
        
        setProcessedContent(content);
      } catch (error) {
        console.error("处理消息内容失败:", error);
        setProcessedContent(message.content); // 出错时使用原始内容
      }
    };
    
    processMessage();
  }, [
    message.content, 
    message.characterId, 
    character, 
    isUser, 
    scripts.length, 
    playerStore, 
    // 添加以下依赖项，确保文件夹状态变化时重新处理消息
    currentPresetId, // 监听当前预设ID变化
    regexUpdateTimestamp // 监听正则更新时间戳变化
  ]);

  // 如果是系统消息，则使用特殊样式
  if (isSystem) {
    return (
      <div className="py-2 px-4 rounded-lg bg-muted text-muted-foreground text-sm mb-4">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm, remarkBreaks]} 
          rehypePlugins={[rehypeRaw]} 
          components={enableQuoteHighlight ? {
            // 为系统消息应用引号高亮
            p: ({node, children, ...props}) => (
              <p {...props}><EnhancedQuoteHighlight enableHighlight={enableQuoteHighlight}>{children}</EnhancedQuoteHighlight></p>
            ),
            li: ({node, children, ...props}) => (
              <li {...props}><EnhancedQuoteHighlight enableHighlight={enableQuoteHighlight}>{children}</EnhancedQuoteHighlight></li>
            ),
            strong: ({node, children, ...props}) => (
              <strong {...props}><EnhancedQuoteHighlight enableHighlight={enableQuoteHighlight}>{children}</EnhancedQuoteHighlight></strong>
            ),
            em: ({node, children, ...props}) => (
              <em {...props}><EnhancedQuoteHighlight enableHighlight={enableQuoteHighlight}>{children}</EnhancedQuoteHighlight></em>
            ),
            span: ({node, children, ...props}) => (
              <span {...props}><EnhancedQuoteHighlight enableHighlight={enableQuoteHighlight}>{children}</EnhancedQuoteHighlight></span>
            )
          } : {}}
        >
          {message.content}
        </ReactMarkdown>
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
              "prose dark:prose-invert max-w-none chat-message-text",
              isUser ? "prose-primary" : "",
              "whitespace-pre-line" // 添加这个类来保留换行符
            )}>
              {isEditing ? (
                <div className="flex flex-col gap-3 w-full">
                  <div className="relative w-full">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        // Ctrl+Enter 保存
                        if (e.ctrlKey && e.key === 'Enter') {
                          e.preventDefault();
                          if (editContent.trim()) {
                            handleSubmitEdit();
                          }
                        }
                        // Escape 取消
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setIsEditing(false);
                        }
                      }}
                      className={cn(
                        "w-full min-h-[250px] max-h-[700px] p-4 border-2 rounded-lg",
                        "resize overflow-auto", // 允许自由调整大小，移除transition以提升性能
                        "focus:ring-2 focus:ring-primary/50 focus:border-primary",
                        "font-sans text-sm leading-relaxed",
                        "will-change-auto", // 优化渲染性能
                        // 响应式最小宽度：大屏幕时较宽，小屏幕时适应容器
                        "min-w-0 sm:min-w-[400px] md:min-w-[500px] lg:min-w-[600px]",
                        isUser
                          ? "bg-background text-foreground border-primary/30" 
                          : "bg-background text-foreground border-muted-foreground/30"
                      )}
                      style={{
                        width: '100%',
                        maxWidth: '100%', // 确保不超出容器
                        resize: 'both', // 允许双向调整大小
                        transform: 'translateZ(0)', // 启用硬件加速
                        backfaceVisibility: 'hidden', // 优化重绘性能
                      }}
                      placeholder="编辑消息内容..."
                      autoFocus
                      rows={10} // 增加初始行数
                    />
                    {/* 字符计数器 */}
                    <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-background/90 backdrop-blur-sm px-2 py-1 rounded shadow-sm">
                      {editContent.length} 字符
                    </div>
                  </div>
                  
                  <div className="flex gap-2 justify-between items-start sm:items-center flex-wrap">
                    <div className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                      <span>💡</span>
                      <span className="hidden sm:inline">拖拽右下角调整大小 | 支持快捷键 Ctrl+Enter 保存</span>
                      <span className="sm:hidden">Ctrl+Enter保存 | Esc取消</span>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => setIsEditing(false)}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                          "border border-muted-foreground/30 hover:border-muted-foreground/50",
                          "bg-background text-foreground hover:bg-muted/50"
                        )}
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSubmitEdit}
                        disabled={!editContent.trim()}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                          "bg-primary text-primary-foreground hover:bg-primary/90",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          "focus:ring-2 focus:ring-primary/50",
                          "min-w-[60px]" // 确保按钮最小宽度
                        )}
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              ) : showRaw ? (
                <pre className="whitespace-pre-wrap text-sm">{message.content}</pre>
              ) : (
                <>
                  {/* 应用宏替换和正则处理后显示消息内容 */}
                      <div className="chat-message-content">
                        <ReactMarkdown 
                          className="break-words"
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          rehypePlugins={[rehypeRaw]}
                          components={enableQuoteHighlight ? {
                            // 为各种文本元素应用引号高亮
                            p: ({node, children, ...props}) => (
                              <p {...props}><EnhancedQuoteHighlight enableHighlight={enableQuoteHighlight}>{children}</EnhancedQuoteHighlight></p>
                            ),
                            li: ({node, children, ...props}) => (
                              <li {...props}><EnhancedQuoteHighlight enableHighlight={enableQuoteHighlight}>{children}</EnhancedQuoteHighlight></li>
                            ),
                            strong: ({node, children, ...props}) => (
                              <strong {...props}><EnhancedQuoteHighlight enableHighlight={enableQuoteHighlight}>{children}</EnhancedQuoteHighlight></strong>
                            ),
                            em: ({node, children, ...props}) => (
                              <em {...props}><EnhancedQuoteHighlight enableHighlight={enableQuoteHighlight}>{children}</EnhancedQuoteHighlight></em>
                            ),
                            span: ({node, children, ...props}) => (
                              <span {...props}><EnhancedQuoteHighlight enableHighlight={enableQuoteHighlight}>{children}</EnhancedQuoteHighlight></span>
                            )
                          } : {}}
                        >
                          {processedContent}
                        </ReactMarkdown>
                      </div>
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
                
                {/* 回复变体指示器 - 彻底重新实现 */}
                {isAssistant && hasAlternateResponses && (
                  <span className="flex items-center gap-1" title="回复变体">
                    {/* 计算总回复数（原始回复+所有变体） */}
                    {(() => {
                      // 计算总回复数量（原始回复 + 所有变体）
                      const totalReplies = (message.alternateResponses?.length || 0) + 1;
                      
                      // 显示简单的数字索引格式 (1/N, 2/N, 3/N...)
                      return (
                        <span className="px-1 rounded text-xs">
                          {currentResponseIndex + 1}/{totalReplies}
                        </span>
                      );
                    })()}
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
                onClick={(e) => {
                  // 阻止事件冒泡
                  e.preventDefault();
                  e.stopPropagation();
                  // 标记时间戳以便追踪
                  const actionTime = Date.now();
                  console.log(`[UI交互-${actionTime}] 重新生成按钮被点击，消息ID:`, message.id);
                  // 立即调用处理函数
                  handleRegenerate();
                }}
                className={`flex items-center gap-0.5 p-1 rounded hover:bg-muted/30 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isProcessing ? "正在处理中，请稍候" : "重新生成回复"}
                data-action="regenerate"
                disabled={isProcessing}
              >
                <RefreshCw size={12} />
                <span className="text-xs">重新生成</span>
              </button>
            )}
            
            {/* 切换回复变体 - 仅对非第一条AI消息显示 */}
            {isAssistant && !isFirstMessage && (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    // 阻止事件冒泡
                    e.preventDefault();
                    e.stopPropagation();
                    // 标记时间戳以便追踪
                    const actionTime = Date.now();
                    console.log(`[UI交互-${actionTime}] 切换到上一个回复变体，消息ID:`, message.id);
                    // 立即调用处理函数
                    handleSwitchResponse('prev');
                  }}
                  className={`p-1 rounded hover:bg-muted/30 ${
                    // 只在处理过程中时禁用
                    isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title={isProcessing ? "正在处理中，请稍候" : "上一个回复变体"}
                  data-action="prev-variant"
                  disabled={isProcessing}
                >
                  <ChevronLeft size={12} />
                </button>
                <button
                  onClick={(e) => {
                    // 阻止事件冒泡
                    e.preventDefault();
                    e.stopPropagation();
                    // 标记时间戳以便追踪
                    const actionTime = Date.now();
                    console.log(`[UI交互-${actionTime}] 切换到下一个回复变体，消息ID:`, message.id);
                    // 立即调用处理函数
                    handleSwitchResponse('next');
                  }}
                  className={`p-1 rounded hover:bg-muted/30 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={isProcessing ? "正在处理中，请稍候" : "下一个回复变体/生成新变体"}
                  data-action="next-variant"
                  disabled={isProcessing}
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