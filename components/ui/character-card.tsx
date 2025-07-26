"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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

interface CharacterCardProps {
  character: Character;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function CharacterCard({ character, onEdit, onDelete }: CharacterCardProps) {
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
    // 优先使用最后选择的对话
    if (lastSelectedConversationId) {
      console.log("导航至最后选择的对话:", lastSelectedConversationId);
      router.push(`/chat?characterId=${id}&conversationId=${lastSelectedConversationId}`);
    } 
    // 如果没有最后选择的对话但有现有对话，导航到最近的对话
    else if (characterConversations.length > 0) {
      // 按最后更新时间排序，选择最新的对话
      const sortedConversations = [...characterConversations].sort((a, b) => b.lastUpdated - a.lastUpdated);
      const latestConversation = sortedConversations[0];
      console.log("导航至最新对话:", latestConversation.id);
      router.push(`/chat?characterId=${id}`);
    } 
    // 没有现有对话，创建新对话
    else {
      console.log("创建新对话");
      router.push(`/chat?characterId=${id}`);
    }
  };

  // 打开指定对话
  const handleOpenConversation = (conversationId: string) => {
    router.push(`/chat?characterId=${id}&conversationId=${conversationId}`);
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 简短格式的日期
  const formatShortDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  };
  
  return (
    <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div 
        className="relative aspect-square bg-gray-100 cursor-pointer" 
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
      
      <div className="p-4 space-y-2">
        <h3 className="font-medium text-lg truncate">{name}</h3>
        
        {description && (
          <p className="text-muted-foreground text-sm line-clamp-2">{description}</p>
        )}
        
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag, index) => (
              <span 
                key={index}
                className="bg-muted px-2 py-1 rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {character.createdAt && ( // 添加这个条件判断
         <div className="text-xs text-muted-foreground mt-2">
          创建于 {formatDate(character.createdAt)}
         </div>
        )}
        
        <div className="flex space-x-2 pt-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 flex items-center gap-1"
            onClick={handleStartChat}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            开始聊天
          </Button>
        </div>

        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 flex items-center gap-1"
            onClick={handleEdit}
          >
            <Edit className="h-3.5 w-3.5" />
            编辑
          </Button>
          <Button 
            variant={isDeleting ? "destructive" : "outline"}
            size="sm"
            className="flex-1 flex items-center gap-1"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDeleting ? '确认删除' : '删除'}
          </Button>
        </div>
      </div>
    </div>
  );
} 