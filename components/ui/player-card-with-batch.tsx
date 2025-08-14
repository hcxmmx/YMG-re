"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Player } from "@/lib/types";
import { Check, Edit, Trash2, User, MoreHorizontal } from "lucide-react";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
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

interface PlayerCardWithBatchProps {
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

export function PlayerCardWithBatch({ 
  player, 
  isActive, 
  onSelect, 
  onEdit, 
  onDelete,
  isSelected = false,
  onToggleSelection,
  showCheckbox = false,
  batchMode = false
}: PlayerCardWithBatchProps) {
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
        relative bg-card text-card-foreground border rounded-lg overflow-hidden transition-all duration-200 cursor-pointer
        ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'shadow-sm hover:shadow-md'}
        ${isActive && !batchMode ? 'border-primary ring-1 ring-primary/20' : ''}
        ${batchMode ? 'hover:bg-muted/50' : ''}
      `}>
        {/* 批量选择复选框 */}
        {showCheckbox && (
          <div className="absolute top-3 left-3 z-20">
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()}
              className="bg-background/80 backdrop-blur"
            />
          </div>
        )}

        {/* 玩家头像区域 */}
        <div className="relative aspect-square bg-gray-100" onClick={handleSelect}>
          {avatar ? (
            <Image
              src={avatar}
              alt={name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <User size={64} />
            </div>
          )}
          {isActive && !batchMode && (
            <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
              <Check size={16} />
            </div>
          )}
        </div>

        {/* 玩家信息 */}
        <div className="p-4" onClick={handleSelect}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-lg truncate">{name}</h3>
            {isActive && !batchMode && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                当前
              </span>
            )}
          </div>
          
          {description && (
            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{description}</p>
          )}
          
          <p className="text-xs text-muted-foreground">
            创建于 {formatDate(new Date(createdAt))}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="px-4 pb-4">
          {!batchMode ? (
            <div className="flex gap-2">
              {!isActive && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSelect}
                  className="flex-1"
                >
                  选择
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelect}
                className="flex-1"
              >
                {!isActive ? "选择" : "当前玩家"}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-2">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
