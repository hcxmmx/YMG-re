'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from './badge';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion';
import { ChevronDown, ChevronRight, Trash2, Download } from 'lucide-react';

// API日志条目接口
interface ApiLogEntry {
  id: string;
  timestamp: Date;
  type: 'gemini' | 'openai';
  method: 'POST' | 'GET';
  endpoint: string;
  request: {
    headers?: Record<string, any>;
    body?: any;
    config?: any;
  };
  response?: {
    status?: number;
    headers?: Record<string, any>;
    data?: any;
    text?: string;
  };
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  duration?: number; // 请求耗时（毫秒）
  success: boolean;
}

export function ApiLogger() {
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  // 监听全局API日志事件
  useEffect(() => {
    const handleApiLog = (event: CustomEvent<ApiLogEntry>) => {
      console.log('📥 [ApiLogger UI] 收到API日志事件:', event.detail);
      const logEntry = event.detail;
      setLogs(prev => [logEntry, ...prev].slice(0, 100)); // 只保留最新100条
    };

    console.log('🎧 [ApiLogger UI] 开始监听 api-log 事件');
    window.addEventListener('api-log' as any, handleApiLog);
    return () => {
      console.log('🔇 [ApiLogger UI] 停止监听 api-log 事件');
      window.removeEventListener('api-log' as any, handleApiLog);
    };
  }, []);

  // 切换日志展开状态
  const toggleLogExpanded = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  // 清空日志
  const clearLogs = () => {
    setLogs([]);
    setExpandedLogs(new Set());
  };

  // 导出日志
  const exportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `api-logs-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  // 格式化JSON
  const formatJson = (obj: any) => {
    if (!obj) return 'null';
    if (typeof obj === 'string') return obj;
    return JSON.stringify(obj, null, 2);
  };

  // 获取状态颜色
  const getStatusColor = (success: boolean, status?: number) => {
    if (!success) return 'destructive';
    if (status && status >= 200 && status < 300) return 'default';
    if (status && status >= 400) return 'destructive';
    return 'secondary';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">API 请求日志</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportLogs}
              disabled={logs.length === 0}
            >
              <Download className="w-4 h-4 mr-1" />
              导出
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
              disabled={logs.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              清空
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          记录所有API请求的详细信息，包括请求参数、响应内容和错误信息
        </p>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            暂无API日志记录
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <Accordion type="multiple" value={Array.from(expandedLogs)} onValueChange={(values) => setExpandedLogs(new Set(values))}>
            {logs.map((log) => {
              const isExpanded = expandedLogs.has(log.id);
              return (
                <AccordionItem key={log.id} value={log.id}>
                  <AccordionTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span className="text-sm font-mono">
                          {formatTime(log.timestamp)}
                        </span>
                        <Badge variant="outline">
                          {log.type.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {log.method}
                        </Badge>
                        <Badge variant={getStatusColor(log.success, log.response?.status)}>
                          {log.success ? (log.response?.status || 'SUCCESS') : 'ERROR'}
                        </Badge>
                        {log.duration && (
                          <span className="text-xs text-muted-foreground">
                            {log.duration}ms
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground truncate max-w-64">
                        {log.endpoint}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="mt-2 p-4 bg-background border rounded-lg space-y-4">
                      {/* 请求信息 */}
                      <div>
                        <h4 className="font-semibold text-sm mb-2">📤 请求信息</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium">端点:</span>
                            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                              {log.method} {log.endpoint}
                            </pre>
                          </div>
                          {log.request.headers && (
                            <div>
                              <span className="text-xs font-medium">请求头:</span>
                              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                {formatJson(log.request.headers)}
                              </pre>
                            </div>
                          )}
                          {log.request.body && (
                            <div>
                              <span className="text-xs font-medium">请求体:</span>
                              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40">
                                {formatJson(log.request.body)}
                              </pre>
                            </div>
                          )}
                          {log.request.config && (
                            <div>
                              <span className="text-xs font-medium">配置:</span>
                              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                {formatJson(log.request.config)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 响应信息 */}
                      {log.response && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">📥 响应信息</h4>
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs font-medium">状态:</span>
                              <pre className="text-xs bg-muted p-2 rounded">
                                {log.response.status || 'N/A'}
                              </pre>
                            </div>
                            {log.response.headers && (
                              <div>
                                <span className="text-xs font-medium">响应头:</span>
                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                  {formatJson(log.response.headers)}
                                </pre>
                              </div>
                            )}
                            {log.response.data && (
                              <div>
                                <span className="text-xs font-medium">响应数据:</span>
                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40">
                                  {formatJson(log.response.data)}
                                </pre>
                              </div>
                            )}
                            {log.response.text && (
                              <div>
                                <span className="text-xs font-medium">响应文本:</span>
                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40">
                                  {log.response.text}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 错误信息 */}
                      {log.error && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2 text-red-600">❌ 错误信息</h4>
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs font-medium">错误消息:</span>
                              <pre className="text-xs bg-red-50 border-red-200 p-2 rounded">
                                {log.error.message}
                              </pre>
                            </div>
                            {log.error.code && (
                              <div>
                                <span className="text-xs font-medium">错误代码:</span>
                                <pre className="text-xs bg-red-50 border-red-200 p-2 rounded">
                                  {log.error.code}
                                </pre>
                              </div>
                            )}
                            {log.error.stack && (
                              <div>
                                <span className="text-xs font-medium">错误堆栈:</span>
                                <pre className="text-xs bg-red-50 border-red-200 p-2 rounded overflow-x-auto max-h-32">
                                  {log.error.stack}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
            </Accordion>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
