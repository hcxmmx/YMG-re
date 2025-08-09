"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Edit, Trash2, ChevronRight, Sliders, Check } from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PresetListItemProps {
  preset: {
    id: string;
    name: string;
    description?: string;
    temperature?: number;
    prompts: { enabled: boolean }[];
  };
  onExport: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

export function PresetListItem({ preset, onExport, onDelete }: PresetListItemProps) {
  return (
    <div className="flex items-center border rounded-lg p-3 hover:bg-muted/30 transition-colors">
      {/* 预设信息 */}
      <div className="flex-1 min-w-0">
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
      <div className="flex items-center space-x-1 ml-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                onClick={() => onExport(preset.id)}
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>导出预设</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                asChild
              >
                <Link href={`/presets/${preset.id}`}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>编辑预设</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* 默认预设不显示删除按钮 */}
        {preset.id !== 'default' && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(preset.id, preset.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>删除预设</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                asChild
                className="h-8 w-8"
              >
                <Link href={`/presets/${preset.id}/detail`}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>查看详情</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
} 