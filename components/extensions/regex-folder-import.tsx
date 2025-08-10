"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useRegexFolderStore, useRegexStore } from '@/lib/store';
import { RegexFolder } from '@/lib/types';

export interface ImportResult {
  success: boolean;
  fileName: string;
  id?: string;
  name?: string;
  message?: string;
}

interface FolderBatchImportProps {
  // 按钮文本
  buttonText?: string;
  // 按钮变体
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  // 按钮大小
  size?: 'default' | 'sm' | 'lg' | 'icon';
  // 导入后的回调函数
  onComplete?: () => void;
  // 是否禁用
  disabled?: boolean;
  // 按钮类名
  className?: string;
  // 默认文件夹ID
  defaultFolderId?: string;
}

export function FolderBatchImport({
  buttonText = '导入至文件夹',
  variant = 'outline',
  size = 'default',
  onComplete,
  disabled = false,
  className = '',
  defaultFolderId = 'default'
}: FolderBatchImportProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(defaultFolderId);
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [showResultsList, setShowResultsList] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 获取文件夹列表
  const { folders, loadFolders } = useRegexFolderStore();
  const { importScriptFromFile } = useRegexStore();
  
  // 加载文件夹
  const handleOpenDialog = async () => {
    await loadFolders();
    setIsDialogOpen(true);
  };
  
  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsImporting(true);
    setResults([]);
    setShowResultsList(false);

    try {
      // 转换FileList为数组
      const fileArray = Array.from(files);
      const importResults: ImportResult[] = [];
      
      // 处理每个文件
      for (const file of fileArray) {
        try {
          // 导入脚本
          const script = await importScriptFromFile(file);
          
          if (script) {
            // 设置文件夹ID
            script.folderId = selectedFolderId;
            
            // 保存脚本
            await useRegexStore.getState().updateScript(script.id, script);
            
            importResults.push({
              success: true,
              fileName: file.name,
              id: script.id,
              name: script.scriptName,
              message: `成功导入脚本: ${script.scriptName} 至 ${folders.filter(f => f.type === 'preset').find(f => f.id === selectedFolderId)?.name || '未知文件夹'}`
            });
          } else {
            importResults.push({
              success: false,
              fileName: file.name,
              message: "无效的脚本文件"
            });
          }
        } catch (error) {
          console.error("导入脚本失败:", error);
          importResults.push({
            success: false,
            fileName: file.name,
            message: error instanceof Error ? error.message : "导入失败"
          });
        }
      }
      
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
    <>
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={handleOpenDialog}
        className={className}
      >
        <Upload className="mr-2 h-4 w-4" />
        {buttonText}
      </Button>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>导入正则脚本至文件夹</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-select">选择目标文件夹</Label>
              <Select
                value={selectedFolderId}
                onValueChange={setSelectedFolderId}
              >
                <SelectTrigger id="folder-select">
                  <SelectValue placeholder="选择文件夹" />
                </SelectTrigger>
                <SelectContent>
                  {folders
                    .filter(folder => folder.type === 'preset')
                    .map(folder => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                        {folder.scope === 'global' && (
                          <span className="ml-1 text-xs text-muted-foreground">(全局)</span>
                        )}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="pt-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                multiple
                className="hidden"
              />
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="w-full"
              >
                {isImporting ? '处理中...' : '选择文件'}
              </Button>
            </div>
            
            {/* 进度和结果 */}
            {showResultsList && results.length > 0 && (
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
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 