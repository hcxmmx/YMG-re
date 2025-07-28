"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { useState, useEffect, createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { useSettingsStore } from "@/lib/store";
import { Toaster } from "@/components/ui/toast";
import Script from "next/script";
import { UpdateNotification } from "@/components/ui/update-notification";

const inter = Inter({ subsets: ["latin"] });

// 创建导航栏上下文
export const NavbarContext = createContext({
  isNavbarVisible: true,
  toggleNavbar: () => {},
  setNavbarVisible: (visible: boolean) => {}
});

// 使用上下文的钩子
export const useNavbar = () => useContext(NavbarContext);

// 应用版本号，每次更新后修改
const APP_VERSION = '1.0.0';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const pathname = usePathname();
  const { settings, uiSettings } = useSettingsStore();
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  
  // 当路由变化时，重置导航栏为可见
  useEffect(() => {
    setIsNavbarVisible(true);
  }, [pathname]);
  
  // 检测是否为移动设备
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      setIsMobileDevice(isMobile || window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // 初始化localStorage中的UI设置值
  useEffect(() => {
    // 确保只在客户端执行
    if (typeof window !== 'undefined') {
      localStorage.setItem('showResponseTime', String(uiSettings.showResponseTime));
      localStorage.setItem('showCharCount', String(uiSettings.showCharCount));
      localStorage.setItem('showMessageNumber', String(uiSettings.showMessageNumber));
    }
  }, [uiSettings]);

  // 动态设置视口高度，解决iOS PWA键盘问题
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 设置CSS变量--vh为视口高度的1%
      const setVhVariable = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      
      // 初始设置
      setVhVariable();
      
      // 监听窗口大小变化（包括键盘弹出）
      window.addEventListener('resize', setVhVariable);
      window.addEventListener('orientationchange', setVhVariable);
      
      return () => {
        window.removeEventListener('resize', setVhVariable);
        window.removeEventListener('orientationchange', setVhVariable);
      };
    }
  }, []);

  // 应用字体设置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 获取字体设置
      const fontFamily = settings.fontFamily || localStorage.getItem('fontFamily') || 'system';
      const fontSize = settings.fontSize || Number(localStorage.getItem('fontSize')) || 100;
      const chatFontSize = settings.chatFontSize || Number(localStorage.getItem('chatFontSize')) || 100;
      
      // 映射字体系列到实际CSS值
      const fontFamilyMap: Record<string, string> = {
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
      
      // 应用字体设置到文档根元素
      document.documentElement.style.setProperty('--font-family', fontFamilyMap[fontFamily] || fontFamilyMap.system);
      document.documentElement.style.fontSize = `${fontSize}%`;
      document.documentElement.style.setProperty('--chat-font-size', `${chatFontSize}%`);
      document.documentElement.setAttribute('data-font-family', fontFamily);
      
      // 为移动设备添加特殊标记，以便CSS可以应用特定样式
      if (isMobileDevice) {
        document.documentElement.setAttribute('data-mobile', 'true');
      } else {
        document.documentElement.removeAttribute('data-mobile');
      }
      
      // 直接应用字体到body以确保全局生效
      document.body.style.fontFamily = fontFamilyMap[fontFamily] || fontFamilyMap.system;
      
      // 如果是移动设备，为特定字体添加额外的样式特征
      if (isMobileDevice) {
        document.body.classList.add('mobile-font-enhanced');
        
        // 清除可能存在的字体类
        const fontClasses = ['font-song', 'font-hei', 'font-kai', 'font-fangsong', 'font-yahei', 'font-pingfang', 'font-sourcehans'];
        document.body.classList.remove(...fontClasses);
        
        // 添加当前字体类
        if (fontFamily !== 'system' && fontFamily !== 'sans' && fontFamily !== 'serif' && fontFamily !== 'mono') {
          document.body.classList.add(`font-${fontFamily}`);
        }
      } else {
        document.body.classList.remove('mobile-font-enhanced');
      }
    }
  }, [settings.fontFamily, settings.fontSize, settings.chatFontSize, isMobileDevice]);
  
  const toggleNavbar = () => {
    setIsNavbarVisible(prev => !prev);
  };
  
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="云妙馆" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/icon-956x956.png" />
        <link rel="apple-touch-icon" href="/icons/icon-956x956.png" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NavbarContext.Provider value={{ 
            isNavbarVisible, 
            toggleNavbar, 
            setNavbarVisible: setIsNavbarVisible 
          }}>
            <div className="flex flex-col dvh-fix">
              <div 
                className={`transition-all duration-300 ease-in-out ${
                  isNavbarVisible ? "translate-y-0" : "-translate-y-full h-0 overflow-hidden"
                }`}
              >
                <Header />
              </div>
              <main className={`flex-1 transition-all duration-300 ease-in-out`}>{children}</main>
            </div>
          </NavbarContext.Provider>
          <Toaster />
          <UpdateNotification 
            version={APP_VERSION}
            releaseNotes="应用已更新到新版本，包含性能改进和错误修复。" 
          />
          <Script src="/pwa-update.js" strategy="afterInteractive" />
        </ThemeProvider>
      </body>
    </html>
  );
} 