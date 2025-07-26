"use client";

import React, { useState, useRef } from 'react';
import { Button } from './button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';

export interface ImportResult {
  success: boolean;
  fileName: string;
  id?: string;
  name?: string;
  message?: string;
}

interface BatchImportProps {
  // 接受文件列表并返回处理结果的函数
  onImport: (files: File[]) => Promise<ImportResult[]>;
  // 允许的文件类型，例如 ".json,.png"
  accept: string;
  // 按钮文本
  buttonText?: string;
  // 按钮变体
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  // 按钮大小
  size?: 'default' | 'sm' | 'lg' | 'icon';
  // 是否显示导入结果
  showResults?: boolean;
  // 导入后的回调函数
  onComplete?: () => void;
  // 按钮图标位置
  iconPosition?: 'left' | 'right';
  // 是否禁用
  disabled?: boolean;
  // 按钮类名
  className?: string;
}

export function BatchImport({
  onImport,
  accept,
  buttonText = '批量导入',
  variant = 'outline',
  size = 'default',
  showResults = true,
  onComplete,
  iconPosition = 'left',
  disabled = false,
  className = ''
}: BatchImportProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [showResultsList, setShowResultsList] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    setProgress(0);
    setResults([]);
    setShowResultsList(false);

    try {
      // 转换FileList为数组
      const fileArray = Array.from(files);
      
      // 开始处理文件
      const importResults = await onImport(fileArray);
      
      // 更新结果和显示状态
      setResults(importResults);
      setShowResultsList(true);
      
      // 调用完成回调
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('批量导入失败:', error);
      setResults([{
        success: false,
        fileName: '批量导入',
        message: error instanceof Error ? error.message : '未知错误'
      }]);
      setShowResultsList(true);
    } finally {
      setIsImporting(false);
      // 重置文件输入，允许用户再次导入相同的文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 统计结果
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  return (
    <div className="relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        multiple
        className="hidden"
      />
      
      <Button
        variant={variant}
        size={size}
        disabled={disabled || isImporting}
        onClick={() => fileInputRef.current?.click()}
        className={className}
      >
        {isImporting ? (
          <>处理中...</>
        ) : (
          <>
            {iconPosition === 'left' && <Upload className="mr-2 h-4 w-4" />}
            {buttonText}
            {iconPosition === 'right' && <Upload className="ml-2 h-4 w-4" />}
          </>
        )}
      </Button>

      {/* 进度和结果 */}
      {showResults && showResultsList && results.length > 0 && (
        <div className="mt-4 p-4 border rounded-md bg-background">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium">导入结果</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResultsList(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between mb-1 text-sm">
              <span>成功: {successCount}/{totalCount}</span>
              <span>{Math.round((successCount / totalCount) * 100)}%</span>
            </div>
            <Progress value={(successCount / totalCount) * 100} />
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {results.map((result, index) => (
              <div 
                key={index}
                className={`flex items-center p-2 text-sm ${
                  index % 2 === 0 ? 'bg-muted/30' : ''
                } ${result.success ? '' : 'text-destructive'}`}
              >
                {result.success ? (
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 mr-2 text-destructive" />
                )}
                <div className="overflow-hidden">
                  <div className="truncate font-medium">{result.fileName}</div>
                  {result.message && (
                    <div className="truncate text-xs text-muted-foreground">
                      {result.message}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 