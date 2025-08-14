"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Edit, Trash2, ChevronRight, Sliders, Check, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PresetListItemWithBatchProps {
  preset: {
    id: string;
    name: string;
    description?: string;
    temperature?: number;
    prompts: { enabled: boolean }[];
  };
  onExport: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  
  // 批量选择相关
  isSelected?: boolean;
  onToggleSelection?: () => void;
  showCheckbox?: boolean;
  batchMode?: boolean;
}

export function PresetListItemWithBatch({ 
  preset, 
  onExport, 
  onDelete,
  isSelected = false,
  onToggleSelection,
  showCheckbox = false,
  batchMode = false
}: PresetListItemWithBatchProps) {

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

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExport(preset.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(preset.id, preset.name);
  };

  return (
    <div className={`
      flex items-center border rounded-lg p-3 transition-all duration-200 cursor-pointer
      ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/30'}
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

      {/* 预设信息 */}
      <div className="flex-1 min-w-0" onClick={handleClick}>
        <h3 className="font-medium text-base truncate">{preset.name}</h3>
        
        <p className="text-muted-foreground text-sm line-clamp-1">
          {preset.description || "无描述"}
        </p>
        
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <Badge variant="outline" className="bg-primary/10 text-xs">
            <Sliders className="h-3 w-3 mr-1" />
            温度: {preset.temperature?.toFixed(1) || "0.7"}
          </Badge>
          <Badge variant="outline" className="bg-primary/10 text-xs">
            <Check className="h-3 w-3 mr-1" />
            已启用: {preset.prompts.filter(p => p.enabled).length}/{preset.prompts.length}
          </Badge>
        </div>
      </div>
      
      {/* 操作按钮 */}
      {!batchMode && (
        <div className="flex items-center space-x-1 ml-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleExport}
                  className="h-8 w-8"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>导出预设</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleDelete}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>删除预设</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/presets/${preset.id}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>编辑预设</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
                <Link href={`/presets/${preset.id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  编辑预设
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                导出预设
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                删除预设
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
