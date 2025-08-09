"use client";

import { useState } from "react";
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
import { useRegexFolderStore } from "@/lib/store";
import { FolderPlus } from "lucide-react";

interface QuickFolderCreateProps {
  onFolderCreated?: (folderId: string) => void;
}

export function QuickFolderCreate({ onFolderCreated }: QuickFolderCreateProps) {
  const { createFolder } = useRegexFolderStore();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [folderType, setFolderType] = useState<"preset" | "character">("preset");
  const [folderScope, setFolderScope] = useState<"global" | "local">("local");
  const [isCreating, setIsCreating] = useState(false);
  
  // 重置表单
  const resetForm = () => {
    setFolderName("");
    setFolderDescription("");
    setFolderType("preset");
    setFolderScope("local");
  };
  
  // 处理对话框打开
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };
  
  // 创建文件夹
  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    
    setIsCreating(true);
    try {
      const newFolder = await createFolder({
        name: folderName.trim(),
        description: folderDescription.trim(),
        disabled: false,
        type: folderType,
        scope: folderType === 'preset' ? folderScope : undefined
      });
      
      // 通知父组件文件夹已创建
      if (onFolderCreated) {
        onFolderCreated(newFolder.id);
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("创建文件夹失败:", error);
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-2">
          <FolderPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>快速创建文件夹</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quick-folder-name">文件夹名称</Label>
            <Input
              id="quick-folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="例如：某预设专用"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && folderName.trim()) {
                  handleCreateFolder();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-folder-description">描述（可选）</Label>
            <Textarea
              id="quick-folder-description"
              value={folderDescription}
              onChange={(e) => setFolderDescription(e.target.value)}
              placeholder="输入文件夹描述"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-folder-type">文件夹类型</Label>
            <div className="flex items-center space-x-2">
              <Switch
                id="quick-folder-type"
                checked={folderType === "preset"}
                onCheckedChange={(checked) => setFolderType(checked ? "preset" : "character")}
              />
              <Label htmlFor="quick-folder-type">
                {folderType === "preset" ? "预设文件夹" : "角色文件夹"}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              {folderType === "preset" 
                ? "预设文件夹：可关联到预设，切换预设时自动启用/禁用" 
                : "角色文件夹：仅在特定角色对话时生效"}
            </p>
          </div>
          
          {/* 预设文件夹作用域选择 */}
          {folderType === "preset" && (
            <div className="space-y-2">
              <Label htmlFor="quick-folder-scope">作用域</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="quick-folder-scope"
                  checked={folderScope === "global"}
                  onCheckedChange={(checked) => setFolderScope(checked ? "global" : "local")}
                />
                <Label htmlFor="quick-folder-scope">全局文件夹</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                {folderScope === "global" 
                  ? "全局文件夹：在所有预设（包括无预设）启用时都会启用"
                  : "局部文件夹：仅在关联的预设启用时才会启用"}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            取消
          </Button>
          <Button 
            onClick={handleCreateFolder} 
            disabled={!folderName.trim() || isCreating}
          >
            {isCreating ? "创建中..." : "创建"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
