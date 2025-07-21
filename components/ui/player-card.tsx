"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Player } from "@/lib/types";
import { Check, Edit, Trash2, User } from "lucide-react";
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

interface PlayerCardProps {
  player: Player;
  isActive: boolean;
  onSelect: (player: Player) => void;
  onEdit: (player: Player) => void;
  onDelete: (player: Player) => void;
}

export function PlayerCard({ player, isActive, onSelect, onEdit, onDelete }: PlayerCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const { name, description, avatar, createdAt } = player;
  
  return (
    <>
      <div className={`border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${isActive ? 'border-primary ring-1 ring-primary/20' : ''}`}>
        <div className="relative aspect-square bg-gray-100">
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
          {isActive && (
            <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
              <Check size={16} />
            </div>
          )}
        </div>
        
        <div className="p-4 space-y-2">
          <h3 className="font-medium text-lg truncate">{name}</h3>
          
          {description && (
            <p className="text-muted-foreground text-sm line-clamp-2">{description}</p>
          )}
          
          <div className="text-xs text-muted-foreground mt-2">
            创建于 {formatDate(createdAt)}
          </div>
          
          <div className="flex space-x-2 pt-2">
            <Button 
              variant={isActive ? "secondary" : "default"}
              size="sm"
              className="flex-1 flex items-center gap-1"
              onClick={() => onSelect(player)}
            >
              {isActive ? "当前选择" : "选择"}
            </Button>
          </div>
          
          <div className="flex space-x-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 flex items-center gap-1"
              onClick={() => onEdit(player)}
            >
              <Edit className="h-3.5 w-3.5" />
              编辑
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="flex-1 flex items-center gap-1 text-destructive hover:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              删除
            </Button>
          </div>
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