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
import { useRegexFolderStore } from "@/lib/store";
import { FolderPlus, Edit, Trash2, Power, PowerOff, FolderOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface FolderManagementProps {
  onFolderSelect?: (folderId: string) => void;
}

export function FolderManagement({ onFolderSelect }: FolderManagementProps) {
  const { folders, loadFolders, createFolder, updateFolder, deleteFolder, toggleFolderEnabled } = useRegexFolderStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<RegexFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  
  // 加载文件夹
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);
  
  // 处理创建文件夹
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    await createFolder({
      name: newFolderName.trim(),
      description: newFolderDescription.trim(),
      disabled: false
    });
    
    setNewFolderName("");
    setNewFolderDescription("");
    setIsCreateDialogOpen(false);
  };
  
  // 处理编辑文件夹
  const handleEditFolder = async () => {
    if (!currentFolder || !newFolderName.trim()) return;
    
    await updateFolder(currentFolder.id, {
      name: newFolderName.trim(),
      description: newFolderDescription.trim()
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
    setIsEditDialogOpen(true);
  };
  
  // 打开删除对话框
  const openDeleteDialog = (folder: RegexFolder) => {
    setCurrentFolder(folder);
    setIsDeleteDialogOpen(true);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">文件夹管理</h2>
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
          {folders.map((folder) => (
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
                  {folder.disabled && (
                    <Badge variant="secondary">已禁用</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* 这里可以显示文件夹中的脚本数量等信息 */}
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
    </div>
  );
} 