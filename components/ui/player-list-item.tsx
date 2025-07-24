"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Player } from "@/lib/types";
import { Check, Edit, Trash2, User } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface PlayerListItemProps {
  player: Player;
  isActive: boolean;
  onSelect: (player: Player) => void;
  onEdit: (player: Player) => void;
  onDelete: (player: Player) => void;
}

export function PlayerListItem({ player, isActive, onSelect, onEdit, onDelete }: PlayerListItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const { name, description, avatar, createdAt } = player;
  
  return (
    <>
      <div className="flex items-center border rounded-lg p-3 hover:bg-muted/30 transition-colors">
        {/* 玩家头像 */}
        <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-muted">
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
          {isActive && (
            <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-0.5">
              <Check size={12} />
            </div>
          )}
        </div>
        
        {/* 玩家信息 */}
        <div className="ml-4 flex-1 min-w-0">
          <div className="flex items-center">
            <h3 className="font-medium text-base truncate">{name}</h3>
            {isActive && (
              <span className="ml-2 text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                当前选择
              </span>
            )}
          </div>
          
          {description && (
            <p className="text-muted-foreground text-sm line-clamp-1">{description}</p>
          )}
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center space-x-1 ml-2">
          <Button 
            variant={isActive ? "secondary" : "outline"}
            size="sm"
            onClick={() => onSelect(player)}
            className="h-8 px-2"
          >
            {isActive ? "已选择" : "选择"}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onEdit(player)}
            className="h-8 w-8"
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除玩家</DialogTitle>
            <DialogDescription>
              确定要删除玩家"{name}"吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                onDelete(player);
                setShowDeleteDialog(false);
              }}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 