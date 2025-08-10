"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Download, Edit, Trash2, FolderPlus, 
  Move, Check, XCircle, MoreHorizontal, GripVertical, Upload
} from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useRegexFolderStore, useRegexStore, usePresetFolderStore } from "@/lib/store";
import { RegexFolder } from "@/lib/types";
import { RegexScript } from "@/lib/regexUtils";
import { FolderBatchImport, ImportResult } from "@/components/extensions/regex-folder-import";

interface PresetRegexManagerProps {
  presetId: string;
  onUpdate?: () => void;
}

interface FolderPanelProps {
  folders: RegexFolder[];
  linkedFolderIds: Set<string>;
  viewingFolderId: string | null;
  onFolderLinkChange: (folderId: string, checked: boolean) => void;
  onViewChange: (folderId: string | null) => void;
  onCreateFolder: (name: string, description: string) => void;
}

interface RegexPanelProps {
  scripts: RegexScript[];
  viewingFolderId: string | null;
  selectedScriptIds: Set<string>;
  searchTerm: string;
  sortBy: 'name' | 'modified' | 'imported';
  onScriptSelect: (scriptId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onSearchChange: (term: string) => void;
  onSortChange: (sort: 'name' | 'modified' | 'imported') => void;
  onMoveToFolder: (folderId: string) => void;
  onCreateFolder: (name: string) => void;
  onToggleEnabled: (scriptId: string) => void;
  onEdit: (scriptId: string) => void;
  onExport: (scriptId: string) => void;
  onDelete: (scriptId: string) => void;
  onViewChange: (folderId: string | null) => void;
  onImportComplete: () => void;
}

// 左侧文件夹面板
function FolderPanel({
  folders,
  linkedFolderIds,
  viewingFolderId,
  onFolderLinkChange,
  onViewChange,
  onCreateFolder
}: FolderPanelProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), newFolderDescription.trim());
      setNewFolderName("");
      setNewFolderDescription("");
      setShowCreateDialog(false);
    }
  };

  // 只显示预设类型的文件夹
  const presetFolders = folders.filter(folder => folder.type === 'preset');

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">文件夹关联</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateDialog(true)}
          >
            <FolderPlus className="h-4 w-4 mr-1" />
            新建
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] lg:h-[400px]">
          <div className="p-4 space-y-2">
            {/* 全部文件夹选项 */}
            <div 
              className={cn(
                "flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted/50",
                viewingFolderId === null && "bg-muted"
              )}
              onClick={() => onViewChange(null)}
            >
              <span className="font-medium">📋 全部正则</span>
              {viewingFolderId === null && (
                <Badge variant="secondary" className="text-xs">查看中</Badge>
              )}
            </div>

            {/* 文件夹列表 */}
            {presetFolders.map((folder) => (
              <div 
                key={folder.id}
                className={cn(
                  "flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted/50",
                  viewingFolderId === folder.id && "bg-muted"
                )}
                onClick={() => onViewChange(
                  viewingFolderId === folder.id ? null : folder.id
                )}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Checkbox
                    checked={linkedFolderIds.has(folder.id)}
                    onCheckedChange={(checked) => 
                      onFolderLinkChange(folder.id, !!checked)
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{folder.name}</div>
                    {folder.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {folder.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {folder.scope === 'global' && (
                    <Badge variant="outline" className="text-xs">全局</Badge>
                  )}
                  {linkedFolderIds.has(folder.id) && (
                    <Badge variant="default" className="text-xs">✓</Badge>
                  )}
                  {viewingFolderId === folder.id && (
                    <Badge variant="secondary" className="text-xs">👁️</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>

      {/* 创建文件夹对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新文件夹</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">文件夹名称</label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="输入文件夹名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium">描述 (可选)</label>
              <Input
                value={newFolderDescription}
                onChange={(e) => setNewFolderDescription(e.target.value)}
                placeholder="输入文件夹描述"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                取消
              </Button>
              <Button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                创建
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// 右侧正则面板
function RegexPanel({
  scripts,
  viewingFolderId,
  selectedScriptIds,
  searchTerm,
  sortBy,
  onScriptSelect,
  onSelectAll,
  onSearchChange,
  onSortChange,
  onMoveToFolder,
  onCreateFolder,
  onToggleEnabled,
  onEdit,
  onExport,
  onDelete,
  onViewChange,
  onImportComplete
}: RegexPanelProps) {
  const { folders } = useRegexFolderStore();
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // 根据当前视图和搜索过滤脚本
  const filteredScripts = scripts.filter(script => {
    const matchesSearch = searchTerm.trim() === "" || 
      script.scriptName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      script.findRegex.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesView = viewingFolderId === null || script.folderId === viewingFolderId;
    
    return matchesSearch && matchesView;
  });

  // 排序脚本
  const sortedScripts = [...filteredScripts].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.scriptName.localeCompare(b.scriptName);
      case 'modified':
      case 'imported':
        // 由于RegexScript接口暂无时间戳字段，按ID排序作为替代
        return a.id.localeCompare(b.id);
      default:
        return 0;
    }
  });

  const handleMoveToFolder = (folderId: string) => {
    onMoveToFolder(folderId);
    setShowMoveDialog(false);
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setShowCreateFolderDialog(false);
    }
  };

  const presetFolders = folders.filter(folder => folder.type === 'preset');

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          {/* 标题和视图选择器 */}
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">正则脚本</CardTitle>
            <Select
              value={viewingFolderId || 'all'}
              onValueChange={(value) => {
                const folderId = value === 'all' ? null : value;
                onViewChange?.(folderId);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📋 全部正则</SelectItem>
                {presetFolders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    📁 {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 搜索、排序和批量导入 */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="搜索正则..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">按名称</SelectItem>
                <SelectItem value="modified">按修改时间</SelectItem>
                <SelectItem value="imported">按导入时间</SelectItem>
              </SelectContent>
            </Select>
            <FolderBatchImport
              buttonText="导入"
              variant="outline"
              size="default"
              defaultFolderId={viewingFolderId || 'default'}
              onComplete={onImportComplete}
            />
          </div>

          {/* 批量操作 */}
          {selectedScriptIds.size > 0 && (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
              <span className="text-sm">
                已选择 {selectedScriptIds.size} 个脚本
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMoveDialog(true)}
              >
                <Move className="h-4 w-4 mr-1" />
                移动到文件夹
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateFolderDialog(true)}
              >
                <FolderPlus className="h-4 w-4 mr-1" />
                新建文件夹
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] lg:h-[400px]">
          <div className="p-4">
            {sortedScripts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "没有找到匹配的脚本" : 
                 viewingFolderId ? "此文件夹中暂无脚本" : "暂无正则脚本"}
              </div>
            ) : (
              <div className="space-y-2">
                {/* 全选/反选 */}
                <div className="flex items-center gap-2 p-2 border-b">
                  <Checkbox
                    checked={sortedScripts.length > 0 && 
                      sortedScripts.every(script => selectedScriptIds.has(script.id))}
                    onCheckedChange={(checked) => onSelectAll(!!checked)}
                  />
                  <span className="text-sm font-medium">
                    全选 ({sortedScripts.length} 个脚本)
                  </span>
                </div>

                {/* 脚本列表 */}
                {sortedScripts.map((script) => (
                  <div
                    key={script.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md hover:bg-muted/30 min-w-0",
                      script.disabled && "opacity-60"
                    )}
                  >
                    <Checkbox
                      checked={selectedScriptIds.has(script.id)}
                      onCheckedChange={(checked) => 
                        onScriptSelect(script.id, !!checked)
                      }
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "font-medium truncate",
                        script.disabled && "line-through"
                      )}>
                        {script.scriptName}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge 
                          variant={script.scope === 'character' ? 'secondary' : 'outline'} 
                          className="text-xs flex-shrink-0"
                        >
                          {script.scope === 'character' ? '局部' : '全局'}
                        </Badge>
                        {script.placement.includes(1) && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">用户</Badge>
                        )}
                        {script.placement.includes(2) && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">AI</Badge>
                        )}
                        {script.placement.includes(3) && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">命令</Badge>
                        )}
                        {script.placement.includes(4) && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">提示词</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        {/* 启用/禁用按钮 - 始终显示 */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={() => onToggleEnabled(script.id)}
                            >
                              {script.disabled ? (
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <Check className="h-4 w-4 text-green-500" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {script.disabled ? "启用" : "禁用"}
                          </TooltipContent>
                        </Tooltip>
                        
                        {/* 桌面端：显示所有按钮 */}
                        <div className="hidden md:flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onEdit(script.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>编辑</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onExport(script.id)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>导出</TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => onDelete(script.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>删除</TooltipContent>
                          </Tooltip>
                        </div>

                        {/* 移动端：下拉菜单 */}
                        <div className="md:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                              <DropdownMenuItem onClick={() => onEdit(script.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onExport(script.id)}>
                                <Download className="h-4 w-4 mr-2" />
                                导出
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => onDelete(script.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* 移动到文件夹对话框 */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>移动到文件夹</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              将选中的 {selectedScriptIds.size} 个脚本移动到：
            </p>
            <div className="space-y-2">
              {presetFolders.map((folder) => (
                <Button
                  key={folder.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleMoveToFolder(folder.id)}
                >
                  📁 {folder.name}
                  {folder.description && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {folder.description}
                    </span>
                  )}
                </Button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowMoveDialog(false)}
              >
                取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 新建文件夹对话框 */}
      <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建文件夹并移动</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              创建新文件夹并将选中的 {selectedScriptIds.size} 个脚本移动到其中：
            </p>
            <div>
              <label className="text-sm font-medium">文件夹名称</label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="输入文件夹名称"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateFolderDialog(false)}
              >
                取消
              </Button>
              <Button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                创建并移动
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// 主组件
export function PresetRegexManager({ presetId, onUpdate }: PresetRegexManagerProps) {
  const { folders, loadFolders, createFolder } = useRegexFolderStore();
  const { scripts, loadScripts, updateScript, deleteScript } = useRegexStore();
  const { 
    linkFolderToPreset, 
    unlinkFolderFromPreset, 
    getFoldersForPreset 
  } = usePresetFolderStore();

  const [linkedFolderIds, setLinkedFolderIds] = useState<Set<string>>(new Set());
  const [viewingFolderId, setViewingFolderId] = useState<string | null>(null);
  const [selectedScriptIds, setSelectedScriptIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'name' | 'modified' | 'imported'>('name');
  const [isLoading, setIsLoading] = useState(true);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await loadFolders();
      await loadScripts();
      
      // 获取预设关联的文件夹ID
      const linkedFolders = await getFoldersForPreset(presetId);
      setLinkedFolderIds(new Set(linkedFolders.map(f => f.id)));
      
      setIsLoading(false);
    };
    
    loadData();
  }, [presetId, loadFolders, loadScripts, getFoldersForPreset]);

  // 过滤掉属于角色文件夹的正则
  const presetScripts = scripts.filter(script => {
    // 如果脚本没有指定文件夹，则包含在内（默认文件夹）
    if (!script.folderId) return true;
    
    // 查找脚本所属的文件夹
    const folder = folders.find(f => f.id === script.folderId);
    
    // 如果找不到文件夹或文件夹类型不是角色类型，则包含在内
    return !folder || folder.type !== 'character';
  });

  // 处理文件夹关联变更
  const handleFolderLinkChange = async (folderId: string, checked: boolean) => {
    try {
      if (checked) {
        await linkFolderToPreset(folderId, presetId);
      } else {
        await unlinkFolderFromPreset(folderId, presetId);
      }
      
      // 更新关联状态
      const linkedFolders = await getFoldersForPreset(presetId);
      setLinkedFolderIds(new Set(linkedFolders.map(f => f.id)));
      
      onUpdate?.();
    } catch (error) {
      console.error("更新文件夹关联失败:", error);
    }
  };

  // 处理视图变更
  const handleViewChange = (folderId: string | null) => {
    setViewingFolderId(folderId);
    setSelectedScriptIds(new Set()); // 清空选择
  };

  // 处理脚本选择
  const handleScriptSelect = (scriptId: string, checked: boolean) => {
    const newSelected = new Set(selectedScriptIds);
    if (checked) {
      newSelected.add(scriptId);
    } else {
      newSelected.delete(scriptId);
    }
    setSelectedScriptIds(newSelected);
  };

  // 处理全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const visibleScripts = presetScripts.filter(script => {
        const matchesSearch = searchTerm.trim() === "" || 
          script.scriptName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          script.findRegex.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesView = viewingFolderId === null || script.folderId === viewingFolderId;
        return matchesSearch && matchesView;
      });
      setSelectedScriptIds(new Set(visibleScripts.map(s => s.id)));
    } else {
      setSelectedScriptIds(new Set());
    }
  };

  // 处理移动到文件夹
  const handleMoveToFolder = async (targetFolderId: string) => {
    try {
      const movePromises = Array.from(selectedScriptIds).map(scriptId => {
        const script = presetScripts.find(s => s.id === scriptId);
        if (script) {
          return updateScript(scriptId, { ...script, folderId: targetFolderId });
        }
        return Promise.resolve();
      });
      
      await Promise.all(movePromises);
      setSelectedScriptIds(new Set());
      await loadScripts(); // 重新加载脚本
    } catch (error) {
      console.error("移动脚本失败:", error);
    }
  };

  // 生成唯一的文件夹名称
  const generateUniqueFolderName = (baseName: string): string => {
    const existingNames = folders
      .filter(f => f.type === 'preset')
      .map(f => f.name);
    
    if (!existingNames.includes(baseName)) {
      return baseName;
    }
    
    let counter = 1;
    let uniqueName = `${baseName} (${counter})`;
    
    while (existingNames.includes(uniqueName)) {
      counter++;
      uniqueName = `${baseName} (${counter})`;
    }
    
    return uniqueName;
  };

  // 处理创建文件夹（从正则面板）
  const handleCreateFolderFromRegex = async (name: string) => {
    try {
      const uniqueName = generateUniqueFolderName(name);
      
      const newFolder = await createFolder({
        name: uniqueName,
        description: `由正则管理自动创建`,
        type: 'preset',
        scope: 'local'
      });
      
      if (newFolder) {
        // 移动选中的脚本到新文件夹
        await handleMoveToFolder(newFolder.id);
        // 关联文件夹到当前预设
        await handleFolderLinkChange(newFolder.id, true);
      }
    } catch (error) {
      console.error("创建文件夹失败:", error);
    }
  };

  // 处理创建文件夹（从文件夹面板）
  const handleCreateFolderFromPanel = async (name: string, description: string) => {
    try {
      const uniqueName = generateUniqueFolderName(name);
      
      const newFolder = await createFolder({
        name: uniqueName,
        description,
        type: 'preset',
        scope: 'local'
      });
      
      if (newFolder) {
        // 自动关联到当前预设
        await handleFolderLinkChange(newFolder.id, true);
      }
    } catch (error) {
      console.error("创建文件夹失败:", error);
    }
  };

  // 处理脚本操作
  const handleToggleEnabled = async (scriptId: string) => {
    const script = presetScripts.find(s => s.id === scriptId);
    if (script) {
      await updateScript(scriptId, { ...script, disabled: !script.disabled });
      await loadScripts();
    }
  };

  const handleEdit = (scriptId: string) => {
    // 这里可以触发编辑对话框或导航到编辑页面
    console.log("编辑脚本:", scriptId);
  };

  const handleExport = (scriptId: string) => {
    // 这里可以触发导出功能
    console.log("导出脚本:", scriptId);
  };

  const handleDelete = async (scriptId: string) => {
    if (confirm("确定要删除这个脚本吗？")) {
      await deleteScript(scriptId);
      await loadScripts();
      // 从选择中移除
      const newSelected = new Set(selectedScriptIds);
      newSelected.delete(scriptId);
      setSelectedScriptIds(newSelected);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const characterScriptsCount = scripts.length - presetScripts.length;

  return (
    <div className="space-y-4">
      {/* 说明信息 */}
      {characterScriptsCount > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div className="text-blue-500 mt-0.5">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>预设正则管理</strong>
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                此界面仅显示预设相关的正则脚本。已排除 {characterScriptsCount} 个角色专属正则脚本，角色正则在角色管理中单独管理。
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-auto lg:h-[500px]">
        {/* 左侧文件夹面板 */}
        <FolderPanel
          folders={folders}
          linkedFolderIds={linkedFolderIds}
          viewingFolderId={viewingFolderId}
          onFolderLinkChange={handleFolderLinkChange}
          onViewChange={handleViewChange}
          onCreateFolder={handleCreateFolderFromPanel}
        />

        {/* 右侧正则面板 */}
        <RegexPanel
          scripts={presetScripts}
          viewingFolderId={viewingFolderId}
          selectedScriptIds={selectedScriptIds}
          searchTerm={searchTerm}
          sortBy={sortBy}
          onScriptSelect={handleScriptSelect}
          onSelectAll={handleSelectAll}
          onSearchChange={setSearchTerm}
          onSortChange={setSortBy}
          onMoveToFolder={handleMoveToFolder}
          onCreateFolder={handleCreateFolderFromRegex}
          onToggleEnabled={handleToggleEnabled}
                  onEdit={handleEdit}
        onExport={handleExport}
        onDelete={handleDelete}
        onViewChange={handleViewChange}
        onImportComplete={() => loadScripts()}
      />
      </div>
    </div>
  );
}
