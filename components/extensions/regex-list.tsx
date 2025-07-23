"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  PlusCircle, Import, Edit, Trash2, Download, 
  Sliders, Search, XCircle, Check, GripVertical
} from "lucide-react";
import { RegexScript } from "@/lib/regexUtils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
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

interface RegexListProps {
  scripts: RegexScript[];
  onEdit: (scriptId: string) => void;
  onDelete: (scriptId: string) => void;
  onToggleEnabled: (scriptId: string) => void;
  onExport: (scriptId: string) => void;
  onImportClick: () => void;
  onCreateNew: () => void;
}

export function RegexList({
  scripts,
  onEdit,
  onDelete,
  onToggleEnabled,
  onExport,
  onImportClick,
  onCreateNew
}: RegexListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  
  // 过滤脚本
  const filteredScripts = searchTerm.trim() === ""
    ? scripts
    : scripts.filter(script => 
        script.scriptName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        script.findRegex.toLowerCase().includes(searchTerm.toLowerCase())
      );
  
  // 处理删除
  const handleDeleteConfirm = (id: string) => {
    onDelete(id);
    setConfirmDelete(null);
  };
  
  return (
    <div className="w-full">
      {/* 工具栏 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
        <div className="flex items-center">
          <h2 className="text-xl font-bold">正则表达式脚本</h2>
          <span className="ml-2 text-muted-foreground">
            ({scripts.length} 个脚本)
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {showSearch ? (
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 w-64"
                placeholder="搜索脚本..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                className="absolute right-2 top-2.5"
                onClick={() => {
                  setSearchTerm("");
                  setShowSearch(false);
                }}
              >
                <XCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSearch(true)}
              title="搜索"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onImportClick}
                >
                  <Import className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>导入脚本</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onCreateNew}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  <span>新建脚本</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>创建新脚本</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* 脚本列表 */}
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="space-y-4">
          {filteredScripts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-muted-foreground">
                {searchTerm ? "没有找到匹配的脚本" : "暂无正则表达式脚本"}
              </p>
              <Button
                variant="outline"
                onClick={onCreateNew}
                className="mt-4"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                <span>创建第一个脚本</span>
              </Button>
            </div>
          ) : (
            filteredScripts.map((script) => (
              <Card key={script.id} className={`${script.disabled ? 'opacity-60' : ''}`}>
                <CardHeader className="p-4 pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 w-full">
                      {/* 拖动手柄 - 暂不实现拖动排序功能 */}
                      <span className="cursor-grab">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                      </span>
                      
                      <CardTitle className={`text-base flex-grow ${script.disabled ? 'line-through' : ''}`}>
                        {script.scriptName}
                      </CardTitle>
                      
                      <div className="flex gap-1">
                        {/* 应用位置标签 */}
                        {script.placement.includes(1) && (
                          <Badge variant="outline" className="text-xs">用户</Badge>
                        )}
                        {script.placement.includes(2) && (
                          <Badge variant="outline" className="text-xs">AI</Badge>
                        )}
                        {script.placement.includes(3) && (
                          <Badge variant="outline" className="text-xs">命令</Badge>
                        )}
                        {script.placement.includes(4) && (
                          <Badge variant="outline" className="text-xs">提示词</Badge>
                        )}
                      </div>
                      
                      <div className="ml-auto flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onToggleEnabled(script.id)}
                              >
                                {script.disabled ? (
                                  <XCircle className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Check className="h-4 w-4 text-green-500" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{script.disabled ? "启用" : "禁用"}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="text-sm text-muted-foreground mt-1 mb-2 line-clamp-1">
                    {script.findRegex}
                  </div>
                  
                  <div className="flex items-center justify-end gap-1 mt-2">
                    <TooltipProvider>
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
                            onClick={() => setConfirmDelete(script.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>删除</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
      
      {/* 删除确认对话框 */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p>您确定要删除这个正则表达式脚本吗？此操作无法撤销。</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && handleDeleteConfirm(confirmDelete)}
            >
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 