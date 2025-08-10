"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/lib/store";
import { FontFamily } from "@/lib/types";
import Link from "next/link";
import { DataExportImport, ExportOptions } from "@/components/ui/data-export-import";
import { exportData, importData, downloadFile } from "@/lib/dataUtils";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PWAInstallPrompt } from "@/components/ui/pwa-install-prompt";
import { Switch } from "@/components/ui/switch";

import { GEMINI_MODEL_OPTIONS } from "@/lib/config/gemini-config";

// 使用统一的模型配置
const AVAILABLE_MODELS = GEMINI_MODEL_OPTIONS;



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
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [topK, setTopK] = useState(40);
  const [topP, setTopP] = useState(0.95);
  const [model, setModel] = useState("gemini-2.5-pro");
  const [enableStreaming, setEnableStreaming] = useState(true);
  const [contextWindow, setContextWindow] = useState(0);
  const [contextControlMode, setContextControlMode] = useState<'count' | 'token'>('token');
  
  // 新增字体设置状态
  const [fontFamily, setFontFamily] = useState<FontFamily>('system');
  const [fontSize, setFontSize] = useState(100);
  const [chatFontSize, setChatFontSize] = useState(100);
  
  // PWA自动更新设置
  const [pwaAutoUpdate, setPwaAutoUpdate] = useState(false);
  
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("appearance");
  const [isMobile, setIsMobile] = useState(false);
  
  // 导入导出状态
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // 加载已保存的设置
  useEffect(() => {
    setApiKey(settings.apiKey || "");
    setTemperature(settings.temperature);
    setMaxTokens(settings.maxTokens);
    setTopK(settings.topK);
    setTopP(settings.topP);
    setModel(settings.model);
    setEnableStreaming(settings.enableStreaming);
    setContextWindow(settings.contextWindow || 0);
    setContextControlMode(settings.contextControlMode || 'token');
    // 加载字体设置
    setFontFamily(settings.fontFamily || 'system');
    
    // 设置字体大小，如果是移动设备且没有保存过设置，则使用80%
    if (window.innerWidth < 768 && !localStorage.getItem('fontSize')) {
      setFontSize(80);
    } else {
      setFontSize(settings.fontSize || 100);
    }
    
    setChatFontSize(settings.chatFontSize || 100);
    
    // 加载PWA设置
    try {
      const autoUpdatePref = localStorage.getItem('pwa-auto-update');
      setPwaAutoUpdate(autoUpdatePref === 'true');
    } catch (e) {
      console.error('Failed to load PWA settings:', e);
    }
  }, [settings]);

  // 检测屏幕尺寸，决定使用哪种布局
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // 初始检测
    checkScreenSize();
    
    // 添加窗口尺寸变化监听
    window.addEventListener('resize', checkScreenSize);
    
    // 清理函数
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 当屏幕尺寸变化时，为移动设备设置默认字体大小
  useEffect(() => {
    if (isMobile && !settings.fontSize) {
      // 仅在初次加载且没有用户保存的设置时设置默认值
      setFontSize(80);
    }
  }, [isMobile, settings.fontSize]);

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
      contextWindow,
      contextControlMode,
      // 保存字体设置
      fontFamily,
      fontSize,
      chatFontSize,
    });

    // 确保字体设置也被保存到localStorage
    localStorage.setItem('fontFamily', fontFamily);
    localStorage.setItem('fontSize', String(fontSize));
    localStorage.setItem('chatFontSize', String(chatFontSize));
    
    // 保存PWA自动更新设置
    localStorage.setItem('pwa-auto-update', String(pwaAutoUpdate));

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

  // 处理数据导出
  const handleExport = async (options: ExportOptions) => {
    try {
      setIsExporting(true);
      const blob = await exportData(options);
      
      // 生成文件名，格式：AI对话平台数据备份_YYYY-MM-DD.json
      const date = new Date();
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `AI对话平台数据备份_${dateString}.json`;
      
      // 下载文件
      downloadFile(blob, filename);
      
      toast({
        title: "导出成功",
        description: "数据已成功导出",
      });
    } catch (error) {
      console.error("导出失败:", error);
      toast({
        title: "导出失败",
        description: error instanceof Error ? error.message : "导出数据时发生未知错误",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // 处理数据导入
  const handleImport = async (file: File) => {
    try {
      setIsImporting(true);
      const result = await importData(file);
      
      if (result.success) {
        toast({
          title: "导入成功",
          description: result.message,
        });
        
        // 重新加载页面以应用导入的设置
        window.location.reload();
      } else {
        toast({
          title: "导入失败",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("导入失败:", error);
      toast({
        title: "导入失败",
        description: error instanceof Error ? error.message : "导入数据时发生未知错误",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  // 渲染外观设置内容
  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">外观设置</h2>
        <p className="text-sm text-muted-foreground">调整应用程序的字体和文本大小</p>
      </div>

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
            选择应用程序使用的字体
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
        </div>
        
        {/* 简化的字体预览 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">预览效果</label>
          <div className="p-3 border rounded-md bg-background">
            <p style={{
              fontFamily: fontFamilyMap[fontFamily],
              ...fontStyleMap[fontFamily],
            }}>
              普通文本 ({fontSize}%)
            </p>
            <div className="mt-2 p-2 bg-muted rounded-md" 
                 style={{
                   fontFamily: fontFamilyMap[fontFamily],
                   fontSize: `${chatFontSize}%`,
                 }}>
              <p className="mb-0">聊天文本 ({chatFontSize}%)</p>
            </div>
            
            {/* 简化的字体样式比较 */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {FONT_FAMILY_OPTIONS.slice(0, 6).map(option => (
                <div 
                  key={option.value} 
                  className={`p-1 rounded-sm ${fontFamily === option.value ? 'bg-primary/10 border border-primary/30' : ''}`}
                  style={{
                    fontFamily: fontFamilyMap[option.value as FontFamily],
                  }}
                >
                  {option.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染API设置内容
  const renderApiSettings = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">API密钥</h2>
        <p className="text-sm text-muted-foreground">
          提供Gemini API密钥以使用此应用
        </p>
      </div>

      <div className="space-y-4">
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
        
        {/* 应用安装 */}
        <div className="mt-8 pt-4 border-t">
          <h3 className="text-lg font-semibold mb-2">应用安装</h3>
          <p className="text-sm text-muted-foreground mb-4">
            将此应用安装到您的设备，以获得离线使用体验和更好的性能
          </p>
          <PWAInstallPrompt className="mt-2" />
          
          {/* PWA自动更新设置 */}
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="font-medium">PWA自动更新</p>
              <p className="text-xs text-muted-foreground">
                有更新时自动应用，无需手动确认
              </p>
            </div>
            <Switch 
              checked={pwaAutoUpdate}
              onCheckedChange={setPwaAutoUpdate}
            />
          </div>
        </div>
        
        {/* 数据备份与恢复 */}
        <div className="mt-8 pt-4 border-t">
          <h3 className="text-lg font-semibold mb-2">数据备份与恢复</h3>
          <p className="text-sm text-muted-foreground mb-4">
            导出或导入您的应用数据
          </p>
          
          <DataExportImport 
            onExport={handleExport}
            onImport={handleImport}
            isExporting={isExporting}
            isImporting={isImporting}
          />
        </div>
      </div>
    </div>
  );

  // 渲染模型设置内容
  const renderModelSettings = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">模型设置</h2>
        <p className="text-sm text-muted-foreground">
          选择模型和生成参数
        </p>
      </div>

      <div className="space-y-6">
        {/* 模型选择 */}
        <div className="space-y-2">
          <label htmlFor="model" className="text-sm font-medium">模型</label>
          <select
            id="model"
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
          </div>

          {/* 最大令牌数 */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label htmlFor="maxTokens" className="text-sm font-medium">
                最大输出长度: {maxTokens}
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="maxTokens"
                type="range"
                min="256"
                max="1000000"
                step="256"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full"
              />
              <input
                type="number"
                min="256"
                max="1000000"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value) || 65535)}
                className="w-24 h-9 px-3 py-1 border rounded-md bg-background"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              较大的值可能会导致响应时间增加
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
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染上下文设置内容
  const renderContextSettings = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">上下文控制</h2>
        <p className="text-sm text-muted-foreground">
          控制模型在对话中保留的上下文数量
        </p>
      </div>

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
            0表示不限制。{contextControlMode === 'token' 
              ? '较低的值能降低API成本和提高响应速度。'
              : '较低的值会限制保留的消息数量。'}
          </p>
        </div>

        {/* 上下文控制模式 */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label htmlFor="contextControlMode" className="text-sm font-medium">
              上下文控制模式
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
        </div>
      </div>
    </div>
  );



  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">设置</h1>
        <p className="text-muted-foreground">配置您的AI对话平台</p>
      </header>

      {/* 使用不同的布局方式，基于屏幕尺寸 */}
      {isMobile ? (
        // 移动设备上使用手风琴式折叠菜单
        <Accordion type="single" collapsible className="space-y-2">
          <AccordionItem value="appearance">
            <AccordionTrigger className="text-lg font-medium">外观</AccordionTrigger>
            <AccordionContent>{renderAppearanceSettings()}</AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="api">
            <AccordionTrigger className="text-lg font-medium">API设置</AccordionTrigger>
            <AccordionContent>{renderApiSettings()}</AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="model">
            <AccordionTrigger className="text-lg font-medium">模型设置</AccordionTrigger>
            <AccordionContent>{renderModelSettings()}</AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="context">
            <AccordionTrigger className="text-lg font-medium">上下文控制</AccordionTrigger>
            <AccordionContent>{renderContextSettings()}</AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        // 桌面设备上使用标签式布局
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="appearance">外观</TabsTrigger>
            <TabsTrigger value="api">API设置</TabsTrigger>
            <TabsTrigger value="model">模型设置</TabsTrigger>
            <TabsTrigger value="context">上下文</TabsTrigger>
          </TabsList>
          
          <TabsContent value="appearance">{renderAppearanceSettings()}</TabsContent>
          <TabsContent value="api">{renderApiSettings()}</TabsContent>
          <TabsContent value="model">{renderModelSettings()}</TabsContent>
          <TabsContent value="context">{renderContextSettings()}</TabsContent>
        </Tabs>
      )}

      {/* 保存按钮 - 始终显示在底部 */}
      <div className="flex justify-between pt-8 mt-6 border-t">
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
  );
} 