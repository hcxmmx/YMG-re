"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Message as MessageComponent } from './message';
import { Message as MessageType, Character } from '@/lib/types';

interface VirtualMessageListProps {
  messages: MessageType[];
  character?: Character | null;
  onRegenerate: (messageId: string, action: string, content?: string) => Promise<void>;
  isLoading?: boolean;
  loadingType?: 'new' | 'regenerate' | 'variant';
  loadingMessageId?: string | null;
  containerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

// 虚拟滚动配置
const ESTIMATED_MESSAGE_HEIGHT = 150; // 预估消息高度
const BUFFER_SIZE = 5; // 缓冲区大小（上下额外渲染的消息数量）
const SCROLL_DEBOUNCE_MS = 16; // 约60fps的滚动处理频率

export function VirtualMessageList({
  messages,
  character,
  onRegenerate,
  isLoading,
  loadingType,
  loadingMessageId,
  containerRef,
  messagesEndRef
}: VirtualMessageListProps) {
  // 虚拟滚动状态
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [messageHeights, setMessageHeights] = useState<Map<string, number>>(new Map());
  const [totalHeight, setTotalHeight] = useState(0);

  // 性能优化相关
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const measurementObserverRef = useRef<ResizeObserver>();
  const renderedMessagesRef = useRef<Set<string>>(new Set());

  // 计算可视区域
  const visibleRange = useMemo(() => {
    if (messages.length === 0 || containerHeight === 0) {
      return { startIndex: 0, endIndex: 0 };
    }

    let accumulatedHeight = 0;
    let startIndex = 0;
    let endIndex = messages.length;

    // 找到开始索引
    for (let i = 0; i < messages.length; i++) {
      const messageHeight = messageHeights.get(messages[i].id) || ESTIMATED_MESSAGE_HEIGHT;
      
      if (accumulatedHeight + messageHeight > scrollTop) {
        startIndex = Math.max(0, i - BUFFER_SIZE);
        break;
      }
      accumulatedHeight += messageHeight;
    }

    // 找到结束索引
    let visibleHeight = 0;
    for (let i = startIndex; i < messages.length; i++) {
      const messageHeight = messageHeights.get(messages[i].id) || ESTIMATED_MESSAGE_HEIGHT;
      visibleHeight += messageHeight;
      
      if (visibleHeight > containerHeight + (BUFFER_SIZE * ESTIMATED_MESSAGE_HEIGHT)) {
        endIndex = Math.min(messages.length, i + BUFFER_SIZE);
        break;
      }
    }

    return { startIndex, endIndex };
  }, [messages, scrollTop, containerHeight, messageHeights]);

  // 计算偏移高度
  const offsetY = useMemo(() => {
    let height = 0;
    for (let i = 0; i < visibleRange.startIndex; i++) {
      height += messageHeights.get(messages[i]?.id) || ESTIMATED_MESSAGE_HEIGHT;
    }
    return height;
  }, [messages, visibleRange.startIndex, messageHeights]);

  // 获取可见消息列表
  const visibleMessages = useMemo(() => {
    return messages.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [messages, visibleRange]);

  // 处理滚动事件
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const newScrollTop = container.scrollTop;
    const newContainerHeight = container.clientHeight;

    // 防抖处理
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setScrollTop(newScrollTop);
      setContainerHeight(newContainerHeight);
    }, SCROLL_DEBOUNCE_MS);
    
    // 立即更新scrollTop用于快速响应
    setScrollTop(newScrollTop);
  }, [containerRef]);

  // 测量消息高度
  const measureMessageHeight = useCallback((messageId: string, height: number) => {
    setMessageHeights(prev => {
      const newMap = new Map(prev);
      newMap.set(messageId, height);
      return newMap;
    });
  }, []);

  // 初始化ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // 初始设置
    setContainerHeight(container.clientHeight);
    setScrollTop(container.scrollTop);

    // 监听滚动
    container.addEventListener('scroll', handleScroll, { passive: true });

    // 监听容器大小变化
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { height } = entry.contentRect;
        setContainerHeight(height);
      }
    });

    resizeObserver.observe(container);
    measurementObserverRef.current = resizeObserver;

    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [containerRef, handleScroll]);

  // 计算总高度
  useEffect(() => {
    let total = 0;
    for (const message of messages) {
      total += messageHeights.get(message.id) || ESTIMATED_MESSAGE_HEIGHT;
    }
    setTotalHeight(total);
  }, [messages, messageHeights]);

  // 消息高度测量组件
  const MessageWithMeasurement = React.memo(({ 
    message, 
    index 
  }: { 
    message: MessageType; 
    index: number;
  }) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const [isMeasured, setIsMeasured] = useState(false);

    useEffect(() => {
      if (!elementRef.current || isMeasured) return;

      const element = elementRef.current;
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { height } = entry.contentRect;
          measureMessageHeight(message.id, height);
          setIsMeasured(true);
        }
      });

      resizeObserver.observe(element);

      // 立即测量一次
      const height = element.offsetHeight;
      if (height > 0) {
        measureMessageHeight(message.id, height);
        setIsMeasured(true);
      }

      return () => resizeObserver.disconnect();
    }, [message.id, isMeasured]);

    // 检查当前消息是否正在加载中
    const isMessageLoading = isLoading && loadingMessageId === message.id;

    return (
      <div ref={elementRef}>
        <MessageComponent
          message={message}
          onRegenerate={(messageId) => onRegenerate(messageId, 'regenerate')}
          character={message.role === 'assistant' ? character : undefined}
          isGeneratingVariant={isLoading && loadingType === 'variant' && loadingMessageId === message.id}
          isRegenerating={isLoading && loadingType === 'regenerate' && loadingMessageId === message.id}
        />
        {/* 显示消息特定的加载指示器 */}
        {isMessageLoading && (
          <div className="pl-11 -mt-4 mb-2">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "200ms" }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "400ms" }}></div>
              </div>
              <span className="ml-1">
                {loadingType === 'regenerate' 
                  ? "正在重新生成回复..."
                  : "正在生成回复变体..."}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  });

  MessageWithMeasurement.displayName = 'MessageWithMeasurement';

  return (
    <>
      {/* 虚拟滚动容器 */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div 
          style={{ 
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleMessages.map((message, index) => (
            <MessageWithMeasurement
              key={`${message.id}-${visibleRange.startIndex + index}`}
              message={message}
              index={visibleRange.startIndex + index}
            />
          ))}
        </div>
      </div>
      
      {/* 滚动底部标记 */}
      <div ref={messagesEndRef} />
    </>
  );
}
