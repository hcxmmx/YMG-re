"use client";

import { useState, useEffect } from "react";
import { Settings, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettingsStore, usePromptPresetStore, useChatStore, useRegexStore, usePresetFolderStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { conversationStorage } from "@/lib/storage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GEMINI_MODEL_OPTIONS } from "@/lib/config/gemini-config";
import { OPENAI_MODEL_OPTIONS, OPENAI_API_TYPES, PREDEFINED_ENDPOINTS, buildOpenAIConfig } from "@/lib/config/openai-config";
import { ConnectionTester, ConnectionTestResult } from "@/lib/services/connection-tester";

// 动态模型配置 - 根据API类型选择
const getAvailableModels = (apiType: string, testModels: string[] = []) => {
  // 如果有测试获取的模型列表，优先使用
  if (testModels.length > 0) {
    return testModels.map(model => ({ 
      id: model, 
      name: model 
    }));
  }
  
  if (apiType === 'openai') {
    return Object.entries(OPENAI_MODEL_OPTIONS).map(([value, label]) => ({ 
      id: value, 
      name: label 
    }));
  }
  return GEMINI_MODEL_OPTIONS;
};

interface ChatSettingsProps {
  onShowDebugGuide?: () => void;
}

export function ChatSettings({ onShowDebugGuide }: ChatSettingsProps) {
  const { settings, uiSettings, updateSettings, updateUISettings } = useSettingsStore();
  const { presets, currentPresetId, loadPresets, applyPreset, getPreset } = usePromptPresetStore();
  
  const [localSettings, setLocalSettings] = useState({
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    topK: settings.topK,
    topP: settings.topP,
    enableStreaming: settings.enableStreaming,
    showResponseTime: uiSettings.showResponseTime,
    showCharCount: uiSettings.showCharCount,
    showMessageNumber: uiSettings.showMessageNumber,
    enableQuoteHighlight: uiSettings.enableQuoteHighlight,
    quoteHighlightColor: uiSettings.quoteHighlightColor,
    enablePromptDebug: uiSettings.enablePromptDebug || false, // 新增提示词调试开关
    sendHotkey: uiSettings.sendHotkey || 'ctrlEnter', // 发送快捷键设置
    
    // ===== 新增API设置 =====
    apiType: settings.apiType || 'gemini',
    openaiApiType: settings.openaiApiType || 'OPENAI',
    openaiBaseURL: settings.openaiBaseURL || 'https://api.openai.com/v1',
    openaiApiKey: settings.openaiApiKey || '',
    openaiModel: settings.openaiModel || 'gpt-4o-mini',
    openaiMaxTokens: settings.openaiMaxTokens || 4096,
    openaiTemperature: settings.openaiTemperature || 1.0,
    openaiTopP: settings.openaiTopP || 1.0,
    openaiFrequencyPenalty: settings.openaiFrequencyPenalty || 0,
    openaiPresencePenalty: settings.openaiPresencePenalty || 0,
    openaiStream: settings.openaiStream ?? true,
  });
  
  // 当前选中的设置标签页
  const [activeTab, setActiveTab] = useState("presets");
  
  // 是否是第一次加载
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // 预设应用状态
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  // 预设加载状态
  const [presetsLoaded, setPresetsLoaded] = useState(false);
  // 预设是否被修改
  const [presetModified, setPresetModified] = useState(false);
  // 当前预设的原始参数
  const [originalPresetParams, setOriginalPresetParams] = useState<{
    temperature?: number;
    maxTokens?: number;
    topK?: number;
    topP?: number;
  } | null>(null);
  
  // ===== 连接测试状态 =====
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<ConnectionTestResult | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // 当全局设置变化时更新本地设置
  useEffect(() => {
    setLocalSettings(prev => ({
      ...prev,
      model: settings.model,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      topK: settings.topK,
      topP: settings.topP,
      enableStreaming: settings.enableStreaming,
      showResponseTime: uiSettings.showResponseTime,
      showCharCount: uiSettings.showCharCount,
      showMessageNumber: uiSettings.showMessageNumber,
      enableQuoteHighlight: uiSettings.enableQuoteHighlight,
      quoteHighlightColor: uiSettings.quoteHighlightColor,
      enablePromptDebug: uiSettings.enablePromptDebug || false,
      sendHotkey: uiSettings.sendHotkey || 'ctrlEnter',
      
      // ===== 同步API设置 =====
      apiType: settings.apiType || 'gemini',
      openaiApiType: settings.openaiApiType || 'OPENAI',
      openaiBaseURL: settings.openaiBaseURL || 'https://api.openai.com/v1',
      openaiApiKey: settings.openaiApiKey || '',
      openaiModel: settings.openaiModel || 'gpt-4o-mini',
      openaiMaxTokens: settings.openaiMaxTokens || 4096,
      openaiTemperature: settings.openaiTemperature || 1.0,
      openaiTopP: settings.openaiTopP || 1.0,
      openaiFrequencyPenalty: settings.openaiFrequencyPenalty || 0,
      openaiPresencePenalty: settings.openaiPresencePenalty || 0,
      openaiStream: settings.openaiStream ?? true,
    }));
    
    // 🆕 从缓存加载模型列表
    if (settings.apiType === 'openai' && settings.openaiApiType && settings.openaiBaseURL) {
      const { getCachedModels } = useSettingsStore.getState();
      const cachedModels = getCachedModels(
        settings.apiType, 
        settings.openaiApiType, 
        settings.openaiBaseURL
      );
      if (cachedModels) {
        setAvailableModels(cachedModels);
        console.log('💾 [聊天设置] 从缓存加载模型列表:', cachedModels);
      } else {
        // 如果没有缓存，重置可用模型列表
        setAvailableModels([]);
      }
    }
  }, [settings, uiSettings]);
  
  // 加载预设
  useEffect(() => {
    const loadPresetsData = async () => {
      try {
        await loadPresets();
        setPresetsLoaded(true);
        console.log("预设数据加载完成");
      } catch (error) {
        console.error("加载预设失败:", error);
      }
    };
    loadPresetsData();
  }, [loadPresets]);
  
  // 当预设变更时，更新原始参数
  useEffect(() => {
    if (currentPresetId) {
      const preset = getPreset(currentPresetId);
      if (preset) {
        setOriginalPresetParams({
          temperature: preset.temperature,
          maxTokens: preset.maxTokens,
          topK: preset.topK,
          topP: preset.topP,
        });
        setPresetModified(false); // 重置修改状态
      }
    } else {
      setOriginalPresetParams(null);
      setPresetModified(false);
    }
  }, [currentPresetId, getPreset]);

  // ===== 连接测试功能 =====
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    
    try {
      let result: ConnectionTestResult;
      
      if (localSettings.apiType === 'gemini') {
        result = await ConnectionTester.testGeminiConnection(settings.apiKey || '');
      } else {
        const openaiConfig = buildOpenAIConfig({
          apiType: OPENAI_API_TYPES[localSettings.openaiApiType as keyof typeof OPENAI_API_TYPES],
          baseURL: localSettings.openaiBaseURL,
          apiKey: localSettings.openaiApiKey,
          model: localSettings.openaiModel,
          maxTokens: localSettings.openaiMaxTokens,
          temperature: localSettings.openaiTemperature,
          topP: localSettings.openaiTopP,
          frequencyPenalty: localSettings.openaiFrequencyPenalty,
          presencePenalty: localSettings.openaiPresencePenalty,
          stream: localSettings.openaiStream,
          customHeaders: {},
          customParams: {}
        });
        
        result = await ConnectionTester.testOpenAIConnection(openaiConfig);
      }
      
      setConnectionTestResult(result);
      
      // 如果测试成功且返回了模型列表，更新可用模型并缓存
      if (result.success && result.models) {
        setAvailableModels(result.models);
        
        // 🆕 缓存模型列表
        if (localSettings.apiType === 'openai') {
          const { cacheModels } = useSettingsStore.getState();
          cacheModels(
            localSettings.apiType, 
            localSettings.openaiApiType || 'OPENAI', 
            localSettings.openaiBaseURL || '', 
            result.models
          );
        }
        
        // 🔥 重要：自动选择第一个可用模型并更新设置
        if (result.models.length > 0) {
          const firstModel = result.models[0];
          if (localSettings.apiType === 'openai') {
            handleSettingChange('openaiModel', firstModel);
          } else {
            handleSettingChange('model', firstModel);
          }
        }
      }
      
      // 显示测试结果 
      console.log(result.success ? "✅ 连接测试成功" : "❌ 连接测试失败", result);
    } catch (error) {
      console.error('连接测试出错:', error);
      setConnectionTestResult({
        success: false,
        error: "测试过程中发生未知错误"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // 更新设置
  const handleSettingChange = (key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));

    // 根据设置类型更新到对应的存储
    if (['model', 'temperature', 'maxTokens', 'topK', 'topP', 'enableStreaming', 
         'apiType', 'openaiApiType', 'openaiBaseURL', 'openaiApiKey', 'openaiModel', 
         'openaiMaxTokens', 'openaiTemperature', 'openaiTopP', 'openaiFrequencyPenalty', 
         'openaiPresencePenalty', 'openaiStream'].includes(key)) {
      updateSettings({ [key]: value });
      
      // 检查是否修改了预设的核心参数
      if (currentPresetId && ['temperature', 'maxTokens', 'topK', 'topP'].includes(key)) {
        const preset = getPreset(currentPresetId);
        if (preset) {
          // 比较当前值和预设原始值
          if (preset[key as keyof typeof preset] !== value) {
            setPresetModified(true);
          } else {
            // 检查其他参数是否被修改
            const coreParams = ['temperature', 'maxTokens', 'topK', 'topP'];
            const isAnyParamModified = coreParams.some(param => {
              if (param === key) return false; // 跳过当前正在修改的参数
              const paramKey = param as keyof typeof preset;
              return preset[paramKey] !== localSettings[param as keyof typeof localSettings];
            });
            setPresetModified(isAnyParamModified);
          }
        }
      }
    } else if (['showResponseTime', 'showCharCount', 'showMessageNumber', 'enableQuoteHighlight', 'quoteHighlightColor', 'enablePromptDebug', 'sendHotkey'].includes(key)) {
      updateUISettings({ [key]: value });
    }
  };
  
  // 恢复预设默认参数
  const handleRestorePresetDefaults = () => {
    if (!currentPresetId || !originalPresetParams) return;
    
    // 恢复到预设的原始参数
    updateSettings(originalPresetParams);
    setLocalSettings(prev => ({
      ...prev,
      ...originalPresetParams
    }));
    setPresetModified(false);
  };
  
  // 处理预设切换
  const handlePresetChange = async (presetId: string) => {
    // 如果已经在应用预设中，忽略新的请求
    if (isApplying) return;
    
    // 如果选择的是当前预设，直接返回
    if (presetId === currentPresetId) return;
    
    // 确保预设已完全加载
    if (!presetsLoaded) {
      console.log("预设数据尚未完全加载，请稍候");
      return;
    }
    
    // 确认预设存在
    const preset = getPreset(presetId);
    if (!preset) {
      console.error(`预设 ${presetId} 未找到`);
      return;
    }
    
    try {
      setIsApplying(true);
      
      // 应用预设，等待完成
      await applyPreset(presetId);
      console.log(`预设应用完成: ${preset.name}`);
      
      // 保存预设原始参数
      setOriginalPresetParams({
        temperature: preset.temperature,
        maxTokens: preset.maxTokens,
        topK: preset.topK,
        topP: preset.topP,
      });
      
      // 重置修改标记
      setPresetModified(false);
      
      // 添加额外延迟，确保状态已稳定
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 强制刷新正则应用状态
      const regexStore = useRegexStore.getState();
      regexStore.updateRegexApplicationState();
      regexStore.setRegexUpdateTimestamp(Date.now());
      
      setApplySuccess(true);
      setTimeout(() => setApplySuccess(false), 2000);
    } catch (error) {
      console.error("应用预设失败:", error);
    } finally {
      setIsApplying(false);
    }
  };
  
  // 第一次加载后关闭初始加载标记
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [isInitialLoad]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "shrink-0", 
            currentPresetId ? (presetModified ? "text-amber-500" : "text-primary") : ""
          )}
        >
          <Settings className="h-5 w-5" />
          <span className="sr-only">聊天设置</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4" align="start">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full mb-4">
            <TabsTrigger value="presets" className="text-xs">📋 预设</TabsTrigger>
            <TabsTrigger value="model" className="text-xs">🤖 模型</TabsTrigger>
            <TabsTrigger value="ui" className="text-xs">🎨 界面</TabsTrigger>
            <TabsTrigger value="debug" className="text-xs">🔧 调试</TabsTrigger>
          </TabsList>
          {/* 预设管理标签页 */}
          <TabsContent value="presets" className="space-y-4 mt-0">
            <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">预设</label>
              {currentPresetId && presetModified && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2 text-amber-500"
                        onClick={handleRestorePresetDefaults}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        <span className="text-xs">恢复默认</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>恢复预设的原始参数</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="relative">
              <select 
                className={cn(
                  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  isApplying ? "opacity-50" : "",
                  presetModified ? "border-amber-500" : ""
                )}
                value={currentPresetId || "default"}
                onChange={(e) => handlePresetChange(e.target.value)}
                disabled={isApplying || !presetsLoaded}
              >
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name} {presetModified && currentPresetId === preset.id ? "(已修改)" : ""}
                  </option>
                ))}
              </select>
              
              {/* 状态指示器 */}
              {(isApplying || applySuccess) && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                  {isApplying && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  )}
                  {!isApplying && applySuccess && (
                    <div className="text-green-500 text-xs">✓ 已应用</div>
                  )}
                </div>
              )}
              
              {!presetsLoaded && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground"></div>
                </div>
              )}
            </div>
              <div className="flex justify-end mt-1">
                <Button variant="link" size="sm" asChild className="h-auto p-0">
                  <Link href="/presets">管理预设</Link>
                </Button>
              </div>
            </div>
          </TabsContent>
          
          {/* 模型参数标签页 */}
          <TabsContent value="model" className="space-y-4 mt-0">
            {/* API类型选择 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">API类型</label>
              <select 
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={localSettings.apiType}
                onChange={(e) => handleSettingChange('apiType', e.target.value)}
              >
                <option value="gemini">Gemini (Google AI)</option>
                <option value="openai">OpenAI兼容端点</option>
              </select>
            </div>

            {/* OpenAI端点类型选择 */}
            {localSettings.apiType === 'openai' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">端点类型</label>
                <select 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={localSettings.openaiApiType}
                  onChange={(e) => {
                    const newType = e.target.value as keyof typeof OPENAI_API_TYPES;
                    handleSettingChange('openaiApiType', newType);
                    
                    // 自动更新Base URL（与设置页面保持一致）
                    const endpoint = PREDEFINED_ENDPOINTS[OPENAI_API_TYPES[newType] as keyof typeof PREDEFINED_ENDPOINTS];
                    if (endpoint) {
                      handleSettingChange('openaiBaseURL', endpoint.baseURL);
                    }
                    
                    // 🆕 清除旧的模型缓存，重置可用模型列表
                    const { clearModelCache } = useSettingsStore.getState();
                    clearModelCache('openai', localSettings.openaiApiType, localSettings.openaiBaseURL);
                    setAvailableModels([]);
                    console.log('🗑️ [聊天设置] 端点类型改变，清除模型缓存');
                  }}
                >
                  {Object.entries(OPENAI_API_TYPES).map(([key, value]) => (
                    <option key={key} value={key}>
                      {PREDEFINED_ENDPOINTS[value as keyof typeof PREDEFINED_ENDPOINTS]?.name || value}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Base URL (仅OpenAI) */}
            {localSettings.apiType === 'openai' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Base URL</label>
                <Input
                  type="url"
                  value={localSettings.openaiBaseURL}
                  onChange={(e) => handleSettingChange('openaiBaseURL', e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="text-sm"
                />
                {/* 🔥 自定义端点提示 */}
                {localSettings.openaiBaseURL && (localSettings.openaiApiType === 'CUSTOM' || localSettings.openaiApiType === 'OTHER') && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                    <div className="flex items-start space-x-1">
                      <span className="text-blue-600">ℹ️</span>
                      <div className="text-blue-700">
                        <p className="font-medium">自定义端点</p>
                        <p>将通过代理访问以避免CORS限制，确保兼容性。</p>
                        {localSettings.openaiBaseURL.startsWith('http://') && (
                          <p className="mt-1 text-amber-600 font-medium">⚠️ HTTP协议存在安全风险</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* API密钥 (仅OpenAI) */}
            {localSettings.apiType === 'openai' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">API密钥</label>
                <Input
                  type="password"
                  value={localSettings.openaiApiKey}
                  onChange={(e) => handleSettingChange('openaiApiKey', e.target.value)}
                  placeholder="输入您的API密钥"
                  className="text-sm"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">模型</label>
              <div className="flex gap-2">
                <select 
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={localSettings.apiType === 'openai' ? localSettings.openaiModel : localSettings.model}
                  onChange={(e) => handleSettingChange(localSettings.apiType === 'openai' ? 'openaiModel' : 'model', e.target.value)}
                >
                  {getAvailableModels(localSettings.apiType, availableModels).map((option: any) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                
                {/* 连接测试按钮 */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || (localSettings.apiType === 'gemini' && !settings.apiKey) || (localSettings.apiType === 'openai' && !localSettings.openaiBaseURL)}
                  title="测试连接并获取模型列表"
                  className="shrink-0"
                >
                  {isTestingConnection ? "🔄" : "🔄"}
                </Button>
              </div>
              
              {/* 连接测试结果显示 */}
              {connectionTestResult && (
                <div className={`p-2 rounded-md text-xs ${
                  connectionTestResult.success 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <span>{connectionTestResult.success ? '✅ 连接成功' : '❌ 连接失败'}</span>
                    {connectionTestResult.responseTime && (
                      <span>{connectionTestResult.responseTime}ms</span>
                    )}
                  </div>
                  {connectionTestResult.error && (
                    <div className="mt-1">{connectionTestResult.error}</div>
                  )}
                  {connectionTestResult.models && connectionTestResult.models.length > 0 && (
                    <div className="mt-1 opacity-75">
                      发现 {connectionTestResult.models.length} 个可用模型
                    </div>
                  )}
                </div>
              )}
            </div>
          
          {/* 温度设置 */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium">温度</label>
              <span className="text-sm text-muted-foreground">
                {localSettings.apiType === 'openai' 
                  ? localSettings.openaiTemperature.toFixed(1) 
                  : localSettings.temperature.toFixed(1)}
              </span>
            </div>
            <Slider 
              value={[localSettings.apiType === 'openai' ? localSettings.openaiTemperature : localSettings.temperature]}
              min={0}
              max={2}
              step={0.1}
              onValueChange={(value) => handleSettingChange(
                localSettings.apiType === 'openai' ? 'openaiTemperature' : 'temperature', 
                value[0]
              )}
            />
          </div>
          
          {/* 最大输出长度 */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium">最大输出长度</label>
              <span className="text-sm text-muted-foreground">
                {localSettings.apiType === 'openai' ? localSettings.openaiMaxTokens : localSettings.maxTokens}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Slider 
                value={[localSettings.apiType === 'openai' ? localSettings.openaiMaxTokens : localSettings.maxTokens]}
                min={256}
                max={localSettings.apiType === 'openai' ? 32768 : 1000000}
                step={256}
                onValueChange={(value) => handleSettingChange(
                  localSettings.apiType === 'openai' ? 'openaiMaxTokens' : 'maxTokens', 
                  value[0]
                )}
                className="flex-grow"
              />
              <Input
                type="number"
                min={256}
                max={localSettings.apiType === 'openai' ? 32768 : 1000000}
                value={localSettings.apiType === 'openai' ? localSettings.openaiMaxTokens : localSettings.maxTokens}
                onChange={(e) => handleSettingChange(
                  localSettings.apiType === 'openai' ? 'openaiMaxTokens' : 'maxTokens',
                  parseInt(e.target.value) || (localSettings.apiType === 'openai' ? 4096 : 65535)
                )}
                className="w-20 h-8"
              />
            </div>
          </div>
          
          {/* Top-K 设置 (仅Gemini) */}
          {localSettings.apiType === 'gemini' && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Top-K</label>
                <span className="text-sm text-muted-foreground">{localSettings.topK}</span>
              </div>
              <Slider 
                value={[localSettings.topK]}
                min={1}
                max={100}
                step={1}
                onValueChange={(value) => handleSettingChange('topK', value[0])}
              />
            </div>
          )}
          
          {/* Top-P 设置 */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium">Top-P</label>
              <span className="text-sm text-muted-foreground">
                {localSettings.apiType === 'openai' 
                  ? localSettings.openaiTopP.toFixed(2) 
                  : localSettings.topP.toFixed(2)}
              </span>
            </div>
            <Slider 
              value={[localSettings.apiType === 'openai' ? localSettings.openaiTopP : localSettings.topP]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={(value) => handleSettingChange(
                localSettings.apiType === 'openai' ? 'openaiTopP' : 'topP', 
                value[0]
              )}
            />
            </div>

            {/* OpenAI 专有参数 */}
            {localSettings.apiType === 'openai' && (
              <>
                {/* Frequency Penalty */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">频率惩罚</label>
                    <span className="text-sm text-muted-foreground">{localSettings.openaiFrequencyPenalty.toFixed(2)}</span>
                  </div>
                  <Slider 
                    value={[localSettings.openaiFrequencyPenalty]}
                    min={-2}
                    max={2}
                    step={0.1}
                    onValueChange={(value) => handleSettingChange('openaiFrequencyPenalty', value[0])}
                  />
                </div>

                {/* Presence Penalty */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">存在惩罚</label>
                    <span className="text-sm text-muted-foreground">{localSettings.openaiPresencePenalty.toFixed(2)}</span>
                  </div>
                  <Slider 
                    value={[localSettings.openaiPresencePenalty]}
                    min={-2}
                    max={2}
                    step={0.1}
                    onValueChange={(value) => handleSettingChange('openaiPresencePenalty', value[0])}
                  />
                </div>
              </>
            )}
            
            {/* 流式输出 */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">流式输出</label>
              <Switch 
                checked={localSettings.apiType === 'openai' ? localSettings.openaiStream : localSettings.enableStreaming}
                onCheckedChange={(checked) => handleSettingChange(
                  localSettings.apiType === 'openai' ? 'openaiStream' : 'enableStreaming', 
                  checked
                )}
              />
            </div>
          </TabsContent>
          
          {/* 界面设置标签页 */}
          <TabsContent value="ui" className="space-y-4 mt-0">
            <div className="space-y-3">
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">显示响应时间</label>
              <Switch 
                checked={localSettings.showResponseTime}
                onCheckedChange={(checked) => handleSettingChange('showResponseTime', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">显示字数统计</label>
              <Switch 
                checked={localSettings.showCharCount}
                onCheckedChange={(checked) => handleSettingChange('showCharCount', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">显示楼层数</label>
              <Switch 
                checked={localSettings.showMessageNumber}
                onCheckedChange={(checked) => handleSettingChange('showMessageNumber', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">启用引号高亮</label>
              <Switch 
                checked={localSettings.enableQuoteHighlight}
                onCheckedChange={(checked) => handleSettingChange('enableQuoteHighlight', checked)}
              />
            </div>
            
            {/* 引号高亮颜色选择 */}
            {localSettings.enableQuoteHighlight && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">引号高亮颜色</label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-5 h-5 rounded-full border" 
                      style={{ backgroundColor: localSettings.quoteHighlightColor }}
                    ></div>
                    <Input 
                      type="color" 
                      value={localSettings.quoteHighlightColor} 
                      onChange={(e) => handleSettingChange('quoteHighlightColor', e.target.value)}
                      className="w-8 h-8 p-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
            </div>
          </TabsContent>

          {/* 调试工具标签页 */}
          <TabsContent value="debug" className="space-y-4 mt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label className="text-sm font-medium">提示词调试</label>
                  <p className="text-xs text-muted-foreground">显示发送给AI的完整提示词内容</p>
                </div>
                <Switch 
                  checked={localSettings.enablePromptDebug}
                  onCheckedChange={(checked) => {
                    handleSettingChange('enablePromptDebug', checked);
                    // 启用时立即显示引导面板
                    if (checked && onShowDebugGuide) {
                      onShowDebugGuide();
                    }
                  }}
                />
              </div>
              
              {/* 快捷键设置 */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label className="text-sm font-medium">发送快捷键</label>
                  <p className="text-xs text-muted-foreground">自定义消息发送的快捷键组合</p>
                </div>
                <Select
                  value={localSettings.sendHotkey}
                  onValueChange={(value) => handleSettingChange('sendHotkey', value)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ctrlEnter">Ctrl+Enter</SelectItem>
                    <SelectItem value="enter">Enter</SelectItem>
                    <SelectItem value="shiftEnter">Shift+Enter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 快捷键说明 */}
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                <h4 className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-1">
                  ⌨️ 快捷键说明
                </h4>
                <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                  <p><strong>Ctrl+Enter:</strong> 传统模式 - Ctrl+Enter发送，Enter换行</p>
                  <p><strong>Enter:</strong> 快捷模式 - Enter发送，Shift+Enter换行</p>
                  <p><strong>Shift+Enter:</strong> 混合模式 - Shift+Enter发送，Enter换行</p>
                </div>
              </div>

              <Separator />

              {/* 调试工具提示 */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <h4 className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                  💡 关于提示词调试
                </h4>
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  启用后，在发送消息时会显示最终构建的提示词内容，包括系统提示词、角色描述、对话历史等，帮助您了解AI接收到的完整上下文。
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
} 