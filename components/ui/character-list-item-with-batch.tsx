"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Character, Conversation } from "@/lib/types";
import { MessageCircle, Edit, Trash2, MoreHorizontal } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/lib/store";
import { characterStorage } from "@/lib/storage";
import { formatDate } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CharacterListItemWithBatchProps {
  character: Character;
  onEdit?: () => void;
  onDelete?: () => void;
  
  // 批量选择相关
  isSelected?: boolean;
  onToggleSelection?: () => void;
  showCheckbox?: boolean;
  batchMode?: boolean;
}

export function CharacterListItemWithBatch({ 
  character, 
  onEdit, 
  onDelete,
  isSelected = false,
  onToggleSelection,
  showCheckbox = false,
  batchMode = false
}: CharacterListItemWithBatchProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { getCharacterConversations, getLastSelectedCharacterConversation } = useChatStore();
  
  const { id, name, description, avatar, tags, createdAt } = character;
  
  // 获取该角色最后选择的对话ID
  const lastSelectedConversationId = getLastSelectedCharacterConversation(id);
  const characterConversations = getCharacterConversations(id);
  
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
      relative group flex items-center border rounded-lg p-3 transition-all duration-200 cursor-pointer
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

      {/* 角色头像 */}
      <div 
        className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-muted cursor-pointer"
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
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            无头像
          </div>
        )}
      </div>
      
      {/* 角色信息 */}
      <div className="ml-4 flex-1 min-w-0" onClick={handleStartChat}>
        <h3 className="font-medium text-base truncate">{name}</h3>
        
        {description && (
          <p className="text-muted-foreground text-sm line-clamp-1">{description}</p>
        )}
        
        <div className="flex flex-wrap gap-1 mt-1">
          {tags && tags.length > 0 && tags.slice(0, 2).map((tag, index) => (
            <span 
              key={index}
              className="bg-muted px-1.5 py-0.5 rounded-full text-xs"
            >
              {tag}
            </span>
          ))}
          {tags && tags.length > 2 && (
            <span className="text-xs text-muted-foreground">+{tags.length - 2}</span>
          )}
        </div>
        
        {/* 对话数量信息 */}
        {characterConversations.length > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            {characterConversations.length} 个对话
          </div>
        )}
      </div>
      
      {/* 操作按钮 */}
      {!batchMode && (
        <div className="flex items-center space-x-1 ml-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleStartChat}
            className="h-8 w-8"
            title="开始聊天"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleEdit}
            className="h-8 w-8"
            title="编辑角色"
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <Button 
            variant={isDeleting ? "destructive" : "ghost"}
            size="icon"
            onClick={handleDelete}
            className="h-8 w-8"
            title={isDeleting ? "确认删除" : "删除角色"}
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
              <DropdownMenuItem onClick={handleStartChat}>
                <MessageCircle className="mr-2 h-4 w-4" />
                开始聊天
              </DropdownMenuItem>
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
  );
}
