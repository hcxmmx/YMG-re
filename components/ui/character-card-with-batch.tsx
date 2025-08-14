"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Character, Conversation } from "@/lib/types";
import { MessageCircle, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { characterStorage } from "@/lib/storage";
import Image from "next/image";
import { generateId } from "@/lib/utils"; 
import { useRouter } from "next/navigation";
import { useChatStore } from "@/lib/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CharacterCardWithBatchProps {
  character: Character;
  onEdit?: () => void;
  onDelete?: () => void;
  
  // 批量选择相关
  isSelected?: boolean;
  onToggleSelection?: () => void;
  showCheckbox?: boolean;
  batchMode?: boolean;
}

export function CharacterCardWithBatch({ 
  character, 
  onEdit, 
  onDelete,
  isSelected = false,
  onToggleSelection,
  showCheckbox = false,
  batchMode = false
}: CharacterCardWithBatchProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [characterConversations, setCharacterConversations] = useState<Conversation[]>([]);
  const { getCharacterConversations, conversations, getLastSelectedCharacterConversation } = useChatStore();
  const router = useRouter();
  
  const { id, name, description, avatar, tags } = character;
  
  // 获取角色相关的对话
  useEffect(() => {
    const convs = getCharacterConversations(id);
    setCharacterConversations(convs);
  }, [id, getCharacterConversations, conversations]);
  
  // 获取该角色最后选择的对话ID
  const lastSelectedConversationId = getLastSelectedCharacterConversation(id);
  
  const handleDelete = async () => {
    if (isDeleting) {
      try {
        // 先获取该角色的所有对话
        const characterChats = getCharacterConversations(id);
        
        // 删除角色
        await characterStorage.deleteCharacter(id);
        
        // 删除该角色的所有聊天记录
        const deletePromises = characterChats.map(chat => 
          useChatStore.getState().deleteConversation(chat.id)
        );
        
        await Promise.all(deletePromises);
        onDelete?.();
      } catch (error) {
        console.error('删除角色失败:', error);
      }
    } else {
      setIsDeleting(true);
      setTimeout(() => setIsDeleting(false), 3000);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  const handleStartChat = () => {
    if (batchMode && onToggleSelection) {
      // 在批量模式下，点击卡片切换选择状态
      onToggleSelection();
      return;
    }

    // 正常的聊天逻辑
    if (lastSelectedConversationId) {
      router.push(`/chat?conversationId=${lastSelectedConversationId}`);
    } else {
      router.push(`/chat?characterId=${id}`);
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    if (onToggleSelection) {
      onToggleSelection();
    }
  };

  return (
    <div className={`
      relative group bg-card text-card-foreground rounded-lg border transition-all duration-200 cursor-pointer overflow-hidden
      ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'}
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

      {/* 角色头像 */}
      <div 
        className="relative w-full h-48 bg-muted flex items-center justify-center overflow-hidden"
        onClick={handleStartChat}
      >
        {avatar ? (
          <Image
            src={avatar}
            alt={name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="text-4xl text-gray-400">
            👤
          </div>
        )}
        
        {/* 对话数量徽章 */}
        {characterConversations.length > 0 && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
            {characterConversations.length} 对话
          </div>
        )}
      </div>

      {/* 角色信息 */}
      <div className="p-4" onClick={handleStartChat}>
        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{name}</h3>
        
        {description && (
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{description}</p>
        )}
        
        {/* 标签 */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-muted-foreground px-2 py-1">+{tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="px-4 pb-4">
        {!batchMode ? (
          <div className="flex justify-between items-center gap-2">
            <Button 
              variant="default" 
              size="sm"
              onClick={handleStartChat}
              className="flex-1"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              开始聊天
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            <Button 
              variant={isDeleting ? "destructive" : "outline"}
              size="sm"
              onClick={handleDelete}
              title={isDeleting ? "确认删除" : "删除角色"}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleStartChat}
              className="flex-1"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              开始聊天
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
                  编辑角色
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除角色
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}
