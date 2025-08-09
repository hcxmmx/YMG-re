"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRegexStore, useRegexFolderStore } from "@/lib/store";
import { RegexScript } from "@/lib/regexUtils";
import { AlertCircle, CheckCircle2, Settings } from "lucide-react";

interface SimpleBatchActionsProps {
  onComplete?: () => void;
}

export function SimpleBatchActions({ onComplete }: SimpleBatchActionsProps) {
  // 获取数据
  const { folders } = useRegexFolderStore();
  const { scripts, updateScript, deleteScript } = useRegexStore();
  
  // 状态
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"move" | "delete" | "enable" | "disable">("move");
  const [targetFolderId, setTargetFolderId] = useState<string>("");
  const [selectedScriptIds, setSelectedScriptIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  
  // 重置状态
  const resetState = () => {
    setActionType("move");
    setTargetFolderId("");
    setSelectedScriptIds(new Set());
    setSelectAllChecked(false);
    setResult(null);
  };
  
  // 处理对话框打开
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetState();
    }
  };
  
  // 处理脚本选择变更
  const handleScriptChange = (scriptId: string, checked: boolean) => {
    setSelectedScriptIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(scriptId);
      } else {
        newSet.delete(scriptId);
      }
      return newSet;
    });
  };
  
  // 处理全选/取消全选
  const handleSelectAllChange = (checked: boolean) => {
    setSelectAllChecked(checked);
    if (checked) {
      setSelectedScriptIds(new Set(scripts.map(s => s.id)));
    } else {
      setSelectedScriptIds(new Set());
    }
  };
  
  // 执行批量操作
  const handleExecuteBatchAction = async () => {
    const selectedScripts = scripts.filter(script => selectedScriptIds.has(script.id));
    
    if (selectedScripts.length === 0) {
      setResult({
        success: false,
        message: "请至少选择一个脚本"
      });
      return;
    }
    
    setIsProcessing(true);
    setResult(null);
    
    try {
      switch (actionType) {
        case "move":
          if (!targetFolderId) {
            setResult({
              success: false,
              message: "请选择目标文件夹"
            });
            return;
          }
          
          for (const script of selectedScripts) {
            const updatedScript = { ...script, folderId: targetFolderId };
            await updateScript(script.id, updatedScript);
          }
          
          setResult({
            success: true,
            message: `已成功将 ${selectedScripts.length} 个脚本移动到新文件夹`
          });
          break;
          
        case "delete":
          for (const script of selectedScripts) {
            await deleteScript(script.id);
          }
          
          setResult({
            success: true,
            message: `已成功删除 ${selectedScripts.length} 个脚本`
          });
          break;
          
        case "enable":
          for (const script of selectedScripts) {
            if (script.disabled) {
              const updatedScript = { ...script, disabled: false };
              await updateScript(script.id, updatedScript);
            }
          }
          
          setResult({
            success: true,
            message: `已成功启用 ${selectedScripts.length} 个脚本`
          });
          break;
          
        case "disable":
          for (const script of selectedScripts) {
            if (!script.disabled) {
              const updatedScript = { ...script, disabled: true };
              await updateScript(script.id, updatedScript);
            }
          }
          
          setResult({
            success: true,
            message: `已成功禁用 ${selectedScripts.length} 个脚本`
          });
          break;
      }
      
      // 调用完成回调
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("批量操作失败:", error);
      setResult({
        success: false,
        message: `批量操作失败: ${error instanceof Error ? error.message : "未知错误"}`
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          批量操作
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>批量操作正则脚本</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* 脚本选择列表 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>选择要操作的脚本</Label>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="select-all"
                  checked={selectAllChecked}
                  onCheckedChange={handleSelectAllChange}
                />
                <Label htmlFor="select-all" className="text-sm">全选</Label>
              </div>
            </div>
            
            <ScrollArea className="h-[200px] border rounded-md p-2">
              {scripts.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  没有找到脚本
                </div>
              ) : (
                <div className="space-y-1">
                  {scripts.map(script => (
                    <div key={script.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md">
                      <Checkbox 
                        id={`script-${script.id}`}
                        checked={selectedScriptIds.has(script.id)}
                        onCheckedChange={(checked) => handleScriptChange(script.id, checked === true)}
                      />
                      <Label htmlFor={`script-${script.id}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">{script.scriptName}</div>
                        <div className="text-xs text-muted-foreground">
                          {script.scope === "character" ? "局部" : "全局"} · 
                          {script.disabled ? " 已禁用" : " 已启用"}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            <div className="text-xs text-muted-foreground">
              已选择 {selectedScriptIds.size} 个脚本
            </div>
          </div>
          
          {/* 操作类型选择 */}
          <div className="space-y-2">
            <Label>选择操作类型</Label>
            <RadioGroup
              value={actionType}
              onValueChange={(value) => setActionType(value as "move" | "delete" | "enable" | "disable")}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="move" id="action-move" />
                <Label htmlFor="action-move">移动到其他文件夹</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="enable" id="action-enable" />
                <Label htmlFor="action-enable">批量启用</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="disable" id="action-disable" />
                <Label htmlFor="action-disable">批量禁用</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delete" id="action-delete" />
                <Label htmlFor="action-delete" className="text-destructive">批量删除</Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* 文件夹选择（仅当操作类型为移动时显示） */}
          {actionType === "move" && (
            <div className="space-y-2">
              <Label htmlFor="target-folder">选择目标文件夹</Label>
              <Select
                value={targetFolderId}
                onValueChange={setTargetFolderId}
              >
                <SelectTrigger id="target-folder">
                  <SelectValue placeholder="选择目标文件夹" />
                </SelectTrigger>
                <SelectContent>
                  {folders.map(folder => (
                    <SelectItem 
                      key={folder.id} 
                      value={folder.id}
                    >
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* 操作结果 */}
          {result && (
            <div className={`p-3 rounded-md ${result.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <div className="flex items-start">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                )}
                <p className={`text-sm ${result.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  {result.message}
                </p>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsDialogOpen(false)}
          >
            取消
          </Button>
          <Button 
            onClick={handleExecuteBatchAction}
            disabled={isProcessing || selectedScriptIds.size === 0 || (actionType === "move" && !targetFolderId)}
            variant={actionType === "delete" ? "destructive" : "default"}
          >
            {isProcessing ? "处理中..." : "执行"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
