"use client";

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from '@/components/ui/use-toast';

interface UpdateNotificationProps {
  version?: string;
  releaseNotes?: string;
}

export function UpdateNotification({ 
  version = '新版本', 
  releaseNotes
}: UpdateNotificationProps) {
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // 监听PWA更新事件
    const handleUpdateFound = (event: Event) => {
      console.log('[PWA] Update notification triggered');
      setShowUpdateNotification(true);
      
      // 显示通知
      toast({
        title: '应用更新可用',
        description: releaseNotes || `有新版本可用，是否立即更新？`,
        action: (
          <Button 
            variant="outline"
            onClick={handleUpdate}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            立即更新
          </Button>
        )
      });
    };

    // 注册更新事件监听器
    document.addEventListener('pwaUpdateReady', handleUpdateFound);

    // 清理函数
    return () => {
      document.removeEventListener('pwaUpdateReady', handleUpdateFound);
    };
  }, [releaseNotes, toast]);

  // 处理用户点击更新按钮
  const handleUpdate = () => {
    // 调用全局更新函数
    if (typeof window !== 'undefined' && window.updatePWA) {
      window.updatePWA();
    } else {
      // 备选方案：直接刷新页面
      window.location.reload();
    }
    setShowUpdateNotification(false);
  };

  return null; // 这个组件不直接渲染内容，而是通过toast显示
}

// 为window添加updatePWA类型
declare global {
  interface Window {
    updatePWA?: () => void;
  }
} 