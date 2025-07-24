"use client";

import { WorldBook } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { Download, Edit, Trash, Users } from "lucide-react";

interface WorldBookListItemProps {
  worldBook: WorldBook;
  characterCount: number;
  onExport: () => void;
  onDelete: () => void;
  onToggleEnabled: () => void;
}

export function WorldBookListItem({
  worldBook,
  characterCount,
  onExport,
  onDelete,
  onToggleEnabled
}: WorldBookListItemProps) {
  return (
    <div className={`flex items-center border rounded-lg p-3 hover:bg-muted/30 transition-colors ${!worldBook.enabled ? 'opacity-60' : ''}`}>
      {/* 状态开关 */}
      <div className="flex-shrink-0 mr-4">
        <Switch 
          checked={worldBook.enabled} 
          onCheckedChange={onToggleEnabled}
          aria-label={worldBook.enabled ? "禁用世界书" : "启用世界书"}
        />
      </div>
      
      {/* 世界书信息 */}
      <div className="flex-1 min-w-0">
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
        
        <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
          <span>条目: {worldBook.entries.length}</span>
          <span>•</span>
          <span>创建: {new Date(worldBook.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      
      {/* 操作按钮 */}
      <div className="flex items-center space-x-1 ml-2">
        <Button 
          variant="ghost" 
          size="icon"
          asChild
          className="h-8 w-8"
        >
          <Link href={`/worldbooks/${worldBook.id}`}>
            <Edit className="h-4 w-4" />
          </Link>
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onExport}
          className="h-8 w-8"
        >
          <Download className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 text-destructive hover:text-destructive"
        >
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 