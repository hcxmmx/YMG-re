"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Player } from "@/lib/types";
import { Check, Edit, Trash2, User, MoreHorizontal } from "lucide-react";
import Image from "next/image";
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

interface PlayerListItemWithBatchProps {
  player: Player;
  isActive: boolean;
  onSelect: (player: Player) => void;
  onEdit: (player: Player) => void;
  onDelete: (player: Player) => void;
  
  // 批量选择相关
  isSelected?: boolean;
  onToggleSelection?: () => void;
  showCheckbox?: boolean;
  batchMode?: boolean;
}

export function PlayerListItemWithBatch({ 
  player, 
  isActive, 
  onSelect, 
  onEdit, 
  onDelete,
  isSelected = false,
  onToggleSelection,
  showCheckbox = false,
  batchMode = false
}: PlayerListItemWithBatchProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const { name, description, avatar, createdAt } = player;

  const handleSelect = () => {
    if (batchMode && onToggleSelection) {
      onToggleSelection();
    } else {
      onSelect(player);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(player);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    onDelete(player);
    setShowDeleteDialog(false);
  };

  const handleCheckboxChange = (checked: boolean) => {
    if (onToggleSelection) {
      onToggleSelection();
    }
  };
  
  return (
    <>
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

        {/* 玩家头像 */}
        <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-muted" onClick={handleSelect}>
          {avatar ? (
            <Image
              src={avatar}
              alt={name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <User className="h-8 w-8" />
            </div>
          )}
          {isActive && !batchMode && (
            <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-0.5">
              <Check size={12} />
            </div>
          )}
        </div>

        {/* 玩家信息 */}
        <div className="ml-4 flex-1 min-w-0" onClick={handleSelect}>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-base truncate">{name}</h3>
            {isActive && !batchMode && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                当前
              </span>
            )}
          </div>
          
          {description && (
            <p className="text-muted-foreground text-sm line-clamp-1 mt-1">{description}</p>
          )}
          
          <p className="text-xs text-muted-foreground mt-1">
            创建于 {new Date(createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* 操作按钮 */}
        {!batchMode && (
          <div className="flex items-center space-x-2 ml-2">
            {!isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelect}
              >
                选择
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEdit}
              className="h-8 w-8"
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
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
                {!isActive && (
                  <DropdownMenuItem onClick={handleSelect}>
                    <Check className="mr-2 h-4 w-4" />
                    选择为当前玩家
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  编辑玩家
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除玩家
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除玩家 "{name}" 吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
