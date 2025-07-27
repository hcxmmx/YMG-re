"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RegexFolder } from "@/lib/types";
import { useRegexFolderStore, usePromptPresetStore, usePresetFolderStore } from "@/lib/store";
import { FolderPlus, Edit, Trash2, Power, PowerOff, FolderOpen, Link as LinkIcon, Settings } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface FolderManagementProps {
  onFolderSelect?: (folderId: string) => void;
}

export function FolderManagement({ onFolderSelect }: FolderManagementProps) {
  const { folders, loadFolders, createFolder, updateFolder, deleteFolder, toggleFolderEnabled } = useRegexFolderStore();
  const { presets, loadPresets } = usePromptPresetStore();
  const { loadPresetFolders, linkFolderToPreset, unlinkFolderFromPreset, getFoldersForPreset } = usePresetFolderStore();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<RegexFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [newFolderType, setNewFolderType] = useState<"global" | "character">("global");
  const [linkedPresetIds, setLinkedPresetIds] = useState<Set<string>>(new Set());
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "global" | "character">("all");
  
  // 加载文件夹
  useEffect(() => {
    loadFolders();
    loadPresets();
  }, [loadFolders, loadPresets]);
  
  // 过滤文件夹
  const filteredFolders = folders.filter(folder => {
    if (viewMode === "all") return true;
    return folder.type === viewMode;
  });
  
  // 处理创建文件夹
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    await createFolder({
      name: newFolderName.trim(),
      description: newFolderDescription.trim(),
      disabled: false,
      type: newFolderType
    });
    
    setNewFolderName("");
    setNewFolderDescription("");
    setNewFolderType("global");
    setIsCreateDialogOpen(false);
  };
  
  // 处理编辑文件夹
  const handleEditFolder = async () => {
    if (!currentFolder || !newFolderName.trim()) return;
    
    await updateFolder(currentFolder.id, {
      name: newFolderName.trim(),
      description: newFolderDescription.trim(),
      type: newFolderType
    });
    
    setIsEditDialogOpen(false);
  };
  
  // 处理删除文件夹
  const handleDeleteFolder = async () => {
    if (!currentFolder) return;
    
    await deleteFolder(currentFolder.id);
    setIsDeleteDialogOpen(false);
  };
  
  // 处理切换文件夹启用状态
  const handleToggleFolderEnabled = async (folderId: string) => {
    await toggleFolderEnabled(folderId);
  };
  
  // 打开编辑对话框
  const openEditDialog = (folder: RegexFolder) => {
    setCurrentFolder(folder);
    setNewFolderName(folder.name);
    setNewFolderDescription(folder.description || "");
    setNewFolderType(folder.type);
    setIsEditDialogOpen(true);
  };
  
  // 打开删除对话框
  const openDeleteDialog = (folder: RegexFolder) => {
    setCurrentFolder(folder);
    setIsDeleteDialogOpen(true);
  };
  
  // 打开预设关联对话框
  const openPresetDialog = async (folder: RegexFolder) => {
    setCurrentFolder(folder);
    setIsLoadingPresets(true);
    setIsPresetDialogOpen(true);
    
    try {
      // 获取与文件夹关联的预设
      const linkedFolders = await getFoldersForPreset(folder.id);
      const linkedIds = new Set(folder.presetIds || []);
      setLinkedPresetIds(linkedIds);
    } catch (error) {
      console.error("获取文件夹关联的预设失败:", error);
    } finally {
      setIsLoadingPresets(false);
    }
  };
  
  // 处理预设关联变更
  const handlePresetLinkChange = async (presetId: string, checked: boolean) => {
    if (!currentFolder) return;
    
    try {
      if (checked) {
        await linkFolderToPreset(currentFolder.id, presetId);
      } else {
        await unlinkFolderFromPreset(currentFolder.id, presetId);
      }
      
      // 更新关联状态
      const folder = await useRegexFolderStore.getState().getFolder(currentFolder.id);
      if (folder && folder.presetIds) {
        setLinkedPresetIds(new Set(folder.presetIds));
      }
      
      // 重新加载文件夹列表以更新UI
      loadFolders();
    } catch (error) {
      console.error("更新文件夹关联的预设失败:", error);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button 
              variant={viewMode === "all" ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewMode("all")}
            >
              全部
            </Button>
            <Button 
              variant={viewMode === "global" ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewMode("global")}
            >
              全局文件夹
            </Button>
            <Button 
              variant={viewMode === "character" ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewMode("character")}
            >
              角色文件夹
            </Button>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <FolderPlus className="mr-2 h-4 w-4" />
              新建文件夹
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建文件夹</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="folder-name">文件夹名称</Label>
                <Input
                  id="folder-name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="输入文件夹名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="folder-description">描述</Label>
                <Textarea
                  id="folder-description"
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  placeholder="输入文件夹描述（可选）"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="folder-type">文件夹类型</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="folder-type"
                    checked={newFolderType === "global"}
                    onCheckedChange={(checked) => setNewFolderType(checked ? "global" : "character")}
                  />
                  <Label htmlFor="folder-type">全局文件夹</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateFolder}>创建</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <ScrollArea className="h-[500px] pr-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFolders.map((folder) => (
            <Card 
              key={folder.id} 
              className={`${folder.disabled ? 'opacity-70' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center">
                      {folder.name}
                      {folder.id === 'default' && (
                        <Badge variant="outline" className="ml-2">默认</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {folder.description || "无描述"}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {folder.disabled && (
                      <Badge variant="secondary">已禁用</Badge>
                    )}
                    <Badge variant={folder.type === 'global' ? 'default' : 'outline'} className="ml-2">
                      {folder.type === 'global' ? '全局' : '角色'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* 显示关联的预设数量 */}
                {folder.presetIds && folder.presetIds.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    已关联 {folder.presetIds.length} 个预设
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onFolderSelect?.(folder.id)}
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>查看文件夹内容</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex gap-1">
                  {/* 预设关联按钮 */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPresetDialog(folder)}
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>关联到预设</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {/* 启用/禁用按钮 */}
                  {folder.id !== 'default' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleFolderEnabled(folder.id)}
                          >
                            {folder.disabled ? (
                              <Power className="h-4 w-4" />
                            ) : (
                              <PowerOff className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {folder.disabled ? "启用文件夹" : "禁用文件夹"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  {/* 编辑按钮 */}
                  {folder.id !== 'default' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(folder)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>编辑文件夹</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  {/* 删除按钮 */}
                  {folder.id !== 'default' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(folder)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>删除文件夹</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </ScrollArea>
      
      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑文件夹</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-folder-name">文件夹名称</Label>
              <Input
                id="edit-folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="输入文件夹名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-folder-description">描述</Label>
              <Textarea
                id="edit-folder-description"
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
                placeholder="输入文件夹描述（可选）"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-folder-type">文件夹类型</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-folder-type"
                  checked={newFolderType === "global"}
                  onCheckedChange={(checked) => setNewFolderType(checked ? "global" : "character")}
                />
                <Label htmlFor="edit-folder-type">全局文件夹</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditFolder}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p>
            您确定要删除文件夹 "{currentFolder?.name}" 吗？文件夹中的所有正则脚本将被移动到默认文件夹。此操作无法撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteFolder}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 预设关联对话框 */}
      <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>关联文件夹到预设</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              选择要关联的预设。切换预设时，系统将自动启用关联的文件夹中的正则脚本，禁用其他文件夹中的脚本。
            </p>
            
            {isLoadingPresets ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : presets.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                暂无可用的预设
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-2">
                <div className="space-y-2">
                  {presets.map(preset => (
                    <div key={preset.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
                      <Checkbox 
                        id={`preset-${preset.id}`}
                        checked={linkedPresetIds.has(preset.id)}
                        onCheckedChange={(checked) => handlePresetLinkChange(preset.id, checked === true)}
                      />
                      <div className="flex-1">
                        <Label 
                          htmlFor={`preset-${preset.id}`}
                          className="flex flex-col cursor-pointer"
                        >
                          <span className="font-medium">{preset.name}</span>
                          {preset.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {preset.description}
                            </span>
                          )}
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsPresetDialogOpen(false)}>
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 