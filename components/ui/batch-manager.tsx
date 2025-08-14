"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Trash2, 
  Download, 
  CheckSquare, 
  Square,
  MoreHorizontal,
  AlertTriangle,
  RotateCcw,
  Minus
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 通用数据项接口 - 所有需要批量管理的数据都应该有这些基础字段
export interface BatchManagerItem {
  id: string;
  name: string;
}

// 批量操作类型
export interface BatchAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  confirmMessage?: string;
  confirmTitle?: string;
  handler: (selectedIds: string[]) => Promise<void> | void;
}

// 批量管理器属性
export interface BatchManagerProps<T extends BatchManagerItem> {
  // 数据相关
  items: T[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  
  // 操作相关
  actions?: BatchAction[];
  
  // 自定义配置
  itemName?: string; // 项目名称，用于显示 "选中了 3 个角色"
  maxSelection?: number; // 最大选择数量
  showKeyboardHints?: boolean; // 显示键盘快捷键提示
  
  // 样式相关
  className?: string;
  compact?: boolean; // 紧凑模式
}

// 批量选择工具栏
export function BatchSelectionToolbar<T extends BatchManagerItem>({
  items,
  selectedIds,
  onSelectionChange,
  actions = [],
  itemName = "项目",
  maxSelection,
  className = "",
  compact = false,
  showKeyboardHints = false
}: BatchManagerProps<T>) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    action: () => {}
  });

  // 计算选择状态
  const isAllSelected = useMemo(() => {
    return items.length > 0 && selectedIds.length === items.length;
  }, [items, selectedIds]);

  const isPartialSelected = useMemo(() => {
    return selectedIds.length > 0 && selectedIds.length < items.length;
  }, [items, selectedIds]);

  // 处理全选/取消全选
  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      const allIds = items.map(item => item.id);
      onSelectionChange(allIds);
    }
  };

  // 处理反选
  const handleInvertSelection = () => {
    const allIds = items.map(item => item.id);
    const invertedIds = allIds.filter(id => !selectedIds.includes(id));
    onSelectionChange(invertedIds);
  };

  // 处理清空选择
  const handleClearSelection = () => {
    onSelectionChange([]);
  };

  // 处理批量操作
  const handleBatchAction = (action: BatchAction) => {
    if (selectedIds.length === 0) return;

    if (action.confirmMessage) {
      setConfirmDialog({
        open: true,
        title: action.confirmTitle || `确认${action.label}`,
        message: action.confirmMessage.replace("{count}", selectedIds.length.toString()).replace("{itemName}", itemName),
        action: async () => {
          try {
            await action.handler(selectedIds);
            onSelectionChange([]); // 操作完成后清空选择
          } catch (error) {
            console.error(`批量${action.label}失败:`, error);
          }
        }
      });
    } else {
      action.handler(selectedIds);
      onSelectionChange([]);
    }
  };

  return (
    <>
      <div className={`
        sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 
        border-b border-border flex flex-col
        ${className}
      `}>
        {/* 主工具栏 */}
        <div className={`
          p-3 flex items-center justify-between gap-3
          ${compact ? 'py-2' : 'py-3'}
        `}>
        {/* 左侧：批量选择操作按钮 */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={handleSelectAll}
            className="gap-2"
          >
            {isAllSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            {isAllSelected ? "取消全选" : "全选"}
          </Button>
          
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={handleInvertSelection}
            className="gap-2"
            disabled={items.length === 0}
          >
            <RotateCcw className="h-4 w-4" />
            反选
          </Button>
          
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={handleClearSelection}
            className="gap-2"
            disabled={selectedIds.length === 0}
          >
            <Minus className="h-4 w-4" />
            清除
          </Button>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={compact ? "text-xs px-2 py-0.5" : ""}>
              已选择 {selectedIds.length} / {items.length} 个{itemName}
            </Badge>
            
            {/* 进度条 */}
            {!compact && items.length > 0 && (
              <div className="flex items-center gap-2 min-w-[100px]">
                <Progress 
                  value={(selectedIds.length / items.length) * 100} 
                  className="h-2 w-20"
                />
                <span className="text-xs text-muted-foreground">
                  {Math.round((selectedIds.length / items.length) * 100)}%
                </span>
              </div>
            )}
            
            {maxSelection && selectedIds.length >= maxSelection && (
              <Badge variant="destructive" className={compact ? "text-xs px-2 py-0.5" : ""}>
                达到上限 ({maxSelection})
              </Badge>
            )}
          </div>
        </div>

        {/* 右侧：批量操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 主要操作按钮 */}
          {actions.slice(0, compact ? 1 : 3).map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant={action.variant || "outline"}
                size={compact ? "sm" : "default"}
                onClick={() => handleBatchAction(action)}
                disabled={selectedIds.length === 0}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {!compact && action.label}
              </Button>
            );
          })}

          {/* 更多操作下拉菜单 */}
          {actions.length > (compact ? 1 : 3) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size={compact ? "sm" : "default"}
                  disabled={selectedIds.length === 0}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  {!compact && "更多"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.slice(compact ? 1 : 3).map((action) => {
                  const Icon = action.icon;
                  return (
                    <DropdownMenuItem
                      key={action.id}
                      onClick={() => handleBatchAction(action)}
                      className={action.variant === "destructive" ? "text-destructive" : ""}
                      disabled={selectedIds.length === 0}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {action.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        </div>

        {/* 快捷键提示 */}
        {showKeyboardHints && !compact && (
          <div className="px-3 pb-2 text-xs text-muted-foreground border-t bg-muted/20">
            快捷键: Ctrl+A 全选 | Ctrl+I 反选 | Esc 取消选择
          </div>
        )}
      </div>

      {/* 确认对话框 */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {confirmDialog.title}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                confirmDialog.action();
                setConfirmDialog(prev => ({ ...prev, open: false }));
              }}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 单项选择复选框组件
export interface BatchItemCheckboxProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function BatchItemCheckbox({ 
  id, 
  checked, 
  onCheckedChange, 
  disabled = false,
  className = ""
}: BatchItemCheckboxProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="mr-2"
      />
    </div>
  );
}
