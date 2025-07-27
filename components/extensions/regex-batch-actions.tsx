"use client";

import { useState, useEffect } from "react";
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
import { useRegexStore, useRegexFolderStore, useCharacterStore } from "@/lib/store";
import { Character, RegexFolder } from "@/lib/types";
import { RegexScript } from "@/lib/regexUtils";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface BatchFolderActionsProps {
  onComplete?: () => void;
}

export function BatchFolderActions({ onComplete }: BatchFolderActionsProps) {
  // 获取数据
  const { folders } = useRegexFolderStore();
  const { scripts, updateScript } = useRegexStore();
  const { characters } = useCharacterStore();
  
  // 状态
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [actionType, setActionType] = useState<string>("scope");
  const [selectedScope, setSelectedScope] = useState<"global" | "character">("global");
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [targetFolderId, setTargetFolderId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // 重置状态
  const resetState = () => {
    setSelectedFolderId("");
    setActionType("scope");
    setSelectedScope("global");
    setSelectedCharacterIds([]);
    setTargetFolderId("");
    setResult(null);
  };
  
  // 处理对话框打开
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetState();
    }
  };
  
  // 处理角色选择变更
  const handleCharacterChange = (characterId: string, checked: boolean) => {
    setSelectedCharacterIds(prev => {
      if (checked) {
        return [...prev, characterId];
      } else {
        return prev.filter(id => id !== characterId);
      }
    });
  };
  
  // 执行批量操作
  const handleExecuteBatchAction = async () => {
    if (!selectedFolderId) {
      setResult({
        success: false,
        message: "请选择源文件夹"
      });
      return;
    }
    
    // 获取文件夹中的脚本
    const folderScripts = scripts.filter(script => script.folderId === selectedFolderId);
    
    if (folderScripts.length === 0) {
      setResult({
        success: false,
        message: "所选文件夹中没有脚本"
      });
      return;
    }
    
    setIsProcessing(true);
    setResult(null);
    
    try {
      // 根据操作类型执行不同的批量操作
      switch (actionType) {
        case "scope":
          // 批量设置作用域
          for (const script of folderScripts) {
            const updatedScript = { ...script, scope: selectedScope };
            
            // 如果设置为全局作用域，清空角色ID列表
            if (selectedScope === "global") {
              updatedScript.characterIds = [];
            } else if (selectedScope === "character" && selectedCharacterIds.length > 0) {
              // 如果设置为局部作用域且选择了角色，设置角色ID列表
              updatedScript.characterIds = [...selectedCharacterIds];
            }
            
            await updateScript(script.id, updatedScript);
          }
          
          setResult({
            success: true,
            message: `已成功将 ${folderScripts.length} 个脚本的作用域设置为 ${selectedScope === "global" ? "全局" : "局部"}`
          });
          break;
          
        case "move":
          // 批量移动到其他文件夹
          if (!targetFolderId) {
            setResult({
              success: false,
              message: "请选择目标文件夹"
            });
            return;
          }
          
          for (const script of folderScripts) {
            const updatedScript = { ...script, folderId: targetFolderId };
            await updateScript(script.id, updatedScript);
          }
          
          setResult({
            success: true,
            message: `已成功将 ${folderScripts.length} 个脚本移动到新文件夹`
          });
          break;
          
        default:
          setResult({
            success: false,
            message: "未知的操作类型"
          });
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
        <Button variant="outline">批量操作</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>文件夹批量操作</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* 源文件夹选择 */}
          <div className="space-y-2">
            <Label htmlFor="source-folder">选择源文件夹</Label>
            <Select
              value={selectedFolderId}
              onValueChange={setSelectedFolderId}
            >
              <SelectTrigger id="source-folder">
                <SelectValue placeholder="选择要操作的文件夹" />
              </SelectTrigger>
              <SelectContent>
                {folders.map(folder => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* 操作类型选择 */}
          <div className="space-y-2">
            <Label>选择操作类型</Label>
            <RadioGroup
              value={actionType}
              onValueChange={setActionType}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="scope" id="action-scope" />
                <Label htmlFor="action-scope">设置作用域</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="move" id="action-move" />
                <Label htmlFor="action-move">移动到其他文件夹</Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* 根据操作类型显示不同的选项 */}
          {actionType === "scope" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>选择作用域</Label>
                <RadioGroup
                  value={selectedScope}
                  onValueChange={(value) => setSelectedScope(value as "global" | "character")}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="global" id="scope-global" />
                    <Label htmlFor="scope-global">全局 (应用于所有角色)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="character" id="scope-character" />
                    <Label htmlFor="scope-character">局部 (仅应用于指定角色)</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* 当选择"局部"作用域时，显示角色选择 */}
              {selectedScope === "character" && (
                <div className="border rounded-md p-4">
                  <h4 className="text-sm font-medium mb-2">选择应用的角色</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {characters.length === 0 ? (
                      <p className="text-sm text-muted-foreground">暂无角色可选择</p>
                    ) : (
                      characters.map((character) => (
                        <div key={character.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`batch-char-${character.id}`}
                            checked={selectedCharacterIds.includes(character.id)}
                            onCheckedChange={(checked) => handleCharacterChange(character.id, checked === true)}
                          />
                          <Label htmlFor={`batch-char-${character.id}`} className="truncate">
                            {character.name}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedCharacterIds.length === 0 
                      ? "未选择角色，这些正则将不会应用于任何角色" 
                      : `已选择 ${selectedCharacterIds.length} 个角色`}
                  </p>
                </div>
              )}
            </div>
          )}
          
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
                      disabled={folder.id === selectedFolderId}
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
            disabled={isProcessing || !selectedFolderId || (actionType === "move" && !targetFolderId)}
          >
            {isProcessing ? "处理中..." : "执行"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 