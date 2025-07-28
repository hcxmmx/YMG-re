"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface PWAInstallPromptProps {
  className?: string;
}

export function PWAInstallPrompt({ className = "" }: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 检查是否为iOS设备
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // 检查应用是否已经以PWA模式安装
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // 阻止Chrome 67及更早版本自动显示安装提示
      e.preventDefault();
      // 保存事件，以便稍后触发
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // 监听beforeinstallprompt事件
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 清理函数
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // 显示安装提示
    deferredPrompt.prompt();

    // 等待用户响应提示
    const { outcome } = await deferredPrompt.userChoice;
    
    // 无论用户的选择如何，我们都不再需要事件了
    setDeferredPrompt(null);
    
    if (outcome === 'accepted') {
      console.log('用户接受了安装');
      setIsInstallable(false);
      setIsInstalled(true);
    } else {
      console.log('用户拒绝了安装');
    }
  };

  const toggleIOSInstructions = () => {
    setShowIOSInstructions(!showIOSInstructions);
  };

  if (isInstalled) {
    return (
      <div className={`rounded-lg bg-muted p-4 ${className}`}>
        <p className="text-sm font-medium">此应用已安装到您的设备上。</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-2">将应用安装到设备</h3>
      
      {!isIOS && isInstallable ? (
        <div className="space-y-2">
          <p className="text-sm">将此应用安装到您的主屏幕，以便离线使用和更好的体验。</p>
          <Button onClick={handleInstallClick} variant="outline" className="w-full sm:w-auto">
            安装应用
          </Button>
        </div>
      ) : isIOS ? (
        <div className="space-y-2">
          <p className="text-sm">在iOS设备上，您需要使用Safari的"添加到主屏幕"功能来安装此应用。</p>
          <Button onClick={toggleIOSInstructions} variant="outline" className="w-full sm:w-auto">
            {showIOSInstructions ? "隐藏安装说明" : "显示安装说明"}
          </Button>
          
          {showIOSInstructions && (
            <div className="mt-4 p-3 bg-muted rounded-md text-sm space-y-2">
              <p>1. 在Safari中打开此应用</p>
              <p>2. 点击底部的"分享"按钮 <span className="inline-block px-2">⎋</span></p>
              <p>3. 滚动并点击"添加到主屏幕"</p>
              <p>4. 点击"添加"确认</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm">您的浏览器支持安装此应用，但尚未触发安装提示。</p>
          <p className="text-sm text-muted-foreground">
            多次访问此网站或使用Chrome/Edge浏览器可能会触发安装提示。
          </p>
        </div>
      )}
    </div>
  );
} 