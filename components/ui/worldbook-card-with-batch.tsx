"use client";

import { WorldBook } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { Download, Edit, Trash, Users } from "lucide-react";

interface WorldBookCardWithBatchProps {
  worldBook: WorldBook;
  characterCount: number;
  onExport: () => void;
  onDelete: () => void;
  onToggleEnabled: () => void;
  
  // 批量选择相关
  isSelected?: boolean;
  onToggleSelection?: () => void;
  batchMode?: boolean;
}

export function WorldBookCardWithBatch({
  worldBook,
  characterCount,
  onExport,
  onDelete,
  onToggleEnabled,
  isSelected = false,
  onToggleSelection,
  batchMode = false
}: WorldBookCardWithBatchProps) {
  return (
    <Card className={`${!worldBook.enabled ? 'opacity-60' : ''} ${batchMode && isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            {batchMode && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggleSelection}
                className="shrink-0"
                aria-label={`选择世界书 ${worldBook.name}`}
              />
            )}
            <Switch 
              checked={worldBook.enabled} 
              onCheckedChange={onToggleEnabled}
              aria-label={worldBook.enabled ? "禁用世界书" : "启用世界书"}
              disabled={batchMode}
            />
            <span className="text-sm text-muted-foreground">
              {worldBook.enabled ? "已启用" : "已禁用"}
            </span>
          </div>
          
          {characterCount > 0 && (
            <div className="flex items-center text-sm">
              <Users className="h-4 w-4 mr-1 text-blue-500" />
              <span className="text-blue-500">{characterCount} 个角色</span>
            </div>
          )}
        </div>
        
        <CardTitle className="truncate">{worldBook.name}</CardTitle>
        <CardDescription>
          {worldBook.description || "无描述"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          <div>条目数量: {worldBook.entries.length}</div>
          <div>创建时间: {new Date(worldBook.createdAt).toLocaleDateString()}</div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm" asChild disabled={batchMode}>
          <Link href={batchMode ? "#" : `/worldbooks/${worldBook.id}`}>
            <Edit className="h-4 w-4 mr-1" />
            编辑
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onExport}
            disabled={batchMode}
          >
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-red-500 hover:text-red-600" 
            onClick={onDelete}
            disabled={batchMode}
          >
            <Trash className="h-4 w-4 mr-1" />
            删除
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
