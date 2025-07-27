"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRegexFolderStore, usePresetFolderStore } from "@/lib/store";
import { RegexFolder } from "@/lib/types";
import { FolderOpen, FolderClosed, FolderX, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RegexPresetFoldersProps {
  presetId: string;
  onUpdate?: () => void;
}

export function RegexPresetFolders({ presetId, onUpdate }: RegexPresetFoldersProps) {
  const { folders, loadFolders } = useRegexFolderStore();
  const { 
    presetFolders,
    loadPresetFolders,
    linkFolderToPreset,
    unlinkFolderFromPreset
  } = usePresetFolderStore();
  
  const [linkedFolderIds, setLinkedFolderIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  
  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await loadFolders();
      await loadPresetFolders(presetId);
      
      // 获取预设关联的文件夹ID
      const linkedFolders = await usePresetFolderStore.getState().getFoldersForPreset(presetId);
      setLinkedFolderIds(new Set(linkedFolders.map(f => f.id)));
      
      setIsLoading(false);
    };
    
    loadData();
  }, [presetId, loadFolders, loadPresetFolders]);
  
  // 处理文件夹关联变更
  const handleFolderLinkChange = async (folderId: string, checked: boolean) => {
    try {
      if (checked) {
        await linkFolderToPreset(folderId, presetId);
      } else {
        await unlinkFolderFromPreset(folderId, presetId);
      }
      
      // 更新关联状态
      const linkedFolders = await usePresetFolderStore.getState().getFoldersForPreset(presetId);
      setLinkedFolderIds(new Set(linkedFolders.map(f => f.id)));
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("更新预设关联的文件夹失败:", error);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">预设关联的正则文件夹</h3>
          <p className="text-sm text-muted-foreground">
            切换预设时，系统将自动启用关联的文件夹中的正则脚本，禁用其他文件夹中的脚本
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p>关联文件夹后，切换到此预设时，系统将自动启用这些文件夹，禁用其他文件夹。这样可以确保每个预设只使用与之匹配的正则脚本。</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="border rounded-md">
        <ScrollArea className="h-[300px]">
          {folders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无可用的正则文件夹
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 p-4">
              {folders.map(folder => (
                <Card key={folder.id} className="overflow-hidden">
                  <div className="flex items-center p-4">
                    <Checkbox 
                      id={`folder-${folder.id}`}
                      checked={linkedFolderIds.has(folder.id)}
                      onCheckedChange={(checked) => handleFolderLinkChange(folder.id, checked === true)}
                      disabled={folder.id === 'default'} // 默认文件夹始终启用
                    />
                    <div className="ml-4 flex-1">
                      <Label htmlFor={`folder-${folder.id}`} className="flex items-center cursor-pointer">
                        <div className="mr-2">
                          {linkedFolderIds.has(folder.id) ? (
                            <FolderOpen className="h-5 w-5 text-primary" />
                          ) : folder.disabled ? (
                            <FolderX className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <FolderClosed className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium flex items-center">
                            {folder.name}
                            {folder.id === 'default' && (
                              <Badge variant="outline" className="ml-2">默认</Badge>
                            )}
                            {folder.disabled && (
                              <Badge variant="secondary" className="ml-2">已禁用</Badge>
                            )}
                          </div>
                          {folder.description && (
                            <div className="text-xs text-muted-foreground">{folder.description}</div>
                          )}
                        </div>
                      </Label>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
      
      <div className="text-sm text-muted-foreground">
        已关联 {linkedFolderIds.size} 个文件夹
      </div>
    </div>
  );
} 