"use client";

import { useState, useEffect } from "react";
import { Settings, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useSettingsStore, usePromptPresetStore, useChatStore, useRegexStore, usePresetFolderStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { conversationStorage } from "@/lib/storage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    enableQuoteHighlight: uiSettings.enableQuoteHighlight,
    quoteHighlightColor: uiSettings.quoteHighlightColor,
  });
  
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

  // 更新设置
  const handleSettingChange = (key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));

    // 根据设置类型更新到对应的存储
    if (['model', 'temperature', 'maxTokens', 'topK', 'topP', 'enableStreaming'].includes(key)) {
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
    } else if (['showResponseTime', 'showCharCount', 'showMessageNumber', 'enableQuoteHighlight', 'quoteHighlightColor'].includes(key)) {
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
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <h3 className="font-medium">聊天设置</h3>
          
          {/* 预设选择 */}
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
            <div className="flex items-center space-x-2">
              <Slider 
                value={[localSettings.maxTokens]}
                min={256}
                max={1000000}
                step={256}
                onValueChange={(value) => handleSettingChange('maxTokens', value[0])}
                className="flex-grow"
              />
              <Input
                type="number"
                min={256}
                max={1000000}
                value={localSettings.maxTokens}
                onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value) || 65535)}
                className="w-20 h-8"
              />
            </div>
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
        </div>
      </PopoverContent>
    </Popover>
  );
} 