"use client";

import { useState } from "react";
import { Button } from "./button";
import { Card } from "./card";
import { Checkbox } from "./checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";
import { Label } from "./label";
import { useToast } from "./use-toast";

// 定义可导出的数据类型
export type DataCategory = 
  | 'conversations' 
  | 'characters' 
  | 'presets' 
  | 'promptPresets'
  | 'players'
  | 'worldBooks'
  | 'regexScripts'
  | 'regexFolders'
  | 'apiKeys'
  | 'settings';

// 导出选项接口
export interface ExportOptions {
  conversations: boolean;
  characters: boolean;
  presets: boolean;
  promptPresets: boolean;
  players: boolean;
  worldBooks: boolean;
  regexScripts: boolean;
  regexFolders: boolean;
  apiKeys: boolean;
  settings: boolean;
}

// 组件属性接口
interface DataExportImportProps {
  onExport: (options: ExportOptions) => Promise<void>;
  onImport: (file: File) => Promise<void>;
  isExporting?: boolean;
  isImporting?: boolean;
}

export function DataExportImport({
  onExport,
  onImport,
  isExporting = false,
  isImporting = false
}: DataExportImportProps) {
  const { toast } = useToast();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    conversations: true,
    characters: true,
    presets: true,
    promptPresets: true,
    players: true,
    worldBooks: true,
    regexScripts: true,
    regexFolders: true,
    apiKeys: true,
    settings: true
  });
  const [importFile, setImportFile] = useState<File | null>(null);

  // 处理导出选项变更
  const handleOptionChange = (category: keyof ExportOptions, checked: boolean) => {
    setExportOptions(prev => ({
      ...prev,
      [category]: checked
    }));
  };

  // 处理全选/全不选
  const handleSelectAll = (checked: boolean) => {
    setExportOptions({
      conversations: checked,
      characters: checked,
      presets: checked,
      promptPresets: checked,
      players: checked,
      worldBooks: checked,
      regexScripts: checked,
      regexFolders: checked,
      apiKeys: checked,
      settings: checked
    });
  };

  // 处理导出操作
  const handleExport = async () => {
    try {
      // 检查是否至少选择了一项
      const hasSelection = Object.values(exportOptions).some(value => value);
      if (!hasSelection) {
        toast({
          title: "导出失败",
          description: "请至少选择一种数据类型进行导出",
          variant: "destructive"
        });
        return;
      }

      await onExport(exportOptions);
      setExportDialogOpen(false);
    } catch (error) {
      console.error("导出数据失败:", error);
      toast({
        title: "导出失败",
        description: error instanceof Error ? error.message : "导出数据时发生未知错误",
        variant: "destructive"
      });
    }
  };

  // 处理导入操作
  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: "导入失败",
        description: "请选择要导入的文件",
        variant: "destructive"
      });
      return;
    }

    try {
      await onImport(importFile);
      setImportDialogOpen(false);
      setImportFile(null);
    } catch (error) {
      console.error("导入数据失败:", error);
      toast({
        title: "导入失败",
        description: error instanceof Error ? error.message : "导入数据时发生未知错误",
        variant: "destructive"
      });
    }
  };

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">数据备份与恢复</h3>
          <p className="text-sm text-muted-foreground">
            导出或导入您的应用数据，包括对话历史、角色、预设等
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={() => setExportDialogOpen(true)} 
            disabled={isExporting}
            className="flex-1"
          >
            {isExporting ? "导出中..." : "导出数据"}
          </Button>
          <Button 
            onClick={() => setImportDialogOpen(true)} 
            variant="outline" 
            disabled={isImporting}
            className="flex-1"
          >
            {isImporting ? "导入中..." : "导入数据"}
          </Button>
        </div>
      </div>

      {/* 导出对话框 */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导出数据</DialogTitle>
            <DialogDescription>
              选择要导出的数据类型。导出的数据将以JSON格式保存。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="select-all" 
                checked={Object.values(exportOptions).every(v => v)}
                onCheckedChange={(checked) => handleSelectAll(checked === true)}
              />
              <Label htmlFor="select-all" className="font-medium">全选</Label>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="export-conversations" 
                  checked={exportOptions.conversations}
                  onCheckedChange={(checked) => handleOptionChange('conversations', checked === true)}
                />
                <Label htmlFor="export-conversations">对话历史</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="export-characters" 
                  checked={exportOptions.characters}
                  onCheckedChange={(checked) => handleOptionChange('characters', checked === true)}
                />
                <Label htmlFor="export-characters">角色</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="export-presets" 
                  checked={exportOptions.presets}
                  onCheckedChange={(checked) => handleOptionChange('presets', checked === true)}
                />
                <Label htmlFor="export-presets">预设</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="export-promptPresets" 
                  checked={exportOptions.promptPresets}
                  onCheckedChange={(checked) => handleOptionChange('promptPresets', checked === true)}
                />
                <Label htmlFor="export-promptPresets">提示词预设</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="export-players" 
                  checked={exportOptions.players}
                  onCheckedChange={(checked) => handleOptionChange('players', checked === true)}
                />
                <Label htmlFor="export-players">玩家</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="export-worldBooks" 
                  checked={exportOptions.worldBooks}
                  onCheckedChange={(checked) => handleOptionChange('worldBooks', checked === true)}
                />
                <Label htmlFor="export-worldBooks">世界书</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="export-regexScripts" 
                  checked={exportOptions.regexScripts}
                  onCheckedChange={(checked) => handleOptionChange('regexScripts', checked === true)}
                />
                <Label htmlFor="export-regexScripts">正则脚本</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="export-regexFolders" 
                  checked={exportOptions.regexFolders}
                  onCheckedChange={(checked) => handleOptionChange('regexFolders', checked === true)}
                />
                <Label htmlFor="export-regexFolders">正则文件夹</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="export-apiKeys" 
                  checked={exportOptions.apiKeys}
                  onCheckedChange={(checked) => handleOptionChange('apiKeys', checked === true)}
                />
                <Label htmlFor="export-apiKeys">API密钥</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="export-settings" 
                  checked={exportOptions.settings}
                  onCheckedChange={(checked) => handleOptionChange('settings', checked === true)}
                />
                <Label htmlFor="export-settings">设置</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? "导出中..." : "导出"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导入对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导入数据</DialogTitle>
            <DialogDescription>
              选择要导入的数据文件。导入将覆盖现有数据，请确保已备份重要数据。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="import-file">选择文件</Label>
              <input
                id="import-file"
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
              />
              <p className="text-sm text-muted-foreground">
                只支持通过本应用导出的JSON格式数据文件
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!importFile || isImporting}
              variant="default"
            >
              {isImporting ? "导入中..." : "导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 