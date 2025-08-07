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
import { trimMessageHistory } from "@/lib/tokenUtils";
import { replaceMacros } from "@/lib/macroUtils";
import { apiKeyStorage } from "@/lib/storage";
import { callChatApi, handleStreamResponse, handleNonStreamResponse, ChatApiParams } from "@/lib/chatApi";
import { useToast } from "@/components/ui/use-toast";
import { createSendMessageManager, SendMessageManager, ChatRequests, type SendMessageContext, type ErrorDetails } from "@/lib/sendMessageManager";

// 定义加载类型
type LoadingType = 'new' | 'regenerate' | 'variant';



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
  const responseStartTimeRef = useRef<number>(0);
  // 移除直接使用的useSearchParams
  const characterIdRef = useRef<string | null>(null);
  // 标记是否已处理URL参数
  const urlParamsProcessedRef = useRef(false);
  // 当前请求ID引用，用于取消请求
  const currentRequestIdRef = useRef<string | null>(null);
  
  // 加载正则表达式脚本
  const { loadScripts } = useRegexStore();
  
  // 添加状态来跟踪当前加载的类型和消息ID
  const [loadingType, setLoadingType] = useState<LoadingType>('new');
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);

  // 创建发送消息管理器
  const sendMessageManagerRef = useRef<SendMessageManager | null>(null);
  
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
      systemPrompt
    };
    
    if (!sendMessageManagerRef.current) {
      sendMessageManagerRef.current = createSendMessageManager(context);
    } else {
      sendMessageManagerRef.current.updateContext(context);
    }
    
    return sendMessageManagerRef.current;
  }, [currentMessages, settings, currentCharacter, toast, systemPrompt]);

  // 加载正则表达式脚本
  useEffect(() => {
    loadScripts();
  }, [loadScripts]);

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

  // 当消息更新时滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  // 当导航栏状态改变时，保持滚动位置
  useEffect(() => {
    const timer = setTimeout(() => {
      // 如果有新消息，滚动到底部
      if (currentMessages.length > 0 && !isLoading) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, 300); // 等待导航栏动画完成

    return () => clearTimeout(timer);
  }, [isNavbarVisible, isLoading]);

  // 加载玩家数据
  useEffect(() => {
    loadPlayers().catch((error: Error) => 
      console.error("加载玩家数据失败:", error)
    );
  }, [loadPlayers]);
  
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
    
    // 设置加载状态
    setIsLoading(true);
    setLoadingType('regenerate');
    setLoadingMessageId(messageId);
    
    // 记录响应开始时间
    responseStartTimeRef.current = Date.now();

    try {
      // 初始化发送消息管理器并使用统一的重新生成逻辑
      const sendManager = initializeSendMessageManager();
      await ChatRequests.regenerateMessage(
        sendManager,
        messageId,
        messageIndex,
        {
          stream: settings.enableStreaming,
          onStart: () => {
            console.log('[handleRegenerateMessage] 开始完全重新生成消息');
          },
          onProgress: async (chunk: string) => {
            updateMessage({
              ...messageToRegenerate,
              id: messageId,
              content: chunk,
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
            
            updateMessage({
              id: messageId,
              role: "assistant",
              content: processedResponse,
              timestamp: new Date(),
              responseTime: responseTime,
              messageNumber: originalMessageNumber,
              alternateResponses: [],
              currentResponseIndex: 0,
              originalContent: undefined,
              errorDetails: undefined
            });
            
            setIsLoading(false);
            setLoadingMessageId(null);
          },
          onError: async (errorDetails: ErrorDetails, error?: string) => {
            updateMessage({
              ...messageToRegenerate,
              id: messageId,
              content: "重新生成消息时发生错误。",
              timestamp: new Date(),
              errorDetails
            });
            
            setIsLoading(false);
            setLoadingMessageId(null);
          }
        }
      );
      return;
    } catch (error: any) {
      console.error('[handleRegenerateMessage] 执行失败:', error);
      setIsLoading(false);
      setLoadingMessageId(null);
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
    
    // 设置加载状态
    setIsLoading(true);
    setLoadingType('variant');
    setLoadingMessageId(messageId);
    
    // 记录响应开始时间
    responseStartTimeRef.current = Date.now();

    try {
      // 使用统一的消息管理器处理变体生成
      const sendManager = initializeSendMessageManager();
      await ChatRequests.generateVariant(
        sendManager,
        messageId,
        messageIndex,
        {
          stream: settings.enableStreaming,
          onStart: () => {
            console.log('[handleGenerateVariant] 开始生成变体');
          },
          onProgress: async (chunk: string) => {
            updateMessage({
              ...messageToAddVariant,
              id: messageId,
              content: chunk,
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
            
            setIsLoading(false);
            setLoadingMessageId(null);
          },
          onError: async (errorDetails: ErrorDetails, error?: string) => {
            updateMessage({
              ...messageToAddVariant,
              id: messageId,
              content: originalContent,
              timestamp: new Date(),
              errorDetails
            });
            
            setIsLoading(false);
            setLoadingMessageId(null);
          }
        }
      );
      return;
    } catch (error: any) {
      console.error('[handleGenerateVariant] 执行失败:', error);
      setIsLoading(false);
      setLoadingMessageId(null);
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
    // 初始化发送消息管理器
    const sendManager = initializeSendMessageManager();
    
    // 设置加载状态
    setIsLoading(true);
    setLoadingType('new');
    setLoadingMessageId(null);

    // 记录响应开始时间
    responseStartTimeRef.current = Date.now();

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

      // 使用发送消息管理器处理AI回复
      const response = await sendManager.sendMessage({
        content,
        files,
        stream: settings.enableStreaming,
        onStart: () => {
          console.log('[handleSendMessage] AI回复开始生成');
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
          console.log('[handleSendMessage] AI回复生成完成');
          
          // 计算响应时间
          const responseTime = Date.now() - responseStartTimeRef.current;
          
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
          
          setIsLoading(false);
          setLoadingMessageId(null);
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
          
          setIsLoading(false);
          setLoadingMessageId(null);
        }
      });
      
    } catch (error: any) {
      console.error('[handleSendMessage] 执行失败:', error);
      setIsLoading(false);
      setLoadingMessageId(null);
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
    
    // 初始化发送消息管理器
    const sendManager = initializeSendMessageManager();
    
    setIsLoading(true);
    setLoadingType('new');
    setLoadingMessageId(null);

    // 记录响应开始时间
    responseStartTimeRef.current = Date.now();

    // 创建初始空消息（AI回复）
    let currentAssistantMessage: MessageType | null = null;

    try {
      // 使用统一的请求管理器执行直接回复请求
      const response = await ChatRequests.requestDirectReply(sendManager, {
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
          
          setIsLoading(false);
          setLoadingMessageId(null);
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
          
          setIsLoading(false);
          setLoadingMessageId(null);
        }
      });
      
    } catch (error: any) {
      console.error('[handleRequestReply] 执行失败:', error);
      setIsLoading(false);
      setLoadingMessageId(null);
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
    const cancelled = await sendManager.cancelRequest();
    
    if (cancelled) {
      console.log('[取消请求] 请求已成功取消');
      setIsLoading(false);
      setLoadingMessageId(null);
      currentRequestIdRef.current = null;
      
      toast({
        title: "请求已取消",
        description: "AI回复生成已停止",
      });
    } else {
      console.log('[取消请求] 没有活动的请求可以取消');
    }
  }, [initializeSendMessageManager, setIsLoading, setLoadingMessageId, toast]);

  // 在组件卸载时取消请求
  useEffect(() => {
    return () => {
      // 当组件卸载时，取消所有请求
      if (currentRequestIdRef.current) {
        cancelRequest();
      }
    };
  }, [cancelRequest]);

  return (
    <div className={`flex flex-col ${isNavbarVisible ? 'dvh-fix h-[calc(100dvh-65px)]' : 'dvh-fix h-screen'}`}>
      {/* 添加SearchParamsHandler组件来处理URL参数 */}
      <SearchParamsHandler />
      <ChatHeader character={currentCharacter} />
      <div className="flex-1 overflow-y-auto p-4">
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
        
        {/* 重新生成和变体生成的指示器由相应功能处理，不在这里显示 */}
        
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t">
        <ChatInput
          onSendMessage={handleSendMessage}
          onRequestReply={handleRequestReply}
          onCancelRequest={cancelRequest} // 添加取消请求功能
          isLoading={isLoading}
          disabled={false} // 始终允许用户输入
          lastUserMessage={lastUserMessage?.content || null}
          canRequestReply={canRequestReply && !isLoading} // AI回复时不允许直接请求回复
        />
      </div>
    </div>
  );
}