"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  PlusCircle, Import, Edit, Trash2, Download, 
  Sliders, Search, XCircle, Check, GripVertical, MoreHorizontal
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { useResponsiveView } from "@/lib/useResponsiveView";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useRef, useEffect } from "react";

interface RegexListProps {
  scripts: RegexScript[];
  onEdit: (scriptId: string) => void;
  onDelete: (scriptId: string) => void;
  onToggleEnabled: (scriptId: string) => void;
  onExport: (scriptId: string) => void;
  onImportClick: () => void;
  onCreateNew: () => void;
  onReorder?: (newOrder: RegexScript[]) => void; // 新增排序处理
}

// 可排序的正则表达式脚本项
interface SortableScriptItemProps {
  script: RegexScript;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string) => void;
  onExport: (id: string) => void;
  setConfirmDelete: (id: string | null) => void;
}

function SortableScriptItem({ 
  script, 
  onEdit, 
  onDelete, 
  onToggleEnabled, 
  onExport,
  setConfirmDelete 
}: SortableScriptItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: script.id,
    transition: {
      duration: 150,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        `select-none ${script.disabled ? 'opacity-60' : ''}`,
        isDragging && 'shadow-lg opacity-90'
      )}
    >
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 w-full">
            {/* 拖动手柄 */}
            <span
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing touch-manipulation rounded-full hover:bg-muted/50 active:text-primary p-1"
              data-drag-handle
            >
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
  );
}

// 简化版可排序脚本项 - 适用于移动端列表视图
interface SimplifiedScriptItemProps {
  script: RegexScript;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string) => void;
  onExport: (id: string) => void;
  setConfirmDelete: (id: string | null) => void;
}

function SimplifiedScriptItem({ 
  script, 
  onEdit, 
  onDelete, 
  onToggleEnabled, 
  onExport,
  setConfirmDelete 
}: SimplifiedScriptItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // 关闭菜单的点击外部处理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: script.id,
    // 移动端优化配置
    transition: {
      duration: 150,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center py-2 px-3 hover:bg-muted/30 transition-colors border-b last:border-b-0 min-w-max select-none touch-manipulation",
        script.disabled && "opacity-60",
        isDragging && "bg-accent shadow-lg rounded-md opacity-90"
      )}
    >
      {/* 拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-10 h-10 mr-1 flex-shrink-0 text-muted-foreground hover:text-foreground active:text-primary rounded-full hover:bg-muted/50 active:bg-muted cursor-grab active:cursor-grabbing touch-manipulation"
        data-drag-handle
      >
        <GripVertical className="h-5 w-5" />
      </div>
      
      {/* 脚本名称和标签 */}
      <div 
        className="w-0 flex-1 min-w-0 overflow-hidden py-1 mr-1 select-none" 
      >
        <div className="font-medium flex items-center flex-wrap">
          <span className={cn("truncate max-w-full block", script.disabled && "line-through")}>
            {script.scriptName}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {/* 应用位置标签 */}
          {script.placement.includes(1) && (
            <Badge variant="outline" className="text-xs flex-shrink-0 px-1 py-0">用户</Badge>
          )}
          {script.placement.includes(2) && (
            <Badge variant="outline" className="text-xs flex-shrink-0 px-1 py-0">AI</Badge>
          )}
          {script.placement.includes(3) && (
            <Badge variant="outline" className="text-xs flex-shrink-0 px-1 py-0">命令</Badge>
          )}
          {script.placement.includes(4) && (
            <Badge variant="outline" className="text-xs flex-shrink-0 px-1 py-0">提示词</Badge>
          )}
        </div>
      </div>
      
      {/* 功能按钮组 */}
      <div className="flex items-center gap-1 flex-shrink-0" style={{ width: "85px" }}>
        {/* 启用/禁用按钮 */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 rounded-full p-0 flex-shrink-0",
            !script.disabled ? "text-green-500" : "text-muted-foreground"
          )}
          onClick={() => onToggleEnabled(script.id)}
          title={script.disabled ? "启用" : "禁用"}
        >
          {script.disabled ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
        
        {/* 更多操作按钮 */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 rounded-full flex-shrink-0 p-0"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          
          {showMenu && (
            <div className="absolute right-0 z-10 mt-1 w-36 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                <button 
                  className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted/50 text-foreground"
                  onClick={() => {
                    onEdit(script.id);
                    setShowMenu(false);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  编辑
                </button>
                <button 
                  className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted/50 text-foreground"
                  onClick={() => {
                    onExport(script.id);
                    setShowMenu(false);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  导出
                </button>
                <button 
                  className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted/50 text-destructive"
                  onClick={() => {
                    setConfirmDelete(script.id);
                    setShowMenu(false);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function RegexList({
  scripts,
  onEdit,
  onDelete,
  onToggleEnabled,
  onExport,
  onImportClick,
  onCreateNew,
  onReorder
}: RegexListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  
  // 添加视图模式切换
  const [viewMode, setViewMode] = useResponsiveView('regex-script-view-mode');
  
  // 设置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // 优化指针传感器，减少长按触发选择的可能
        delay: 100,
        // 容忍一定的移动距离，避免轻微触摸被误认为拖拽
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // 过滤脚本
  const filteredScripts = searchTerm.trim() === ""
    ? scripts
    : scripts.filter(script => 
        script.scriptName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        script.findRegex.toLowerCase().includes(searchTerm.toLowerCase())
      );
  
  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = scripts.findIndex(script => script.id === active.id);
      const newIndex = scripts.findIndex(script => script.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newScripts = arrayMove(scripts, oldIndex, newIndex);
        onReorder?.(newScripts);
      }
    }
  };
  
  // 处理删除
  const handleDeleteConfirm = (id: string) => {
    onDelete(id);
    setConfirmDelete(null);
  };

  // 添加移动端拖拽优化的全局样式
  const GlobalDragStyles = () => {
    return (
      <style jsx global>{`
        /* 防止长按文本选择 */
        * {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }
        
        /* 输入框和文本域允许选择文本 */
        input, textarea {
          -webkit-user-select: text;
          user-select: text;
        }
        
        /* 增强移动端拖拽手感 */
        [data-drag-handle] {
          touch-action: none;
        }
        
        /* 提高拖拽时的视觉层级 */
        .sortable-item-dragging {
          z-index: 999 !important;
        }
      `}</style>
    );
  };
  
  return (
    <div className="w-full">
      {/* 添加全局拖拽优化样式 */}
      <GlobalDragStyles />
      
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
              className="md:flex hidden"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
          
          {/* 添加视图切换组件 */}
          <div className="mr-2">
            <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          </div>
          
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
                  <span className="hidden md:inline">新建脚本</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>创建新脚本</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* 脚本列表 */}
      <div className="max-h-[calc(100vh-12rem)] overflow-y-auto overflow-x-visible">
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            onDragStart={() => {
              // 触发触觉反馈（如果浏览器支持）
              if ('navigator' in window && 'vibrate' in navigator) {
                navigator.vibrate(50);
              }
            }}
            modifiers={[
              // 将拖拽项限制在垂直方向上移动
              restrictToVerticalAxis,
            ]}
          >
            <SortableContext
              items={filteredScripts.map(script => script.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {filteredScripts.map((script) => (
                  viewMode === 'list' ? (
                    <SimplifiedScriptItem
                      key={script.id}
                      script={script}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onToggleEnabled={onToggleEnabled}
                      onExport={onExport}
                      setConfirmDelete={setConfirmDelete}
                    />
                  ) : (
                    <SortableScriptItem
                      key={script.id}
                      script={script}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onToggleEnabled={onToggleEnabled}
                      onExport={onExport}
                      setConfirmDelete={setConfirmDelete}
                    />
                  )
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
      
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