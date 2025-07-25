"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"
import { useSettingsStore } from "@/lib/store"
import { useEffect } from "react"
import { FontFamily } from "@/lib/types"
import { usePathname } from 'next/navigation'

// 字体映射对象，将字体类型映射到实际CSS字体值
const fontFamilyMap: Record<FontFamily, string> = {
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  sans: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  serif: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
};

// 加载从localStorage获取字体设置的函数
const loadFontSettingsFromLocalStorage = () => {
  // 仅在客户端执行
  if (typeof window === 'undefined') return null;
  
  try {
    // 尝试从localStorage直接获取
    const fontFamily = localStorage.getItem('fontFamily') as FontFamily || 'system';
    const fontSize = parseInt(localStorage.getItem('fontSize') || '100');
    const chatFontSize = parseInt(localStorage.getItem('chatFontSize') || '100');
    
    // 尝试从zustand持久化存储获取
    const settingsStr = localStorage.getItem('ai-roleplay-settings');
    let settingsFromStore = {};
    if (settingsStr) {
      try {
        const parsed = JSON.parse(settingsStr);
        if (parsed.state && parsed.state.settings) {
          settingsFromStore = {
            fontFamily: parsed.state.settings.fontFamily,
            fontSize: parsed.state.settings.fontSize,
            chatFontSize: parsed.state.settings.chatFontSize,
          };
        }
      } catch (e) {
        console.error('解析存储的设置失败', e);
      }
    }
    
    return {
      // 优先使用直接存储的值，其次使用zustand存储的值，最后使用默认值
      fontFamily: fontFamily || (settingsFromStore as any).fontFamily || 'system',
      fontSize: !isNaN(fontSize) ? fontSize : (settingsFromStore as any).fontSize || 100,
      chatFontSize: !isNaN(chatFontSize) ? chatFontSize : (settingsFromStore as any).chatFontSize || 100,
    };
  } catch (e) {
    console.error('从localStorage加载字体设置失败', e);
    return {
      fontFamily: 'system',
      fontSize: 100,
      chatFontSize: 100,
    };
  }
};

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const { settings, updateSettings } = useSettingsStore();
  const pathname = usePathname();
  const isSettingsPage = pathname === '/settings';
  
  // 应用字体设置到HTML元素
  useEffect(() => {
    // 直接应用字体设置
    const applyFontSettings = () => {
      // 首先尝试从settings获取
      let fontFamily = settings.fontFamily || 'system';
      let fontSize = settings.fontSize || 100;
      let chatFontSize = settings.chatFontSize || 100;
      
      // 如果settings中没有值，尝试从localStorage直接获取
      const localSettings = loadFontSettingsFromLocalStorage();
      if (localSettings) {
        fontFamily = fontFamily || localSettings.fontFamily;
        fontSize = fontSize || localSettings.fontSize;
        chatFontSize = chatFontSize || localSettings.chatFontSize;
        
        // 如果store中没有这些值但localStorage有，更新store
        if (!settings.fontFamily || !settings.fontSize || !settings.chatFontSize) {
          // 异步更新store
          setTimeout(() => {
            updateSettings({
              fontFamily: fontFamily as FontFamily,
              fontSize,
              chatFontSize
            });
          }, 0);
        }
      }
      
      // 设置字体系列
      document.documentElement.style.setProperty(
        '--font-family', 
        fontFamilyMap[fontFamily as FontFamily] || fontFamilyMap.system
      );
      
      // 设置全局字体大小
      document.documentElement.style.fontSize = `${fontSize}%`;
      
      // 为聊天字体大小设置CSS变量
      document.documentElement.style.setProperty(
        '--chat-font-size', 
        `${chatFontSize}%`
      );
      
      console.log('已应用字体设置:', { fontFamily, fontSize, chatFontSize });
    };
    
    // 检测页面路径变化
    // 当从设置页面离开时，确保应用保存的设置
    if (!isSettingsPage) {
      applyFontSettings();
    }
    
    // 监听localStorage的变化以重新应用设置
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'fontFamily' || e.key === 'fontSize' || e.key === 'chatFontSize' || e.key === 'ai-roleplay-settings') {
        console.log('检测到字体设置变化:', e.key);
        // 只有当不在设置页面时，才自动应用存储的设置
        // 这样可以避免与设置页面的实时预览冲突
        if (!isSettingsPage) {
          applyFontSettings();
        }
      }
    };
    
    // 添加事件监听
    window.addEventListener('storage', handleStorageChange);
    
    // 定期同步字体设置（作为备份机制）
    // 只有当不在设置页面时才进行同步
    const syncInterval = !isSettingsPage ? setInterval(applyFontSettings, 5000) : null;
    
    // 初始应用，但在设置页面中不应用（因为设置页面有自己的预览逻辑）
    if (!isSettingsPage) {
      applyFontSettings();
    }
    
    // 清理函数
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [settings, updateSettings, isSettingsPage]);
  
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
} 