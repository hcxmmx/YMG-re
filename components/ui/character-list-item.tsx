"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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

interface CharacterListItemProps {
  character: Character;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function CharacterListItem({ character, onEdit, onDelete }: CharacterListItemProps) {
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
        
        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
          console.log(`已删除角色 ${name} 的 ${deletePromises.length} 条聊天记录`);
        }
        
        // 回调通知
        onDelete?.();
        router.refresh();
      } catch (error) {
        console.error('删除角色失败:', error);
        alert('删除角色失败');
      } finally {
        setIsDeleting(false);
      }
    } else {
      setIsDeleting(true);
    }
  };
  
  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      router.push(`/characters/edit/${id}`);
    }
  };

  // 开始与角色聊天
  const handleStartChat = () => {
    // 创建新对话，确保使用最新的角色信息
    router.push(`/chat?characterId=${id}`);
  };
  
  return (
    <div className="flex items-center border rounded-lg p-3 hover:bg-muted/30 transition-colors">
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
          <div className="w-full h-full flex items-center justify-center text-gray-400">
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
      </div>
      
      {/* 操作按钮 */}
      <div className="flex items-center space-x-1 ml-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleStartChat}
          className="h-8 w-8"
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleEdit}
          className="h-8 w-8"
        >
          <Edit className="h-4 w-4" />
        </Button>
        
        <Button 
          variant={isDeleting ? "destructive" : "ghost"}
          size="icon"
          onClick={handleDelete}
          className="h-8 w-8"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 