"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/lib/store";
import { HarmBlockThreshold, FontFamily } from "@/lib/types";
import Link from "next/link";

// 可用的Gemini模型列表
const AVAILABLE_MODELS = [
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro - 高级功能" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash - 快速响应" },
];

// 安全设置阈值选项
const SAFETY_THRESHOLD_OPTIONS = [
  { value: HarmBlockThreshold.BLOCK_NONE, label: "不阻止" },
  { value: HarmBlockThreshold.BLOCK_ONLY_HIGH, label: "仅阻止高风险" },
  { value: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE, label: "阻止中等及以上风险" },
  { value: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE, label: "阻止低等及以上风险" },
];

// 上下文控制模式选项
const CONTEXT_CONTROL_OPTIONS = [
  { value: "count", label: "基于消息数量" },
  { value: "token", label: "基于Token数量" },
];

// 字体选项
const FONT_FAMILY_OPTIONS = [
  { value: "system", label: "系统默认" },
  { value: "sans", label: "无衬线字体" },
  { value: "serif", label: "衬线字体" },
  { value: "mono", label: "等宽字体" },
  // 中文字体选项
  { value: "song", label: "宋体" },
  { value: "hei", label: "黑体" },
  { value: "kai", label: "楷体" },
  { value: "fangsong", label: "仿宋" },
  { value: "yahei", label: "微软雅黑" },
  { value: "pingfang", label: "苹方" },
  { value: "sourcehans", label: "思源黑体" }
];

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSettings } = useSettingsStore();
  const [apiKey, setApiKey] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [topK, setTopK] = useState(40);
  const [topP, setTopP] = useState(0.95);
  const [model, setModel] = useState("gemini-2.5-pro");
  const [enableStreaming, setEnableStreaming] = useState(true);
  const [contextWindow, setContextWindow] = useState(0);
  const [contextControlMode, setContextControlMode] = useState<'count' | 'token'>('token');
  const [safetySettings, setSafetySettings] = useState({
    hateSpeech: HarmBlockThreshold.BLOCK_NONE,
    harassment: HarmBlockThreshold.BLOCK_NONE,
    sexuallyExplicit: HarmBlockThreshold.BLOCK_NONE,
    dangerousContent: HarmBlockThreshold.BLOCK_NONE,
  });
  
  // 新增字体设置状态
  const [fontFamily, setFontFamily] = useState<FontFamily>('system');
  const [fontSize, setFontSize] = useState(100);
  const [chatFontSize, setChatFontSize] = useState(100);
  
  const [isSaved, setIsSaved] = useState(false);

  // 加载已保存的设置
  useEffect(() => {
    setApiKey(settings.apiKey || "");
    setTemperature(settings.temperature);
    setMaxTokens(settings.maxTokens);
    setTopK(settings.topK);
    setTopP(settings.topP);
    setModel(settings.model);
    setEnableStreaming(settings.enableStreaming);
    setSafetySettings(settings.safetySettings);
    setContextWindow(settings.contextWindow || 0);
    setContextControlMode(settings.contextControlMode || 'token');
    // 加载字体设置
    setFontFamily(settings.fontFamily || 'system');
    setFontSize(settings.fontSize || 100);
    setChatFontSize(settings.chatFontSize || 100);
  }, [settings]);

  // 字体映射对象，将字体类型映射到实际CSS字体值
  const fontFamilyMap: Record<FontFamily, string> = {
    system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    sans: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    serif: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    song: "'宋体', SimSun, 'Song', serif",
    hei: "'黑体', SimHei, 'Hei', sans-serif",
    kai: "'楷体', KaiTi, 'Kai', cursive",
    fangsong: "'仿宋', FangSong, 'Fang Song', serif",
    yahei: "'微软雅黑', 'Microsoft YaHei', 'Yahei', sans-serif",
    pingfang: "'PingFang SC', 'PingFang', 'Ping Fang', sans-serif",
    sourcehans: "'Source Han Sans CN', 'Source Han Sans', 'Source Han', sans-serif"
  };

  // 字体样式特征映射，为每种字体添加独特的视觉特征
  const fontStyleMap: Record<FontFamily, React.CSSProperties> = {
    system: {},
    sans: { letterSpacing: '-0.01em' },
    serif: { letterSpacing: '0.015em', fontVariant: 'common-ligatures' },
    mono: { fontVariantNumeric: 'tabular-nums' },
    song: { letterSpacing: '0.02em', lineHeight: '1.7' },
    hei: { letterSpacing: '-0.01em', lineHeight: '1.6', fontWeight: 500 },
    kai: { letterSpacing: '0.03em', lineHeight: '1.8', fontStyle: 'italic' },
    fangsong: { letterSpacing: '0.02em', lineHeight: '1.75' },
    yahei: { letterSpacing: '-0.01em', lineHeight: '1.6', fontWeight: 500 },
    pingfang: { letterSpacing: '-0.01em', lineHeight: '1.6' },
    sourcehans: { letterSpacing: '-0.01em', lineHeight: '1.5', fontWeight: 500 }
  };

  // 移动设备上的增强样式
  const getMobileEnhancedStyle = (family: FontFamily): React.CSSProperties => {
    const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    
    if (!isMobile) return {};
    
    const baseStyle = fontStyleMap[family] || {};
    
    switch(family) {
      case 'song':
        return {
          ...baseStyle,
          textIndent: '0.5em',
          borderLeft: '2px solid rgba(0, 0, 0, 0.1)',
          paddingLeft: '0.5em'
        };
      case 'kai':
        return {
          ...baseStyle,
          fontStyle: 'italic',
          textIndent: '0.5em'
        };
      case 'hei':
        return {
          ...baseStyle,
          fontWeight: 600
        };
      case 'fangsong':
        return {
          ...baseStyle,
          textIndent: '0.5em',
          borderLeft: '2px solid rgba(0, 0, 0, 0.05)',
          paddingLeft: '0.5em'
        };
      case 'serif':
        return {
          ...baseStyle,
          borderLeft: '2px solid rgba(0, 0, 0, 0.1)',
          paddingLeft: '0.5em',
          letterSpacing: '0.02em'
        };
      case 'mono':
        return {
          ...baseStyle,
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
          borderRadius: '2px',
          padding: '0 2px'
        };
      default:
        return baseStyle;
    }
  };

  // 在用户交互时立即应用字体设置到预览（不保存）
  const applyFontPreview = (family: FontFamily, globalSize: number, chatSize: number) => {
    // 预览时应用到整个页面，但不保存设置
    document.documentElement.style.setProperty('--font-family', fontFamilyMap[family]);
    document.documentElement.style.fontSize = `${globalSize}%`;
    document.documentElement.style.setProperty('--chat-font-size', `${chatSize}%`);
    // 直接应用到body以确保预览立即生效
    document.body.style.fontFamily = fontFamilyMap[family];
    // 添加数据属性用于调试
    document.documentElement.setAttribute('data-font-family', family);
    
    // 检测是否为移动设备
    const isMobile = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      document.documentElement.setAttribute('data-mobile', 'true');
      document.body.classList.add('mobile-font-enhanced');
      
      // 清除可能存在的字体类
      const fontClasses = ['font-song', 'font-hei', 'font-kai', 'font-fangsong', 'font-yahei', 'font-pingfang', 'font-sourcehans'];
      document.body.classList.remove(...fontClasses);
      
      // 添加当前字体类
      if (family !== 'system' && family !== 'sans' && family !== 'serif' && family !== 'mono') {
        document.body.classList.add(`font-${family}`);
      }
    }
    
    console.log('预览应用字体设置:', { family, fontValue: fontFamilyMap[family], globalSize, chatSize });
  };

  // 当字体设置发生变化时立即应用到预览
  useEffect(() => {
    applyFontPreview(fontFamily, fontSize, chatFontSize);
    // 这只是临时的，离开页面后会恢复到保存的设置
  }, [fontFamily, fontSize, chatFontSize]);

  // 更新安全设置
  const updateSafetySetting = (category: keyof typeof safetySettings, value: HarmBlockThreshold) => {
    setSafetySettings(prev => ({
      ...prev,
      [category]: value
    }));
  };

  // 保存设置
  const handleSave = () => {
    // 更新Zustand存储
    updateSettings({
      apiKey,
      temperature,
      maxTokens,
      topK,
      topP,
      model,
      enableStreaming,
      safetySettings,
      contextWindow,
      contextControlMode,
      // 保存字体设置
      fontFamily,
      fontSize,
      chatFontSize,
    });

    // 确保字体设置也被保存到localStorage以便更可靠地应用
    localStorage.setItem('fontFamily', fontFamily);
    localStorage.setItem('fontSize', String(fontSize));
    localStorage.setItem('chatFontSize', String(chatFontSize));

    // 强制应用字体设置
    const fontValue = fontFamilyMap[fontFamily];
    document.documentElement.style.setProperty('--font-family', fontValue);
    document.body.style.fontFamily = fontValue;
    document.documentElement.style.fontSize = `${fontSize}%`;
    document.documentElement.style.setProperty('--chat-font-size', `${chatFontSize}%`);
    document.documentElement.setAttribute('data-font-family', fontFamily);

    // 触发自定义事件通知其他组件字体设置已更改
    const event = new CustomEvent('fontsettingschanged', { 
      detail: { fontFamily, fontSize, chatFontSize } 
    });
    window.dispatchEvent(event);

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // 处理字体系列变更
  const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFontFamily = e.target.value as FontFamily;
    setFontFamily(newFontFamily);
  };

  // 处理全局字体大小变更
  const handleFontSizeChange = (value: number) => {
    const newSize = Math.max(50, Math.min(200, value || 100));
    setFontSize(newSize);
  };

  // 处理聊天字体大小变更
  const handleChatFontSizeChange = (value: number) => {
    const newSize = Math.max(50, Math.min(200, value || 100));
    setChatFontSize(newSize);
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">设置</h1>
        <p className="text-muted-foreground">配置您的AI对话平台</p>
      </header>

      <div className="space-y-8">
        {/* 外观设置 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">外观设置</h2>
          <p className="text-sm text-muted-foreground mb-4">
            调整应用程序的字体和文本大小，优化您的阅读体验。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 字体选择 */}
            <div className="space-y-2">
              <label htmlFor="fontFamily" className="text-sm font-medium">
                字体
              </label>
              <select
                id="fontFamily"
                value={fontFamily}
                onChange={handleFontFamilyChange}
                className="w-full p-2 border rounded-md bg-background"
              >
                {FONT_FAMILY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                选择应用程序使用的字体。
              </p>
            </div>
            
            {/* 全局字体大小 */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="fontSize" className="text-sm font-medium">
                  全局字体大小: {fontSize}%
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="fontSize"
                  type="range"
                  min="50"
                  max="200"
                  step="5"
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                  className="w-full"
                />
                <input
                  type="number"
                  min="50"
                  max="200"
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                  className="w-20 h-9 px-3 py-1 border rounded-md bg-background"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                调整整个应用程序的字体大小，影响所有界面元素。
              </p>
            </div>
            
            {/* 聊天消息字体大小 */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="chatFontSize" className="text-sm font-medium">
                  聊天消息字体大小: {chatFontSize}%
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="chatFontSize"
                  type="range"
                  min="50"
                  max="200"
                  step="5"
                  value={chatFontSize}
                  onChange={(e) => handleChatFontSizeChange(parseInt(e.target.value))}
                  className="w-full"
                />
                <input
                  type="number"
                  min="50"
                  max="200"
                  value={chatFontSize}
                  onChange={(e) => handleChatFontSizeChange(parseInt(e.target.value))}
                  className="w-20 h-9 px-3 py-1 border rounded-md bg-background"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                单独调整聊天界面中消息文本的大小，不影响其他界面元素。
              </p>
            </div>
            
            {/* 示例文本 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">预览效果</label>
              <div className="p-3 border rounded-md bg-background">
                <p className="mb-1" style={{
                  fontFamily: fontFamilyMap[fontFamily],
                  ...fontStyleMap[fontFamily],
                  ...getMobileEnhancedStyle(fontFamily)
                }}>
                  全局文本样式预览 (当前大小: {fontSize}%)
                </p>
                <div className="mt-2 p-3 bg-muted rounded-md" 
                     style={{
                       fontFamily: fontFamilyMap[fontFamily],
                       fontSize: `${chatFontSize}%`,
                       ...fontStyleMap[fontFamily],
                       ...getMobileEnhancedStyle(fontFamily)
                     }}>
                  <p className="mb-0">聊天消息文本样式预览 (当前大小: {chatFontSize}%)</p>
                </div>
                
                {/* 增强的字体对比预览 */}
                <div className="mt-4 border-t pt-3">
                  <h4 className="text-sm font-medium mb-2">字体对比</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {FONT_FAMILY_OPTIONS.map(option => (
                      <div 
                        key={option.value} 
                        className={`p-2 rounded-sm ${fontFamily === option.value ? 'bg-primary/10 border border-primary/30' : 'bg-background hover:bg-secondary/50'}`}
                        style={{
                          fontFamily: fontFamilyMap[option.value as FontFamily],
                          ...fontStyleMap[option.value as FontFamily],
                          ...getMobileEnhancedStyle(option.value as FontFamily)
                        }}
                      >
                        <p className="m-0">
                          {option.label} - 这是一段示例文本，用于展示不同字体的效果。
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                拖动调整条或更改字体时会实时预览效果，点击保存设置后生效。
              </p>
            </div>
          </div>
        </div>

        {/* API密钥设置 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">API密钥</h2>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              您需要提供一个有效的Gemini API密钥才能使用此应用
            </p>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入您的Gemini API密钥"
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground">
              <a
                href="https://ai.google.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                点击这里
              </a>{" "}
              获取Gemini API密钥
            </p>
          </div>
        </div>

        {/* 模型选择 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">模型选择</h2>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              选择要使用的Gemini模型
            </p>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full max-w-md p-2 border rounded-md bg-background"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 生成设置 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">生成设置</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 温度设置 */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="temperature" className="text-sm font-medium">
                  温度: {temperature}
                </label>
                <span className="text-sm text-muted-foreground">
                  {temperature < 0.3
                    ? "更精确"
                    : temperature > 0.7
                    ? "更有创意"
                    : "平衡"}
                </span>
              </div>
              <input
                id="temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                控制响应的随机性。较低的值使响应更加一致和确定，较高的值使响应更加多样化和创意。
              </p>
            </div>

            {/* 最大令牌数 */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="maxTokens" className="text-sm font-medium">
                  最大输出长度: {maxTokens}
                </label>
              </div>
              <input
                id="maxTokens"
                type="range"
                min="256"
                max="8192"
                step="256"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                控制生成响应的最大长度。较高的值允许更长的回复，但可能增加API成本。
              </p>
            </div>

            {/* Top-K 设置 */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="topK" className="text-sm font-medium">
                  Top-K: {topK}
                </label>
              </div>
              <input
                id="topK"
                type="range"
                min="1"
                max="100"
                step="1"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                每个步骤考虑的最高概率词汇数量。较低的值使输出更加聚焦，较高的值使输出更加多样化。
              </p>
            </div>

            {/* Top-P 设置 */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="topP" className="text-sm font-medium">
                  Top-P: {topP}
                </label>
              </div>
              <input
                id="topP"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                累积概率阈值。模型将考虑累积概率达到此阈值的词汇。较低的值使输出更加确定，较高的值使输出更加多样化。
              </p>
            </div>

            {/* 流式响应 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  id="streaming"
                  type="checkbox"
                  checked={enableStreaming}
                  onChange={(e) => setEnableStreaming(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="streaming" className="text-sm font-medium">
                  启用流式响应
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                启用后，AI回复将逐字显示，提供更自然的体验。禁用后，将在完成后一次性显示整个回复。
              </p>
            </div>
          </div>
        </div>

        {/* 上下文控制 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">上下文控制</h2>
          <p className="text-sm text-muted-foreground mb-4">
            控制模型在对话中保留的上下文数量。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 上下文窗口 */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="contextWindow" className="text-sm font-medium">
                  上下文窗口大小
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="contextWindow"
                  type="range"
                  min="0"
                  max="1000000"
                  step="1000"
                  value={contextWindow}
                  onChange={(e) => setContextWindow(parseInt(e.target.value))}
                  className="w-full"
                />
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  value={contextWindow}
                  onChange={(e) => setContextWindow(parseInt(e.target.value) || 0)}
                  className="w-24 h-9 px-3 py-1 border rounded-md bg-background"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                控制模型在对话中保留的上下文数量。0表示不限制。{contextControlMode === 'token' 
                 ? '较低的值能降低API成本和提高响应速度，但可能会丢失较早的上下文。'
                 : '较低的值会限制对话中保留的消息数量。'}
              </p>
            </div>

            {/* 上下文控制模式 */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="contextControlMode" className="text-sm font-medium">
                  上下文控制模式: {contextControlMode}
                </label>
              </div>
              <select
                id="contextControlMode"
                value={contextControlMode}
                onChange={(e) => setContextControlMode(e.target.value as 'count' | 'token')}
                className="w-full p-2 border rounded-md bg-background"
              >
                {CONTEXT_CONTROL_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                选择上下文控制是基于消息数量还是Token数量。
              </p>
            </div>
          </div>
        </div>

        {/* 安全设置 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">安全设置</h2>
          <p className="text-sm text-muted-foreground mb-4">
            控制模型对不同类型内容的过滤程度。选择"不阻止"将允许所有内容。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 仇恨言论 */}
            <div className="space-y-2">
              <label htmlFor="hateSpeech" className="text-sm font-medium">
                仇恨言论
              </label>
              <select
                id="hateSpeech"
                value={safetySettings.hateSpeech}
                onChange={(e) => updateSafetySetting('hateSpeech', e.target.value as HarmBlockThreshold)}
                className="w-full p-2 border rounded-md bg-background"
              >
                {SAFETY_THRESHOLD_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 骚扰内容 */}
            <div className="space-y-2">
              <label htmlFor="harassment" className="text-sm font-medium">
                骚扰内容
              </label>
              <select
                id="harassment"
                value={safetySettings.harassment}
                onChange={(e) => updateSafetySetting('harassment', e.target.value as HarmBlockThreshold)}
                className="w-full p-2 border rounded-md bg-background"
              >
                {SAFETY_THRESHOLD_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 色情内容 */}
            <div className="space-y-2">
              <label htmlFor="sexuallyExplicit" className="text-sm font-medium">
                色情内容
              </label>
              <select
                id="sexuallyExplicit"
                value={safetySettings.sexuallyExplicit}
                onChange={(e) => updateSafetySetting('sexuallyExplicit', e.target.value as HarmBlockThreshold)}
                className="w-full p-2 border rounded-md bg-background"
              >
                {SAFETY_THRESHOLD_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 危险内容 */}
            <div className="space-y-2">
              <label htmlFor="dangerousContent" className="text-sm font-medium">
                危险内容
              </label>
              <select
                id="dangerousContent"
                value={safetySettings.dangerousContent}
                onChange={(e) => updateSafetySetting('dangerousContent', e.target.value as HarmBlockThreshold)}
                className="w-full p-2 border rounded-md bg-background"
              >
                {SAFETY_THRESHOLD_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-between pt-4">
          <Button onClick={() => router.back()} variant="outline">
            返回
          </Button>
          <div className="flex items-center gap-4">
            {isSaved && (
              <span className="text-sm text-green-500">设置已保存</span>
            )}
            <Button onClick={handleSave}>保存设置</Button>
          </div>
        </div>
      </div>
    </div>
  );
} 