"use client";

import { useState, useMemo, ReactNode, useEffect } from "react";
import { BatchSelectionToolbar, BatchManagerItem, BatchAction } from "./batch-manager";

// 重新导出 BatchAction 以便其他组件使用
export type { BatchAction, BatchManagerItem };

// 批量管理容器的属性
export interface BatchManagementContainerProps<T extends BatchManagerItem> {
  // 数据相关
  items: T[];
  
  // 批量操作配置
  actions: BatchAction[];
  itemName: string;
  maxSelection?: number;
  
  // 渲染相关
  children: (props: {
    selectedIds: string[];
    isSelected: (id: string) => boolean;
    toggleSelection: (id: string) => void;
    clearSelection: () => void;
  }) => ReactNode;
  
  // 样式相关
  className?: string;
  toolbarClassName?: string;
  compact?: boolean;
  
  // 事件
  onSelectionChange?: (selectedIds: string[]) => void;
  
  // 快捷键支持
  enableKeyboardShortcuts?: boolean;
  showKeyboardHints?: boolean;
  
  // 批量模式控制
  batchMode?: boolean; // 是否显示批量管理工具栏
}

// 批量管理容器组件
export function BatchManagementContainer<T extends BatchManagerItem>({
  items,
  actions,
  itemName,
  maxSelection,
  children,
  className = "",
  toolbarClassName = "",
  compact = false,
  onSelectionChange,
  enableKeyboardShortcuts = false,
  showKeyboardHints = false,
  batchMode = false
}: BatchManagementContainerProps<T>) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 处理选择变化
  const handleSelectionChange = (newSelectedIds: string[]) => {
    setSelectedIds(newSelectedIds);
    onSelectionChange?.(newSelectedIds);
  };

  // 键盘快捷键支持
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+A 全选
      if (event.ctrlKey && event.key === 'a') {
        event.preventDefault();
        const allIds = items.map(item => item.id);
        handleSelectionChange(allIds);
      }
      // Escape 取消选择
      else if (event.key === 'Escape') {
        event.preventDefault();
        handleSelectionChange([]);
      }
      // Ctrl+I 反选
      else if (event.ctrlKey && event.key === 'i') {
        event.preventDefault();
        const unselectedIds = items
          .filter(item => !selectedIds.includes(item.id))
          .map(item => item.id);
        handleSelectionChange(unselectedIds);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIds, enableKeyboardShortcuts, handleSelectionChange]);

  // 检查是否选中
  const isSelected = (id: string) => selectedIds.includes(id);

  // 切换选择状态
  const toggleSelection = (id: string) => {
    if (isSelected(id)) {
      handleSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      // 检查是否达到最大选择数量
      if (maxSelection && selectedIds.length >= maxSelection) {
        return;
      }
      handleSelectionChange([...selectedIds, id]);
    }
  };

  // 清空选择
  const clearSelection = () => {
    handleSelectionChange([]);
  };

  return (
    <div className={className}>
      {/* 批量选择工具栏 - 只在批量模式下显示 */}
      {batchMode && (
        <BatchSelectionToolbar
          items={items}
          selectedIds={selectedIds}
          onSelectionChange={handleSelectionChange}
          actions={actions}
          itemName={itemName}
          maxSelection={maxSelection}
          className={toolbarClassName}
          compact={compact}
          showKeyboardHints={showKeyboardHints}
        />
      )}
      
      {/* 渲染子组件，传递选择相关的方法 */}
      {children({
        selectedIds,
        isSelected,
        toggleSelection,
        clearSelection
      })}
    </div>
  );
}

// 列表项增强HOC - 为现有列表项组件添加批量选择功能
export interface WithBatchSelectionProps {
  // 批量选择相关
  id: string;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  showCheckbox?: boolean;
  disabled?: boolean;
}

export function withBatchSelection<P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<P & WithBatchSelectionProps> {
  return function WithBatchSelectionComponent(props: P & WithBatchSelectionProps) {
    const { 
      id,
      isSelected = false, 
      onToggleSelection, 
      showCheckbox = true,
      disabled = false,
      ...restProps 
    } = props;

    const handleCheckboxChange = (checked: boolean) => {
      if (onToggleSelection && !disabled) {
        onToggleSelection(id);
      }
    };

    return (
      <div className="relative group">
        {/* 选择遮罩 */}
        {isSelected && (
          <div className="absolute inset-0 bg-primary/10 rounded-lg pointer-events-none z-10" />
        )}
        
        {/* 选择复选框 */}
        {showCheckbox && (
          <div className={`
            absolute top-2 left-2 z-20 transition-opacity duration-200
            ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleCheckboxChange(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
            />
          </div>
        )}
        
        {/* 原始组件 */}
        <div className={`${showCheckbox ? 'ml-6' : ''} ${isSelected ? 'ring-2 ring-primary rounded-lg' : ''}`}>
          <WrappedComponent {...(restProps as P)} />
        </div>
      </div>
    );
  };
}

// 网格视图批量选择容器
export interface BatchGridProps<T extends BatchManagerItem> {
  items: T[];
  actions: BatchAction[];
  itemName: string;
  maxSelection?: number;
  compact?: boolean;
  batchMode?: boolean;
  renderItem: (item: T, props: {
    isSelected: boolean;
    onToggleSelection: () => void;
  }) => ReactNode;
  className?: string;
  gridClassName?: string;
  onSelectionChange?: (selectedIds: string[]) => void;
}

export function BatchGrid<T extends BatchManagerItem>({
  items,
  actions,
  itemName,
  maxSelection,
  compact = false,
  batchMode = false,
  renderItem,
  className = "",
  gridClassName = "",
  onSelectionChange
}: BatchGridProps<T>) {
  return (
    <BatchManagementContainer
      items={items}
      actions={actions}
      itemName={itemName}
      maxSelection={maxSelection}
      compact={compact}
      batchMode={batchMode}
      className={className}
      onSelectionChange={onSelectionChange}
    >
      {({ selectedIds, isSelected, toggleSelection }) => (
        <div className={`grid gap-4 ${gridClassName}`}>
          {items.map((item) => renderItem(item, {
            isSelected: isSelected(item.id),
            onToggleSelection: () => toggleSelection(item.id)
          }))}
        </div>
      )}
    </BatchManagementContainer>
  );
}

// 列表视图批量选择容器
export interface BatchListProps<T extends BatchManagerItem> {
  items: T[];
  actions: BatchAction[];
  itemName: string;
  maxSelection?: number;
  compact?: boolean;
  batchMode?: boolean;
  renderItem: (item: T, props: {
    isSelected: boolean;
    onToggleSelection: () => void;
  }) => ReactNode;
  className?: string;
  listClassName?: string;
  onSelectionChange?: (selectedIds: string[]) => void;
}

export function BatchList<T extends BatchManagerItem>({
  items,
  actions,
  itemName,
  maxSelection,
  compact = false,
  batchMode = false,
  renderItem,
  className = "",
  listClassName = "",
  onSelectionChange
}: BatchListProps<T>) {
  return (
    <BatchManagementContainer
      items={items}
      actions={actions}
      itemName={itemName}
      maxSelection={maxSelection}
      compact={compact}
      batchMode={batchMode}
      className={className}
      onSelectionChange={onSelectionChange}
    >
      {({ selectedIds, isSelected, toggleSelection }) => (
        <div className={`space-y-2 ${listClassName}`}>
          {items.map((item) => renderItem(item, {
            isSelected: isSelected(item.id),
            onToggleSelection: () => toggleSelection(item.id)
          }))}
        </div>
      )}
    </BatchManagementContainer>
  );
}
