"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { Message } from "@/components/chat/message";

import { ChatInput } from "@/components/chat/chat-input";
import { ChatHeader } from "@/components/chat/chat-header";
import { useSettingsStore, useChatStore, usePlayerStore, useRegexStore, useApiKeyStore } from "@/lib/store";
import { Message as MessageType } from "@/lib/types";
import { generateId } from "@/lib/utils";

import { useNavbar } from "@/lib/contexts";
import { useSearchParams } from "next/navigation";
import { TypingIndicator } from "@/components/chat/message";
import { applyChatBackground, loadChatBackgroundSettings } from "@/lib/background-utils";
import { trimMessageHistory } from "@/lib/tokenUtils";
import { replaceMacros } from "@/lib/macroUtils";
import { apiKeyStorage } from "@/lib/storage";
// 旧的API导入已移除，现在统一使用SendMessageManager和ApiRouter
import { useToast } from "@/components/ui/use-toast";
import { createSendMessageManager, SendMessageManager, RequestLifecycleManager, ChatRequests, AdvancedChatRequests, type SendMessageContext, type ErrorDetails, type DebugInfo, type GlobalCallbacks, type LoadingType, type RequestState, type StateSubscriber } from "@/lib/sendMessageManager";

// LoadingType 现在从 sendMessageManager 导入



// 用于生成请求ID的辅助函数
function generateRequestId(): string {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}

// 创建一个SearchParams组件，包装useSearchParams的使用
function SearchParamsWrapper({ children }: { children: (params: URLSearchParams) => React.ReactNode }) {
  const searchParams = useSearchParams();
  return <>{children(searchParams)}</>;
}

// 检查API密钥（设置中的密钥或API轮询系统中的密钥）
const checkApiKey = async (settingsApiKey?: string): Promise<string | null> => {
  try {
    // 首先检查API轮询系统中是否有启用的密钥
    const activeKey = await apiKeyStorage.getActiveApiKey();
    if (activeKey) {
      // 如果轮询系统有活动密钥，优先使用它
      return activeKey.key;
    }
  } catch (error) {
    console.error("检查API轮询系统密钥失败:", error);
  }
  
  // 如果轮询系统没有可用密钥，回退到设置中的密钥
  if (settingsApiKey) {
    return settingsApiKey;
  }
  
  return null;
};

// 增加API密钥使用次数的辅助函数
const incrementApiKeyUsageCount = async (apiKey: string) => {
  try {
    // 只有当使用的是轮询系统中的密钥时才增加使用次数
    const activeKey = await apiKeyStorage.getActiveApiKey();
    if (activeKey && activeKey.key === apiKey) {
      await apiKeyStorage.incrementApiKeyUsage(activeKey.id);
      console.log(`API密钥 ${activeKey.name} 使用次数已增加`);
    }
  } catch (error) {
    console.error("增加API密钥使用次数失败:", error);
  }
};

export default function ChatPage() {
  const { toast } = useToast();
  const { settings, uiSettings } = useSettingsStore();
  const {
    currentMessages,
    isLoading,
    systemPrompt,
    currentCharacter,
    addMessage,
    updateMessage,
    setIsLoading,
    startNewConversation,
    startCharacterChat,
    currentConversationId,
    conversations,
    loadConversations,
    setCurrentConversation,
    loadBranches
  } = useChatStore();
  const { loadPlayers } = usePlayerStore();
  const { isNavbarVisible } = useNavbar();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null); // 内层消息容器引用
  const responseStartTimeRef = useRef<number>(0);
  // 移除直接使用的useSearchParams
  const characterIdRef = useRef<string | null>(null);
  // 标记是否已处理URL参数
  const urlParamsProcessedRef = useRef(false);
  // 当前请求ID引用，用于取消请求
  const currentRequestIdRef = useRef<string | null>(null);

  // 动态设置页面标题
  useEffect(() => {
    if (currentCharacter) {
      document.title = `与${currentCharacter.name}聊天`;
    } else {
      document.title = "聊天";
    }
  }, [currentCharacter]);
  
  // 滚动控制相关状态
  const [isUserNearBottom, setIsUserNearBottom] = useState(true);
  const [isUserManuallyScrolling, setIsUserManuallyScrolling] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // 🆕 追踪是否为初始加载
  const lastScrollTimeRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  
  // 加载正则表达式脚本
  const { loadScripts } = useRegexStore();
  
  // 添加状态来跟踪当前加载的类型和消息ID
  const [loadingType, setLoadingType] = useState<LoadingType>('new');
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);
  
  // 调试信息状态
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // 显示调试引导面板
  const showDebugGuide = useCallback(() => {
    setDebugInfo({
      systemPrompt: "🔧 调试功能已启用！请发送一条消息，系统将显示完整的提示词构建过程。",
      messages: [],
      apiParams: {
        model: "等待消息发送...",
        temperature: 0,
        maxOutputTokens: 0,
        topK: 0,
        topP: 0,
        stream: false
      } as any,
      timestamp: new Date().toISOString(),
      // 添加UnifiedDebugInfo必需的属性
      apiType: settings.apiType || 'gemini',
      endpoint: settings.apiType === 'openai' 
        ? (settings.openaiBaseURL || 'https://api.openai.com/v1')
        : 'Google Gemini API',
      model: settings.apiType === 'openai' 
        ? (settings.openaiModel || 'gpt-4o-mini')
        : (settings.model || 'gemini-2.5-pro'),
      parameters: settings.apiType === 'openai' ? {
        temperature: settings.openaiTemperature || 1.0,
        max_tokens: settings.openaiMaxTokens || 4096,
        top_p: settings.openaiTopP || 1.0,
        frequency_penalty: settings.openaiFrequencyPenalty || 0,
        presence_penalty: settings.openaiPresencePenalty || 0,
        stream: settings.openaiStream ?? true
      } : {
        temperature: settings.temperature || 1,
        maxOutputTokens: settings.maxTokens || 65535,
        topK: settings.topK || 40,
        topP: settings.topP || 0.95,
        stream: settings.enableStreaming
      }
    });
    setShowDebugInfo(true);
  }, []);

  // 创建发送消息管理器
  const sendMessageManagerRef = useRef<SendMessageManager | null>(null);
  
  // 检测用户是否在消息容器底部附近
  const checkIfUserNearBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    
    const container = messagesContainerRef.current;
    const threshold = 100; // 距离底部100px以内算作"接近底部"
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const scrollHeight = container.scrollHeight;
    
    return (scrollTop + containerHeight) >= (scrollHeight - threshold);
  }, []);
  
  // 智能滚动到底部（只在用户接近底部且没有手动滚动时滚动）
  const smartScrollToBottom = useCallback(() => {
    if (isUserNearBottom && !isUserManuallyScrolling && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [isUserNearBottom, isUserManuallyScrolling]);

  // 🆕 强制滚动到底部（用于初始加载）
  const forceScrollToBottomImmediate = useCallback(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      // 立即滚动到底部，不使用smooth动画
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "instant"
      });
      // 确保状态正确
      setIsUserNearBottom(true);
      setIsUserManuallyScrolling(false);
    }
  }, []);
  
  // 强制滚动到底部（用于用户主动发送消息时）
  const forceScrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      // 清除手动滚动状态，因为这是程序触发的滚动
      setIsUserManuallyScrolling(false);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      
      const container = messagesContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    }
  }, []);
  
  // 处理消息容器滚动事件
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const now = Date.now();
      
      // 标记用户正在手动滚动
      setIsUserManuallyScrolling(true);
      
      // 🆕 用户手动滚动时，标记初始加载已完成
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
      
      // 清除之前的定时器
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // 设置新的定时器，500ms后清除手动滚动状态
      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserManuallyScrolling(false);
        scrollTimeoutRef.current = null;
      }, 500);
      
      // 节流，每100ms最多检测一次位置
      if (now - lastScrollTimeRef.current > 100) {
        lastScrollTimeRef.current = now;
        setIsUserNearBottom(checkIfUserNearBottom());
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // 初始检测
    setIsUserNearBottom(checkIfUserNearBottom());
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [checkIfUserNearBottom, isInitialLoad]); // 🆕 添加isInitialLoad依赖
  
  // 初始化发送消息管理器
  const initializeSendMessageManager = useCallback(() => {
    const currentPlayer = usePlayerStore.getState().getCurrentPlayer();
    const { applyRegexToMessage } = useRegexStore.getState();
    
    const context: SendMessageContext = {
      messages: currentMessages,
      settings,
      currentCharacter,
      currentPlayer,
      toast,
      applyRegexToMessage,
      systemPrompt,
      // 🆕 简化的全局回调配置 - 只保留调试功能，其他由内部状态管理
      globalCallbacks: {
        onDebugInfo: (info: DebugInfo) => {
          console.log('[SendMessageManager] 收到调试信息:', info);
          setDebugInfo(info);
          setShowDebugInfo(true);
        },
      }
    };
    
    if (!sendMessageManagerRef.current) {
      sendMessageManagerRef.current = createSendMessageManager(context);
      
      // 🆕 订阅内部状态变化
      sendMessageManagerRef.current.subscribe((state: RequestState) => {
        console.log('[SendMessageManager] 状态变化:', state);
        
        // 同步UI状态
        setIsLoading(state.isLoading);
        setLoadingType(state.loadingType || 'new');
        setLoadingMessageId(state.loadingMessageId);
        
        // 更新响应开始时间引用（为了兼容现有代码）
        if (state.startTime) {
          responseStartTimeRef.current = state.startTime;
        }
      });
    } else {
      sendMessageManagerRef.current.updateContext(context);
    }
    
    return sendMessageManagerRef.current;
  }, [currentMessages, settings, currentCharacter, toast, systemPrompt]);

  // 加载正则表达式脚本
  useEffect(() => {
    loadScripts();
  }, [loadScripts]);

  // 🆕 应用启动时检查每日API密钥使用次数自动重置
  useEffect(() => {
    const checkDailyReset = async () => {
      try {
        const wasReset = await apiKeyStorage.checkAndPerformDailyReset();
        if (wasReset) {
          console.log('✅ 每日API密钥使用次数自动重置已执行');
        }
      } catch (error) {
        console.error('检查每日自动重置时出错:', error);
      }
    };

    checkDailyReset();
  }, []); // 只在应用启动时执行一次

  // 处理URL参数，加载角色和对话，但只在首次加载时处理
  // 移到SearchParamsHandler组件中
  
  // 确保在页面加载时加载对话历史
  useEffect(() => {
    // 加载对话列表
    console.log('页面初始化，开始加载对话历史...');
    loadConversations().then(() => {
      console.log('页面加载时对话列表已加载，当前对话ID:', currentConversationId);
      
      // 如果有当前对话ID，确保对话内容已加载
      if (currentConversationId) {
        // 如果没有URL参数但有当前对话ID，确保对话内容已加载
        console.log('确保当前对话内容已加载，消息数量:', currentMessages.length);
        loadBranches(); // 加载分支数据
      } else if (conversations.length > 0) {
        // 如果没有当前对话但有对话历史，加载最新的对话
        console.log('加载最新对话');
        const latestConversation = conversations[0];
        if (latestConversation) {
          console.log('找到最新对话:', latestConversation.id);
          setCurrentConversation(latestConversation.id).then(() => {
            loadBranches(); // 加载分支数据
          }).catch(error => {
            console.error('加载最新对话失败:', error);
          });
        }
      }
    }).catch(error => {
      console.error('加载对话列表失败:', error);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // 仅在组件挂载时执行一次，使用ESLint禁用规则避免警告

  // 监听当前对话ID变化，确保加载相应的分支数据
  useEffect(() => {
    if (currentConversationId) {
      console.log(`当前对话ID变更为: ${currentConversationId}，加载分支数据`);
      loadBranches().catch(error => {
        console.error('加载分支数据失败:', error);
      });
    } else {
      console.log('当前没有活动对话，重置分支状态');
      // 当没有活动对话时，确保分支状态被重置
      useChatStore.setState({
        branches: [],
        currentBranchId: null
      });
    }
  }, [currentConversationId, loadBranches]);

  // 当消息更新时智能滚动到底部（初始加载时强制滚动，后续智能滚动）
  useEffect(() => {
    // 使用 setTimeout 让滚动在 DOM 更新后执行
    const timer = setTimeout(() => {
      if (isInitialLoad && currentMessages.length > 0) {
        // 初始加载完成且有消息时，强制滚动到底部
        console.log('初始加载完成，强制滚动到底部');
        forceScrollToBottomImmediate();
        setIsInitialLoad(false); // 标记初始加载完成
      } else {
        // 后续消息更新时使用智能滚动
        smartScrollToBottom();
      }
    }, 50); // 增加延迟确保DOM完全渲染

    return () => clearTimeout(timer);
  }, [currentMessages, smartScrollToBottom, forceScrollToBottomImmediate, isInitialLoad]);

  // 监听导航栏状态变化，重新检测用户位置
  useEffect(() => {
    // 导航栏状态变化可能会影响容器大小，重新检测用户位置
    const timer = setTimeout(() => {
      setIsUserNearBottom(checkIfUserNearBottom());
    }, 100); // 等待布局调整完成
    
    return () => clearTimeout(timer);
  }, [isNavbarVisible, checkIfUserNearBottom]);

  // 加载玩家数据
  useEffect(() => {
    loadPlayers().catch((error: Error) => 
      console.error("加载玩家数据失败:", error)
    );
  }, [loadPlayers]);

  // 🆕 页面完全挂载后的保险滚动（处理从其他页面返回的情况）
  useEffect(() => {
    // 页面挂载后延迟执行，确保所有组件都已渲染
    const timer = setTimeout(() => {
      if (currentMessages.length > 0) {
        console.log('页面挂载完成，执行保险滚动');
        forceScrollToBottomImmediate();
      }
    }, 200); // 较长延迟，确保完全渲染
    
    return () => clearTimeout(timer);
  }, []); // 只在首次挂载时执行
  
  // 使用SearchParams的处理组件
  function SearchParamsHandler() {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <SearchParamsWrapper>
          {(searchParams) => {
            // 如果已经处理过URL参数，则不再处理
            if (!urlParamsProcessedRef.current) {
              const characterId = searchParams.get('characterId');
              const conversationId = searchParams.get('conversationId');
              
              // 标记URL参数已处理
              urlParamsProcessedRef.current = true;
              
              // 如果有对话ID参数，优先加载指定对话
              if (conversationId) {
                setCurrentConversation(conversationId).then(() => {
                  loadBranches(); // 加载分支数据
                }).catch(error => {
                  console.error('加载指定对话失败:', error);
                });
                return null; // 已经处理了对话加载，不需要进一步处理角色
              }
              
              // 如果只有角色ID参数
              if (characterId) {
                characterIdRef.current = characterId;
                
                // 直接创建新的角色聊天，确保使用最新的角色信息
                console.log('URL参数包含角色ID，启动角色聊天:', characterId);
                startCharacterChat(characterId).then(() => {
                  loadBranches(); // 加载分支数据
                }).catch(error => {
                  console.error('启动角色聊天失败:', error);
                });
              }
            }
            
            return null;
          }}
        </SearchParamsWrapper>
      </Suspense>
    );
  }

  // 重新生成AI回复 - 完全重写
  const handleRegenerateMessage = async (messageId: string) => {
    console.clear(); // 清除控制台便于调试
    console.log('[重新生成] 开始处理消息:', messageId);
    
    // 找到需要重新生成的消息
    const messageToRegenerate = currentMessages.find(msg => msg.id === messageId);
    if (!messageToRegenerate || messageToRegenerate.role !== 'assistant') {
      console.error('[重新生成] 未找到有效的助手消息:', messageId);
      return;
    }

    // 找到该消息之前的用户消息作为提示
    const messageIndex = currentMessages.findIndex(msg => msg.id === messageId);
    if (messageIndex <= 0) {
      console.error('[重新生成] 消息没有前置消息，无法重新生成');
      return; 
    }

    // 获取最近的用户消息
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && currentMessages[userMessageIndex].role !== 'user') {
      userMessageIndex--;
    }

    if (userMessageIndex < 0) {
      console.error('[重新生成] 未找到前置用户消息');
      return; 
    }

    // 保存原始消息的楼层号，确保重新生成时保持相同的编号
    const originalMessageNumber = messageToRegenerate.messageNumber;
    
    console.log('[重新生成] 清除所有变体并准备重新生成消息');
    
    // 🆕 状态管理现在由全局回调处理
    
    // 用于累积流式内容的局部变量
    let accumulatedContent = "";

    try {
      // 初始化发送消息管理器并使用统一的重新生成逻辑
      const sendManager = initializeSendMessageManager();
      await AdvancedChatRequests.regenerateMessage(
        sendManager,
        messageId,
        messageIndex,
        {
          stream: settings.enableStreaming,
          onProgress: async (chunk: string) => {
            // 累积内容到局部变量
            accumulatedContent += chunk;
            
            updateMessage({
              ...messageToRegenerate,
              id: messageId,
              content: accumulatedContent,
              timestamp: new Date(),
            });
          },
          onComplete: async (fullResponse: string) => {
            // 🆕 响应时间和正则处理现在由SendMessageManager内部管理
            const state = sendManager.getState();
            const responseTime = state.responseTime || 0;
            
            updateMessage({
              id: messageId,
              role: "assistant",
              content: fullResponse, // 现在fullResponse已经是处理过的内容
              timestamp: new Date(),
              responseTime: responseTime,
              messageNumber: originalMessageNumber,
              alternateResponses: [],
              currentResponseIndex: 0,
              originalContent: undefined,
              errorDetails: undefined
            });
          },
          onError: async (errorDetails: ErrorDetails, error?: string) => {
            updateMessage({
              ...messageToRegenerate,
              id: messageId,
              content: "重新生成消息时发生错误。",
              timestamp: new Date(),
              errorDetails
            });
            
            // 🆕 状态清理现在由全局回调处理
          }
        }
      );
      return;
    } catch (error: any) {
      console.error('[handleRegenerateMessage] 执行失败:', error);
      // 🆕 状态清理现在由全局回调处理
    }
  };

  // 生成新的回复变体，保留原始回复
  const handleGenerateVariant = async (messageId: string) => {
    // 找到需要生成变体的消息
    const messageToAddVariant = currentMessages.find(msg => msg.id === messageId);
    if (!messageToAddVariant || messageToAddVariant.role !== 'assistant') return;

    // 找到该消息之前的用户消息作为提示
    const messageIndex = currentMessages.findIndex(msg => msg.id === messageId);
    if (messageIndex <= 0) return; // 没有前置消息，无法生成变体

    // 获取最近的用户消息
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && currentMessages[userMessageIndex].role !== 'user') {
      userMessageIndex--;
    }

    if (userMessageIndex < 0) return; // 没有找到前置用户消息

    // 保存原始消息数据
    const originalContent = messageToAddVariant.content;
    const originalMessageNumber = messageToAddVariant.messageNumber;
    
    // 准备变体数据
    const currentAlternates = messageToAddVariant.alternateResponses || [];
    
    // 🆕 状态管理现在由全局回调处理
    
    // 用于累积流式内容的局部变量
    let accumulatedContent = "";

    try {
      // 使用统一的消息管理器处理变体生成
      const sendManager = initializeSendMessageManager();
      await AdvancedChatRequests.generateVariant(
        sendManager,
        messageId,
        messageIndex,
        {
          stream: settings.enableStreaming,
          onStart: () => {
            console.log('[handleGenerateVariant] 开始生成变体');
            // 生成变体开始时，重置累积内容并清空消息
            accumulatedContent = "";
            updateMessage({
              ...messageToAddVariant,
              id: messageId,
              content: "",
              timestamp: new Date(),
            });
          },
          onProgress: async (chunk: string) => {
            // 累积内容到局部变量
            accumulatedContent += chunk;
            
            updateMessage({
              ...messageToAddVariant,
              id: messageId,
              content: accumulatedContent,
              timestamp: new Date(),
            });
          },
          onComplete: async (fullResponse: string) => {
            const responseTime = Date.now() - responseStartTimeRef.current;
            const currentPlayer = usePlayerStore.getState().getCurrentPlayer();
            const playerName = currentPlayer?.name || "玩家";
            const characterName = currentCharacter?.name || "AI";
            
            let processedResponse = fullResponse;
            try {
              const { applyRegexToMessage } = useRegexStore.getState();
              processedResponse = await applyRegexToMessage(fullResponse, playerName, characterName, 0, 2, currentCharacter?.id);
            } catch (error) {
              console.error("应用正则表达式处理AI响应时出错:", error);
            }
            
            const newVariants = [...currentAlternates, processedResponse];
            updateMessage({
              ...messageToAddVariant,
              id: messageId,
              content: processedResponse,
              alternateResponses: newVariants,
              currentResponseIndex: newVariants.length,
              originalContent: messageToAddVariant.originalContent || originalContent,
              timestamp: new Date(),
              responseTime: responseTime,
              errorDetails: undefined
            });
            
            // 🆕 状态清理现在由全局回调处理
          },
          onError: async (errorDetails: ErrorDetails, error?: string) => {
            updateMessage({
              ...messageToAddVariant,
              id: messageId,
              content: originalContent,
              timestamp: new Date(),
              errorDetails
            });
            
            // 🆕 状态清理现在由全局回调处理
          }
        }
      );
      return;
    } catch (error: any) {
      console.error('[handleGenerateVariant] 执行失败:', error);
      // 🆕 状态清理现在由全局回调处理
    }
  };

  // 处理消息操作
  const handleMessageAction = async (actionString: string) => {
    // 检查是否是变体生成
    if (actionString.startsWith('variant:')) {
      const messageId = actionString.substring(8); // 提取消息ID
      await handleGenerateVariant(messageId);
      return;
    }
    
    // 否则，这是普通的重新生成请求
    await handleRegenerateMessage(actionString);
  };

  // 发送消息
  const handleSendMessage = async (content: string, files?: { data: string; type: string; name?: string }[]) => {
    // 用户主动发送消息时，强制滚动到底部并标记为接近底部
    setIsUserNearBottom(true);
    forceScrollToBottom();
    
    // 初始化发送消息管理器
    const sendManager = initializeSendMessageManager();
    
    // 🆕 状态管理现在由全局回调处理

    // 创建初始空消息（AI回复）
    let currentAssistantMessage: MessageType | null = null;

    try {
      // 首先添加用户消息
      const currentPlayer = usePlayerStore.getState().getCurrentPlayer();
      const playerName = currentPlayer?.name || "玩家";
      const characterName = currentCharacter?.name || "AI";

      // 应用宏替换到用户消息内容
      let processedContent = replaceMacros(content, playerName, characterName);
      
      // 应用正则表达式处理用户输入
      try {
        const { applyRegexToMessage } = useRegexStore.getState();
        processedContent = await applyRegexToMessage(processedContent, playerName, characterName, 0, 1, currentCharacter?.id);
      } catch (error) {
        console.error("应用正则表达式处理用户输入时出错:", error);
      }

      // 添加用户消息
      const userMessage: MessageType = {
        id: generateId(),
        role: "user",
        content: processedContent,
        files,
        timestamp: new Date(),
      };

      await addMessage(userMessage);

      // 🆕 用户发送消息后立即滚动到底部
      setTimeout(() => {
        forceScrollToBottom();
      }, 10);

      // 🆕 使用高级API - 自动状态管理
      const response = await AdvancedChatRequests.sendMessage(sendManager, content, {
        files: files,
        stream: settings.enableStreaming,
        onProgress: async (chunk: string) => {
          // 如果还没有创建助手消息，先创建一个
          if (!currentAssistantMessage) {
            currentAssistantMessage = {
              id: generateId(),
              role: "assistant",
              content: "",
              timestamp: new Date(),
            };
            await addMessage(currentAssistantMessage);
          }
          
          // 更新消息内容
          const updatedMessage = {
            ...currentAssistantMessage,
            content: currentAssistantMessage.content + chunk
          };
          
          currentAssistantMessage = updatedMessage;
          updateMessage(updatedMessage);
        },
        onComplete: async (fullResponse: string) => {
          console.log('[handleSendMessage] AI回复生成完成');
          
          // 🆕 响应时间现在由SendMessageManager内部管理
          const state = sendManager.getState();
          const responseTime = state.responseTime || 0;
          
          // 如果使用非流式响应，创建完整的消息
          if (!settings.enableStreaming && !currentAssistantMessage) {
            const assistantMessage: MessageType = {
              id: generateId(),
              role: "assistant",
              content: fullResponse,
              timestamp: new Date(),
              responseTime: responseTime
            };
            await addMessage(assistantMessage);
          } else if (currentAssistantMessage) {
            // 更新最终内容，包含响应时间
            const finalMessage = {
              ...currentAssistantMessage,
              content: fullResponse,
              responseTime: responseTime
            };
            updateMessage(finalMessage);
          }
        },
        onError: async (errorDetails: ErrorDetails, error?: string) => {
          console.error('[handleSendMessage] AI回复生成失败:', errorDetails);
          
          // 创建带有错误信息的助手消息
          await addMessage({
            id: generateId(),
            role: "assistant",
            content: "发送消息时发生错误。",
            timestamp: new Date(),
            errorDetails
          });
        }
      });
      
    } catch (error: any) {
      console.error('[handleSendMessage] 执行失败:', error);
      // 🆕 状态清理现在由全局回调处理
    }
  };

  // 获取最后一条用户消息
  // 用于支持"直接请求回复"功能：查找对话中最后一条用户消息
  const getLastUserMessage = (): MessageType | null => {
    if (currentMessages.length === 0) return null;
    
    // 从后向前查找第一条用户消息
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      if (currentMessages[i].role === 'user') {
        return currentMessages[i];
      }
    }
    
    return null;
  };
  
  // 获取最后一条用户消息
  const lastUserMessage = getLastUserMessage();
  
  // "直接请求回复"功能：检查最后一条消息是否为用户消息
  // 只有在对话最后一条消息是用户消息时才允许直接请求回复
  const canRequestReply = currentMessages.length > 0 && 
    currentMessages[currentMessages.length - 1].role === 'user';

  // ====== 直接请求回复功能 ======
  // 此功能允许用户在对话最后一条消息是用户消息时，直接点击发送按钮请求AI回复
  // 不会重复发送用户消息，而是直接根据现有消息历史生成回复
  
  const handleRequestReply = async () => {
    // 安全检查：确保可以请求回复且存在最后一条用户消息
    if (!canRequestReply || !lastUserMessage) return;
    
    // 用户主动请求回复时，强制滚动到底部并标记为接近底部
    setIsUserNearBottom(true);
    forceScrollToBottom();
    
    // 初始化发送消息管理器
    const sendManager = initializeSendMessageManager();
    
    // 🆕 状态管理现在由全局回调处理

    // 创建初始空消息（AI回复）
    let currentAssistantMessage: MessageType | null = null;

    try {
      // 使用统一的请求管理器执行直接回复请求
      const response = await AdvancedChatRequests.requestDirectReply(sendManager, {
        stream: settings.enableStreaming,
        onStart: () => {
          console.log('[handleRequestReply] 开始直接请求回复');
        },
        onProgress: async (chunk: string) => {
          // 如果还没有创建助手消息，先创建一个
          if (!currentAssistantMessage) {
            currentAssistantMessage = {
              id: generateId(),
              role: "assistant",
              content: "",
              timestamp: new Date(),
            };
            await addMessage(currentAssistantMessage);
          }
          
          // 更新消息内容
          const updatedMessage = {
            ...currentAssistantMessage,
            content: currentAssistantMessage.content + chunk
          };
          
          currentAssistantMessage = updatedMessage;
          updateMessage(updatedMessage);
        },
        onComplete: async (fullResponse: string) => {
          console.log('[handleRequestReply] 直接回复生成完成');
          
          // 计算响应时间
          const responseTime = Date.now() - responseStartTimeRef.current;
          
          // 🔥 修复：确保消息总是被处理，无论流式设置如何
          if (!currentAssistantMessage) {
            // 没有现有消息，创建新消息（无论流式设置）
            console.log('✅ [handleRequestReply] 创建新的助手消息');
            const assistantMessage: MessageType = {
              id: generateId(),
              role: "assistant",
              content: fullResponse,
              timestamp: new Date(),
              responseTime: responseTime
            };
            await addMessage(assistantMessage);
          } else {
            // 有现有消息，更新内容
            console.log('✅ [handleRequestReply] 更新现有助手消息');
            const finalMessage = {
              ...currentAssistantMessage,
              content: fullResponse,
              responseTime: responseTime
            };
            updateMessage(finalMessage);
          }
          
          // 🆕 状态清理现在由全局回调处理
        },
        onError: async (errorDetails: ErrorDetails, error?: string) => {
          console.error('[handleRequestReply] 直接回复生成失败:', errorDetails);
          
          // 创建带有错误信息的助手消息
          await addMessage({
            id: generateId(),
            role: "assistant",
            content: "请求回复时发生错误。",
            timestamp: new Date(),
            errorDetails
          });
          
          // 🆕 状态清理现在由全局回调处理
        }
      });
      
    } catch (error: any) {
      console.error('[handleRequestReply] 执行失败:', error);
      // 🆕 状态清理现在由全局回调处理
    }
  };

  // 提取API错误详情的辅助函数
  const extractErrorDetails = async (error: any, response?: Response): Promise<ErrorDetails> => {
    let errorDetails: ErrorDetails = {
      code: 500,
      message: "未知错误",
      timestamp: new Date().toISOString()
    };
    
    try {
      // 处理API响应错误
      if (response) {
        errorDetails.code = response.status;
        
        try {
          // 尝试解析响应JSON
          const errorData = await response.json();
          errorDetails.message = errorData.error || "API请求失败";
          
          // 提取更多细节
          if (errorData.details) {
            errorDetails.details = errorData.details;
          } else if (errorData.message) {
            errorDetails.message = errorData.message;
          }
          
        } catch (jsonError) {
          // 响应不是JSON格式
          errorDetails.message = response.statusText || "API请求失败";
        }
      } 
      // 处理JavaScript错误对象
      else if (error instanceof Error) {
        // 尝试解析错误消息中可能包含的JSON
        try {
          const parsedError = JSON.parse(error.message);
          if (parsedError.code) errorDetails.code = parsedError.code;
          if (parsedError.message) errorDetails.message = parsedError.message;
          if (parsedError.details) errorDetails.details = parsedError.details;
        } catch (parseError) {
          // 如果解析失败，使用原始错误消息
          errorDetails.message = error.message;
          
          // 如果是网络错误，设置相应状态码
          if (error.name === "NetworkError") {
            errorDetails.code = 0;
            errorDetails.message = "网络错误，请检查您的网络连接";
          } else if (error.name === "AbortError") {
            errorDetails.code = 499; // Client Closed Request
            errorDetails.message = "请求被取消";
          } else if (error.name === "TimeoutError") {
            errorDetails.code = 408; // Request Timeout
            errorDetails.message = "请求超时";
          }
        }
      } else if (typeof error === "string") {
        errorDetails.message = error;
      }
    } catch (extractError) {
      console.error("提取错误详情时出错:", extractError);
      errorDetails.message = "处理错误信息时出错";
    }
    
    return errorDetails;
  };

  // 取消请求
  const cancelRequest = useCallback(async () => {
    const sendManager = initializeSendMessageManager();
    
    // 🆕 使用新的取消方法：先尝试API取消，再做本地清理
    const cancelled = await sendManager.cancelRequestWithApi();
    
    if (cancelled) {
      console.log('[取消请求] 请求已成功取消');
      currentRequestIdRef.current = null;
      
      toast({
        title: "请求已取消",
        description: "AI回复生成已停止",
      });
    } else {
      console.log('[取消请求] 请求取消失败或没有活动请求');
      // 即使API取消失败，也要做本地清理
      sendManager.cancelRequest();
      currentRequestIdRef.current = null;
    }
  }, [initializeSendMessageManager, toast]);

  // 在组件卸载时取消请求
  useEffect(() => {
    return () => {
      // 当组件卸载时，取消所有请求
      if (currentRequestIdRef.current) {
        cancelRequest();
      }
    };
  }, [cancelRequest]);

  // 初始化和监听背景设置变化
  useEffect(() => {
    // 初始化背景设置
    const backgroundSettings = loadChatBackgroundSettings();
    if (backgroundSettings) {
      applyChatBackground(backgroundSettings);
    }

    const handleBackgroundSettingsChanged = (event: CustomEvent) => {
      console.log('聊天页面收到背景设置变化事件:', event.detail);
      applyChatBackground(event.detail);
    };

    window.addEventListener('backgroundsettingschanged', handleBackgroundSettingsChanged as EventListener);

    return () => {
      window.removeEventListener('backgroundsettingschanged', handleBackgroundSettingsChanged as EventListener);
    };
  }, []);

  return (
    <div className={`flex flex-col chat-background ${isNavbarVisible ? 'dvh-fix h-[calc(100dvh-65px)]' : 'dvh-fix h-screen'}`}>
      {/* 添加SearchParamsHandler组件来处理URL参数 */}
      <SearchParamsHandler />
      <ChatHeader character={currentCharacter} />
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 chat-content">
        {currentMessages.map((message, index) => {
          // 检查当前消息是否正在加载中（重新生成或变体生成）
          const isMessageLoading = isLoading && loadingMessageId === message.id;
          const currentLoadingType = isMessageLoading ? loadingType : undefined;

          return (
            <div key={`${message.id}-${index}`}>
              <Message
                message={message}
                onRegenerate={handleMessageAction}
                character={message.role === 'assistant' ? currentCharacter : undefined}
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
                      {currentLoadingType === 'regenerate'
                        ? "正在重新生成回复..."
                        : "正在生成回复变体..."}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 仅在创建新消息或回复时在底部显示加载指示器 */}
        {isLoading && loadingType === 'new' && (
          <TypingIndicator character={currentCharacter} loadingType="new" />
        )}

        <div ref={messagesEndRef} />
      </div>
      
      {/* 提示词调试面板 */}
      {showDebugInfo && debugInfo && (
        <div className="fixed top-4 right-4 w-96 max-h-[80vh] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden z-50">
          <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 flex items-center justify-between">
            <h3 className="font-medium text-sm">🔧 提示词调试信息</h3>
            <button
              onClick={() => setShowDebugInfo(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          <div className="p-4 overflow-y-auto max-h-[70vh] space-y-4">
            {/* 检查是否为引导模式 */}
            {debugInfo.messages.length === 0 && debugInfo.systemPrompt.includes('调试功能已启用') ? (
              /* 引导模式显示 */
              <div className="text-center space-y-4">
                <div className="text-4xl mb-3">🔧</div>
                <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">调试功能已启用</h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                    现在发送一条消息，系统将在此显示：
                  </p>
                  <div className="text-left text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <div>📝 <strong>系统提示词</strong> - 包含角色描述、预设配置等</div>
                    <div>💬 <strong>消息历史</strong> - 发送给AI的对话记录</div>
                    <div>⚙️ <strong>API参数</strong> - 模型设置、温度参数等</div>
                  </div>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    💡 <strong>提示</strong>：调试信息会在每次发送消息、重新生成或生成变体时更新
                  </p>
                </div>
                <button
                  onClick={() => setShowDebugInfo(false)}
                  className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  知道了，我来试试
                </button>
              </div>
            ) : (
              /* 正常调试信息显示 */
              <>
                <div>
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">系统提示词</h4>
                  <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded border overflow-x-auto whitespace-pre-wrap">
                    {debugInfo.systemPrompt || "无系统提示词"}
                  </pre>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">消息历史 ({debugInfo.messages.length}条)</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {debugInfo.messages.length > 0 ? debugInfo.messages.map((msg, idx) => (
                      <div key={idx} className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded border">
                        <div className="font-medium text-gray-600 dark:text-gray-400">
                          {msg.role === 'user' ? '👤 用户' : msg.role === 'assistant' ? '🤖 助手' : '⚙️ 系统'}
                        </div>
                        <div className="mt-1 whitespace-pre-wrap break-words">
                          {msg.content.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content}
                        </div>
                      </div>
                    )) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 italic">暂无消息历史</div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">API参数</h4>
                  <div className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded border space-y-1">
                    <div><span className="font-medium">模型:</span> {debugInfo.apiParams?.model || debugInfo.model}</div>
                    <div><span className="font-medium">温度:</span> {debugInfo.apiParams?.temperature || debugInfo.parameters?.temperature}</div>
                    <div><span className="font-medium">最大输出:</span> {debugInfo.apiParams?.maxOutputTokens || debugInfo.parameters?.maxOutputTokens || debugInfo.parameters?.max_tokens}</div>
                    <div><span className="font-medium">Top-K:</span> {debugInfo.apiParams?.topK || debugInfo.parameters?.topK}</div>
                    <div><span className="font-medium">Top-P:</span> {debugInfo.apiParams?.topP || debugInfo.parameters?.topP || debugInfo.parameters?.top_p}</div>
                    <div><span className="font-medium">流式:</span> {debugInfo.apiParams?.stream !== undefined ? (debugInfo.apiParams.stream ? '是' : '否') : (debugInfo.parameters?.stream ? '是' : '否')}</div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  调试时间: {new Date(debugInfo.timestamp).toLocaleString()}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      <div className="border-t">
        <ChatInput
          onSendMessage={handleSendMessage}
          onRequestReply={handleRequestReply}
          onCancelRequest={cancelRequest} // 添加取消请求功能
          isLoading={isLoading}
          disabled={false} // 始终允许用户输入
          lastUserMessage={lastUserMessage?.content || null}
          canRequestReply={canRequestReply && !isLoading} // AI回复时不允许直接请求回复
          onShowDebugGuide={showDebugGuide} // 调试引导面板回调
        />
      </div>
    </div>
  );
}