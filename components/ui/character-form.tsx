"use client";

import { useState, useRef, useEffect } from "react";
import { Character } from "@/lib/types";
import { characterStorage } from "@/lib/storage";
import { generateId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface CharacterFormProps {
  initialCharacter?: Character;
  onSave?: (character: Character) => void;
  onCancel?: () => void;
}

export function CharacterForm({ initialCharacter, onSave, onCancel }: CharacterFormProps) {
  const [character, setCharacter] = useState<Partial<Character>>(
    initialCharacter || {
      name: "",
      description: "",
      firstMessage: "",
      alternateGreetings: [],
      tags: [],
    }
  );
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialCharacter?.avatar || null);
  const [alternateGreetings, setAlternateGreetings] = useState<string[]>(
    initialCharacter?.alternateGreetings || [""]
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCharacter((prev) => ({ ...prev, [name]: value }));
  };

  // 处理头像上传
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarPreview(result);
        setCharacter((prev) => ({ ...prev, avatar: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // 处理标签输入
  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tagString = e.target.value;
    const tagArray = tagString.split(',').map(tag => tag.trim()).filter(Boolean);
    setCharacter((prev) => ({ ...prev, tags: tagArray }));
  };

  // 处理可选开场白输入
  const handleAlternateGreetingChange = (index: number, value: string) => {
    const newGreetings = [...alternateGreetings];
    newGreetings[index] = value;
    setAlternateGreetings(newGreetings);
    
    // 同步更新到角色对象
    const filteredGreetings = newGreetings.filter(greeting => greeting.trim() !== "");
    setCharacter(prev => ({ ...prev, alternateGreetings: filteredGreetings }));
  };

  // 添加新的可选开场白字段
  const addAlternateGreeting = () => {
    setAlternateGreetings([...alternateGreetings, ""]);
  };

  // 删除可选开场白字段
  const removeAlternateGreeting = (index: number) => {
    const newGreetings = alternateGreetings.filter((_, i) => i !== index);
    setAlternateGreetings(newGreetings);
    
    // 同步更新到角色对象
    const filteredGreetings = newGreetings.filter(greeting => greeting.trim() !== "");
    setCharacter(prev => ({ ...prev, alternateGreetings: filteredGreetings }));
  };

  // 保存角色
  const handleSave = async () => {
    if (!character.name) {
      alert('请填写角色名称');
      return;
    }

    // 过滤掉空的开场白
    const filteredGreetings = alternateGreetings.filter(greeting => greeting.trim() !== "");
    
    const id = character.id || generateId();
    const characterToSave = {
      ...character,
      alternateGreetings: filteredGreetings,
      id,
    } as Character;

    await characterStorage.saveCharacter(characterToSave);
    
    if (onSave) {
      onSave(characterToSave);
    } else {
      router.push('/characters');
      router.refresh();
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="grid md:grid-cols-[1fr_250px] gap-6">
        {/* 左侧表单 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">角色名称</label>
            <Input
              name="name"
              value={character.name || ""}
              onChange={handleChange}
              placeholder="输入角色名称"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">角色描述</label>
            <textarea
              name="description"
              value={character.description || ""}
              onChange={handleChange}
              className="min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              placeholder="输入角色描述"
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">开场白（默认）</label>
            <textarea
              name="firstMessage"
              value={character.firstMessage || ""}
              onChange={handleChange}
              className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              placeholder="角色的第一句话"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">可选开场白</label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addAlternateGreeting}
              >
                添加开场白
              </Button>
            </div>
            
            {alternateGreetings.map((greeting, index) => (
              <div key={index} className="flex space-x-2 mb-2">
                <textarea
                  value={greeting}
                  onChange={(e) => handleAlternateGreetingChange(index, e.target.value)}
                  className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  placeholder={`可选开场白 #${index + 1}`}
                  rows={3}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-10 self-start"
                  onClick={() => removeAlternateGreeting(index)}
                >
                  删除
                </Button>
              </div>
            ))}
            
            <p className="text-xs text-muted-foreground">
              有效的可选开场白数量: {alternateGreetings.filter(g => g.trim() !== "").length}
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">标签（用逗号分隔）</label>
            <Input
              name="tags"
              value={character.tags?.join(', ') || ""}
              onChange={handleTagsChange}
              placeholder="例如：科幻, 冒险, 友善"
            />
          </div>
        </div>

        {/* 右侧头像区域 */}
        <div className="flex flex-col items-center space-y-4">
          <div className="text-sm font-medium mb-2">角色头像</div>
          <div
            className="w-40 h-40 border border-gray-300 rounded-md flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="角色头像"
                width={160}
                height={160}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-gray-400">选择图片</span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            上传头像
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarUpload}
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          取消
        </Button>
        <Button onClick={handleSave}>保存角色</Button>
      </div>
    </div>
  );
} 