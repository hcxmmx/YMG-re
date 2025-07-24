"use client";

import { useEffect, useState, useCallback } from 'react';

type ViewMode = 'grid' | 'list';

/**
 * 响应式视图钩子函数，自动根据屏幕宽度切换视图模式
 * 
 * @param storageKey 用于存储视图模式的localStorage键名
 * @param breakpoint 视图模式切换的断点宽度（像素）
 * @param autoSwitch 是否在窗口尺寸变化时自动切换视图（默认为true）
 * @returns [viewMode, setViewMode] - 视图模式状态和更新函数
 */
export function useResponsiveView(
  storageKey: string, 
  breakpoint = 640,
  autoSwitch = true
): [ViewMode, (mode: ViewMode) => void] {
  // 默认使用网格视图，后面会根据条件更新
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [initialized, setInitialized] = useState(false);

  // 根据窗口宽度获取适当的视图模式
  const getAppropriateViewMode = useCallback((): ViewMode => {
    return window.innerWidth < breakpoint ? 'list' : 'grid';
  }, [breakpoint]);

  // 用户显式选择视图模式时调用此函数
  const updateViewMode = useCallback((mode: ViewMode) => {
    if (typeof window === 'undefined') return;
    
    // 更新状态
    setViewMode(mode);
    
    // 保存到localStorage，带上标记表示这是用户手动选择的
    localStorage.setItem(storageKey, mode);
    localStorage.setItem(`${storageKey}-user-selected`, 'true');
  }, [storageKey]);

  // 处理窗口大小变化
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 根据屏幕尺寸和用户选择初始化视图模式
    const initializeViewMode = () => {
      const savedViewMode = localStorage.getItem(storageKey) as ViewMode | null;
      const userSelected = localStorage.getItem(`${storageKey}-user-selected`) === 'true';
      
      if (savedViewMode && (savedViewMode === 'grid' || savedViewMode === 'list')) {
        // 如果有保存的视图模式，先使用它
        setViewMode(savedViewMode);
      } else {
        // 否则根据屏幕宽度自动设置视图模式
        const appropriateMode = getAppropriateViewMode();
        setViewMode(appropriateMode);
        localStorage.setItem(storageKey, appropriateMode);
      }
      
      setInitialized(true);
    };
    
    // 仅在组件首次挂载时初始化
    if (!initialized) {
      initializeViewMode();
    }
    
    // 处理窗口大小变化
    const handleResize = () => {
      if (!autoSwitch) return;
      
      // 检查用户是否手动选择了视图模式
      const userSelected = localStorage.getItem(`${storageKey}-user-selected`) === 'true';
      
      // 如果用户没有手动选择，则自动切换视图模式
      if (!userSelected) {
        const appropriateMode = getAppropriateViewMode();
        setViewMode(appropriateMode);
        localStorage.setItem(storageKey, appropriateMode);
      }
    };
    
    // 监听窗口大小变化
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [storageKey, breakpoint, initialized, getAppropriateViewMode, autoSwitch]);

  return [viewMode, updateViewMode];
} 