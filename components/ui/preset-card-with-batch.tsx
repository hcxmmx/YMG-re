"use client";

import { PromptPreset } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import { Download, Edit, Trash2, Sliders, Check, ChevronRight } from "lucide-react";

interface PresetCardWithBatchProps {
  preset: PromptPreset;
  onExport: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  
  // 批量选择相关
  isSelected?: boolean;
  onToggleSelection?: () => void;
  batchMode?: boolean;
}

export function PresetCardWithBatch({
  preset,
  onExport,
  onDelete,
  isSelected = false,
  onToggleSelection,
  batchMode = false
}: PresetCardWithBatchProps) {
  return (
    <Card className={`flex flex-col overflow-hidden hover:shadow-md transition-shadow ${batchMode && isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-medium">{preset.name}</CardTitle>
            <CardDescription className="line-clamp-2 min-h-[2.5rem]">
              {preset.description || "无描述"}
            </CardDescription>
          </div>
          {batchMode && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelection}
              className="shrink-0 mt-1"
              aria-label={`选择预设 ${preset.name}`}
            />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pb-3 flex-grow">
        <div className="flex flex-wrap gap-1.5 mb-2">
          <Badge variant="outline" className="bg-primary/10">
            <Sliders className="h-3 w-3 mr-1" />
            温度: {preset.temperature?.toFixed(1) || "0.7"}
          </Badge>
          <Badge variant="outline" className="bg-primary/10">
            <Check className="h-3 w-3 mr-1" />
            已启用: {preset.prompts.filter(p => p.enabled).length}/{preset.prompts.length}
          </Badge>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 flex justify-between border-t bg-muted/20">
        <div className="flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => onExport(preset.id)}
                  disabled={batchMode}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>导出预设</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                  <Link href={batchMode ? "#" : `/presets/${preset.id}`}>
                    <Edit className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>编辑预设</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => onDelete(preset.id, preset.name)}
                  disabled={batchMode}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>删除预设</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <Button size="sm" asChild className="h-8" disabled={batchMode}>
          <Link href={batchMode ? "#" : `/presets/${preset.id}/detail`}>
            查看
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
