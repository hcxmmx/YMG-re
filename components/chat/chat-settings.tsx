"use client";

import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useSettingsStore } from "@/lib/store";
import { Input } from "@/components/ui/input";

// 可用的Gemini模型列表
const AVAILABLE_MODELS = [
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro - 高级功能" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash - 快速响应" },
];

export function ChatSettings() {
  const { settings, uiSettings, updateSettings, updateUISettings } = useSettingsStore();
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
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0">
          <Settings className="h-5 w-5" />
          <span className="sr-only">聊天设置</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <h3 className="font-medium">聊天设置</h3>
          
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