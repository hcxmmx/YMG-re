"use client";

import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useSettingsStore, usePromptPresetStore, useChatStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { conversationStorage } from "@/lib/storage";

// 可用的Gemini模型列表
const AVAILABLE_MODELS = [
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro - 高级功能" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash - 快速响应" },
];

export function ChatSettings() {
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
  });
  
  // 是否是第一次加载
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // 预设应用状态
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  // 预设加载状态
  const [presetsLoaded, setPresetsLoaded] = useState(false);

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
    }));
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

  // 更新设置
  const handleSettingChange = (key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));

    // 根据设置类型更新到对应的存储
    if (['model', 'temperature', 'maxTokens', 'topK', 'topP', 'enableStreaming'].includes(key)) {
      updateSettings({ [key]: value });
    } else if (['showResponseTime', 'showCharCount', 'showMessageNumber'].includes(key)) {
      updateUISettings({ [key]: value });
    }
    
    // 取消预设选择（因为用户手动修改了设置）
    if (!isInitialLoad && key !== 'currentPresetId') {
      usePromptPresetStore.getState().setCurrentPresetId(null);
    }
  };
  
  // 处理预设切换
  const handlePresetChange = async (presetId: string) => {
    // 如果已经在应用预设中，忽略新的请求
    if (isApplying) return;
    
    if (!presetId) {
      try {
        setIsApplying(true);
        
        // 清除预设时，重置为默认值
        // 先更新系统提示词为默认值
        const chatStore = useChatStore.getState();
        chatStore.setSystemPrompt('你是一个友好、乐于助人的AI助手。');
        const defaultSystemPrompt = '你是一个友好、乐于助人的AI助手。';
        
        // 更新设置为默认值
        const settingsStore = useSettingsStore.getState();
        const defaultSettings = {
          temperature: 0.7,
          maxTokens: 1024,
          topK: 40,
          topP: 0.95,
        };
        settingsStore.updateSettings(defaultSettings);
        
        // 更新预设ID
        usePromptPresetStore.getState().setCurrentPresetId(null);
        
        // 重要修复：确保当前会话的系统提示词也被保存到IndexedDB
        const { currentConversationId, currentMessages, currentTitle } = chatStore;
        
        // 如果有当前会话，同步更新到IndexedDB
        if (currentConversationId) {
          // 获取当前会话的分支信息
          const conversation = await conversationStorage.getConversation(currentConversationId);
          if (conversation) {
            console.log("同步更新当前会话的默认系统提示词到IndexedDB");
            await conversationStorage.saveConversation(
              currentConversationId,
              currentTitle,
              currentMessages,
              defaultSystemPrompt, // 使用默认系统提示词
              conversation.branches || [],
              conversation.currentBranchId
            );
          }
        }
        
        // 添加延迟，确保状态已更新
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setApplySuccess(true);
        setTimeout(() => setApplySuccess(false), 2000);
      } catch (error) {
        console.error("重置预设失败:", error);
      } finally {
        setIsApplying(false);
      }
      return;
    }
    
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
      
      // 添加额外延迟，确保状态已稳定
      await new Promise(resolve => setTimeout(resolve, 200));
      
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
            currentPresetId ? "text-primary" : ""
          )}
        >
          <Settings className="h-5 w-5" />
          <span className="sr-only">聊天设置</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <h3 className="font-medium">聊天设置</h3>
          
          {/* 预设选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">预设</label>
            <div className="relative">
              <select 
                className={cn(
                  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  isApplying ? "opacity-50" : ""
                )}
                value={currentPresetId || ""}
                onChange={(e) => handlePresetChange(e.target.value)}
                disabled={isApplying || !presetsLoaded}
              >
                <option value="">-- 无预设（自定义设置）--</option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
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
          
          <Separator />
          
          {/* 模型选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">模型</label>
            <select 
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={localSettings.model}
              onChange={(e) => handleSettingChange('model', e.target.value)}
            >
              {AVAILABLE_MODELS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* 温度设置 */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium">温度</label>
              <span className="text-sm text-muted-foreground">{localSettings.temperature.toFixed(1)}</span>
            </div>
            <Slider 
              value={[localSettings.temperature]}
              min={0}
              max={2}
              step={0.1}
              onValueChange={(value) => handleSettingChange('temperature', value[0])}
            />
          </div>
          
          {/* 最大输出长度 */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium">最大输出长度</label>
              <span className="text-sm text-muted-foreground">{localSettings.maxTokens}</span>
            </div>
            <Slider 
              value={[localSettings.maxTokens]}
              min={256}
              max={8192}
              step={256}
              onValueChange={(value) => handleSettingChange('maxTokens', value[0])}
            />
          </div>
          
          {/* Top-K 设置 */}
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
          
          {/* Top-P 设置 */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium">Top-P</label>
              <span className="text-sm text-muted-foreground">{localSettings.topP.toFixed(2)}</span>
            </div>
            <Slider 
              value={[localSettings.topP]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={(value) => handleSettingChange('topP', value[0])}
            />
          </div>
          
          {/* 开关选项 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">流式输出</label>
              <Switch 
                checked={localSettings.enableStreaming}
                onCheckedChange={(checked) => handleSettingChange('enableStreaming', checked)}
              />
            </div>
            
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
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 