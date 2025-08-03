"use client";

import { useState, useEffect } from "react";
import { apiKeyStorage } from "@/lib/storage";
import { fallbackStorage } from "@/lib/fallbackStorage";

interface DebugInfo {
  environment: string;
  useFallback: boolean;
  totalKeys: number;
  enabledKeys: number;
  activeKey: string | null;
  rotationEnabled: boolean;
  lastApiCall: string;
  lastCountUpdate: string;
  indexedDBAvailable: boolean;
  localStorageAvailable: boolean;
  errors: string[];
}

interface ApiKeyDebugPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export function ApiKeyDebugPanel({ isVisible, onClose }: ApiKeyDebugPanelProps) {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    environment: 'unknown',
    useFallback: false,
    totalKeys: 0,
    enabledKeys: 0,
    activeKey: null,
    rotationEnabled: false,
    lastApiCall: '从未调用',
    lastCountUpdate: '从未更新',
    indexedDBAvailable: false,
    localStorageAvailable: false,
    errors: []
  });

  const updateDebugInfo = async () => {
    const errors: string[] = [];
    
    try {
      // 检测环境
      const environment = typeof window === 'undefined' ? 'server' : 'client';
      
      // 检测存储可用性
      const indexedDBAvailable = !!(typeof window !== 'undefined' && window.indexedDB);
      const localStorageAvailable = !!(typeof window !== 'undefined' && window.localStorage);
      
      // 检测是否使用后备存储
      const useFallback = fallbackStorage.shouldUseFallback();
      
      let totalKeys = 0;
      let enabledKeys = 0;
      let activeKey: string | null = null;
      let rotationEnabled = false;
      
      if (useFallback) {
        // 使用后备存储
        try {
          const keys = fallbackStorage.getApiKeys();
          const settings = fallbackStorage.getSettings();
          const active = fallbackStorage.getActiveApiKey();
          
          totalKeys = keys.length;
          enabledKeys = keys.filter(k => k.enabled).length;
          activeKey = active ? `${active.name} (${active.usageCount || 0}次)` : null;
          rotationEnabled = settings.rotationEnabled;
        } catch (error) {
          errors.push(`后备存储错误: ${error}`);
        }
      } else {
        // 使用IndexedDB
        try {
          const keys = await apiKeyStorage.listApiKeys();
          const settings = await apiKeyStorage.getApiKeySettings();
          const active = await apiKeyStorage.getActiveApiKey();
          
          totalKeys = keys.length;
          enabledKeys = keys.filter(k => k.enabled).length;
          activeKey = active ? `${active.name} (${active.usageCount || 0}次)` : null;
          rotationEnabled = settings.rotationEnabled;
        } catch (error) {
          errors.push(`IndexedDB错误: ${error}`);
        }
      }
      
      // 获取最后的API调用和计数更新时间
      const lastApiCall = localStorage.getItem('debug_last_api_call') || '从未调用';
      const lastCountUpdate = localStorage.getItem('debug_last_count_update') || '从未更新';
      
      setDebugInfo({
        environment,
        useFallback,
        totalKeys,
        enabledKeys,
        activeKey,
        rotationEnabled,
        lastApiCall,
        lastCountUpdate,
        indexedDBAvailable,
        localStorageAvailable,
        errors
      });
    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        errors: [...prev.errors, `调试信息更新失败: ${error}`]
      }));
    }
  };

  useEffect(() => {
    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 5000); // 每5秒更新一次
    return () => clearInterval(interval);
  }, []);

  // 监听自定义事件来实时更新
  useEffect(() => {
    const handleDebugUpdate = () => updateDebugInfo();
    window.addEventListener('api-key-debug-update', handleDebugUpdate);
    return () => window.removeEventListener('api-key-debug-update', handleDebugUpdate);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-black/90 text-white p-4 rounded-lg max-w-md text-xs z-50 max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-sm">API密钥调试信息</h3>
        <button 
          onClick={onClose}
          className="text-white/70 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <strong>环境:</strong> {debugInfo.environment}
          </div>
          <div>
            <strong>后备存储:</strong> {debugInfo.useFallback ? '是' : '否'}
          </div>
          <div>
            <strong>IndexedDB:</strong> {debugInfo.indexedDBAvailable ? '可用' : '不可用'}
          </div>
          <div>
            <strong>LocalStorage:</strong> {debugInfo.localStorageAvailable ? '可用' : '不可用'}
          </div>
          <div>
            <strong>总密钥数:</strong> {debugInfo.totalKeys}
          </div>
          <div>
            <strong>启用密钥数:</strong> {debugInfo.enabledKeys}
          </div>
        </div>
        
        <div>
          <strong>活动密钥:</strong> {debugInfo.activeKey || '无'}
        </div>
        <div>
          <strong>轮询启用:</strong> {debugInfo.rotationEnabled ? '是' : '否'}
        </div>
        <div>
          <strong>最后API调用:</strong> {debugInfo.lastApiCall}
        </div>
        <div>
          <strong>最后计数更新:</strong> {debugInfo.lastCountUpdate}
        </div>
        
        {debugInfo.errors.length > 0 && (
          <div className="mt-2 p-2 bg-red-900/50 rounded">
            <strong>错误:</strong>
            <ul className="mt-1 space-y-1">
              {debugInfo.errors.map((error, index) => (
                <li key={index} className="text-red-300">• {error}</li>
              ))}
            </ul>
          </div>
        )}
        
        <button
          onClick={updateDebugInfo}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded mt-2"
        >
          刷新信息
        </button>
      </div>
    </div>
  );
}
