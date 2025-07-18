"use client";

import { Character } from "@/lib/types";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { characterStorage } from "@/lib/storage";

interface CharacterCardProps {
  character: Character;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function CharacterCard({ character, onEdit, onDelete }: CharacterCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  
  const { id, name, description, avatar, tags } = character;
  
  const handleDelete = async () => {
    if (isDeleting) {
      try {
        await characterStorage.deleteCharacter(id);
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
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  return (
    <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
        
        <div className="text-xs text-muted-foreground mt-2">
          创建于 {formatDate(character.createdAt)}
        </div>
        
        <div className="flex space-x-2 pt-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1"
            onClick={handleEdit}
          >
            编辑
          </Button>
          <Button 
            variant={isDeleting ? "destructive" : "outline"}
            size="sm"
            className="flex-1"
            onClick={handleDelete}
          >
            {isDeleting ? '确认删除' : '删除'}
          </Button>
        </div>
      </div>
    </div>
  );
} 