"use client";

import { WorldBook } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { Download, Edit, Trash, Users, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WorldBookListItemWithBatchProps {
  worldBook: WorldBook;
  characterCount: number;
  onExport: () => void;
  onDelete: () => void;
  onToggleEnabled: () => void;
  
  // 批量选择相关
  isSelected?: boolean;
  onToggleSelection?: () => void;
  showCheckbox?: boolean;
  batchMode?: boolean;
}

export function WorldBookListItemWithBatch({
  worldBook,
  characterCount,
  onExport,
  onDelete,
  onToggleEnabled,
  isSelected = false,
  onToggleSelection,
  showCheckbox = false,
  batchMode = false
}: WorldBookListItemWithBatchProps) {

  const handleCheckboxChange = (checked: boolean) => {
    if (onToggleSelection) {
      onToggleSelection();
    }
  };

  const handleClick = () => {
    if (batchMode && onToggleSelection) {
      onToggleSelection();
    }
  };

  return (
    <div className={`
      flex items-center border rounded-lg p-3 transition-all duration-200 cursor-pointer
      ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/30'}
      ${!worldBook.enabled ? 'opacity-60' : ''}
      ${batchMode ? 'hover:bg-muted/50' : ''}
    `}>
      {/* 批量选择复选框 */}
      {showCheckbox && (
        <div className="mr-3 flex items-center">
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 状态开关 */}
      <div className="flex-shrink-0 mr-4">
        <Switch 
          checked={worldBook.enabled} 
          onCheckedChange={onToggleEnabled}
          aria-label={worldBook.enabled ? "禁用世界书" : "启用世界书"}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      
      {/* 世界书信息 */}
      <div className="flex-1 min-w-0" onClick={handleClick}>
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-base truncate">{worldBook.name}</h3>
          
          {characterCount > 0 && (
            <div className="flex items-center text-xs ml-2 flex-shrink-0">
              <Users className="h-3 w-3 mr-0.5 text-blue-500" />
              <span className="text-blue-500">{characterCount}</span>
            </div>
          )}
        </div>
        
        <p className="text-muted-foreground text-sm line-clamp-1">
          {worldBook.description || "无描述"}
        </p>
        
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{worldBook.entries.length} 个条目</span>
          <span>•</span>
          <span>创建于 {new Date(worldBook.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      
      {/* 操作按钮 */}
      {!batchMode && (
        <div className="flex items-center space-x-1 ml-2">
          {/* 编辑链接 */}
          <Link href={`/worldbooks/${worldBook.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
          
          {/* 导出按钮 */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onExport}
            className="h-8 w-8"
          >
            <Download className="h-4 w-4" />
          </Button>
          
          {/* 删除按钮 */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onDelete}
            className="h-8 w-8"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 批量模式下的更多操作 */}
      {batchMode && (
        <div className="ml-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/worldbooks/${worldBook.id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  编辑世界书
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport}>
                <Download className="mr-2 h-4 w-4" />
                导出世界书
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash className="mr-2 h-4 w-4" />
                删除世界书
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
