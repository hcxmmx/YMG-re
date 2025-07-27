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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [activeTab, setActiveTab] = useState<string>("folder");
  const [selectedScriptIds, setSelectedScriptIds] = useState<Set<string>>(new Set());
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  
  // 重置状态
  const resetState = () => {
    setSelectedFolderId("");
    setActionType("scope");
    setSelectedScope("global");
    setSelectedCharacterIds([]);
    setTargetFolderId("");
    setResult(null);
    setActiveTab("folder");
    setSelectedScriptIds(new Set());
    setSelectAllChecked(false);
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
      // 全选当前显示的脚本
      const scriptsToSelect = scripts.filter(script => {
        if (activeTab === "folder" && selectedFolderId) {
          return script.folderId === selectedFolderId;
        } else if (activeTab === "global") {
          return script.scope === "global" || !script.scope;
        } else if (activeTab === "character") {
          return script.scope === "character";
        }
        return true;
      });
      setSelectedScriptIds(new Set(scriptsToSelect.map(s => s.id)));
    } else {
      // 取消全选
      setSelectedScriptIds(new Set());
    }
  };
  
  // 获取当前显示的脚本
  const getVisibleScripts = () => {
    if (activeTab === "folder" && selectedFolderId) {
      return scripts.filter(script => script.folderId === selectedFolderId);
    } else if (activeTab === "global") {
      return scripts.filter(script => script.scope === "global" || !script.scope);
    } else if (activeTab === "character") {
      return scripts.filter(script => script.scope === "character");
    }
    return scripts;
  };
  
  // 执行批量操作
  const handleExecuteBatchAction = async () => {
    if (activeTab === "folder" && !selectedFolderId) {
      setResult({
        success: false,
        message: "请选择源文件夹"
      });
      return;
    }
    
    // 获取选中的脚本
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
      // 根据操作类型执行不同的批量操作
      switch (actionType) {
        case "scope":
          // 批量设置作用域
          for (const script of selectedScripts) {
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
            message: `已成功将 ${selectedScripts.length} 个脚本的作用域设置为 ${selectedScope === "global" ? "全局" : "局部"}`
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
          
          for (const script of selectedScripts) {
            const updatedScript = { ...script, folderId: targetFolderId };
            await updateScript(script.id, updatedScript);
          }
          
          setResult({
            success: true,
            message: `已成功将 ${selectedScripts.length} 个脚本移动到新文件夹`
          });
          break;
          
        default:
          setResult({
            success: false,
            message: "未知的操作类型"
          });
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
        <Button variant="outline">批量操作</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>批量操作正则脚本</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* 选择脚本来源 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="folder">按文件夹</TabsTrigger>
              <TabsTrigger value="global">全局脚本</TabsTrigger>
              <TabsTrigger value="character">角色脚本</TabsTrigger>
            </TabsList>
            
            <TabsContent value="folder">
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
            </TabsContent>
          </Tabs>
          
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
              {getVisibleScripts().length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {activeTab === "folder" && !selectedFolderId
                    ? "请先选择一个文件夹"
                    : "没有找到符合条件的脚本"}
                </div>
              ) : (
                <div className="space-y-1">
                  {getVisibleScripts().map(script => (
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
                  <ScrollArea className="h-[150px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                  </ScrollArea>
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
                      disabled={folder.id === selectedFolderId && activeTab === "folder"}
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
          >
            {isProcessing ? "处理中..." : "执行"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 