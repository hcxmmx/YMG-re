"use client";

import { useState, useRef, useEffect } from "react";
import { Character, WorldBook } from "@/lib/types";
import { characterStorage } from "@/lib/storage";
import { generateId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useWorldBookStore } from "@/lib/store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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

  // 世界书相关状态
  const { worldBooks, loadWorldBooks, linkToCharacter, unlinkFromCharacter, getWorldBookForCharacter } = useWorldBookStore();
  const [availableWorldBooks, setAvailableWorldBooks] = useState<WorldBook[]>([]);
  const [selectedWorldBookId, setSelectedWorldBookId] = useState<string>("none");
  const [currentWorldBook, setCurrentWorldBook] = useState<WorldBook | null>(null);
  const [isLoadingWorldBooks, setIsLoadingWorldBooks] = useState(false);
  
  // 加载世界书数据
  useEffect(() => {
    const loadWorldBookData = async () => {
      try {
        setIsLoadingWorldBooks(true);
        
        // 加载所有世界书
        await loadWorldBooks();
        
        // 过滤出启用的世界书
        const enabledWorldBooks = worldBooks.filter(wb => wb.enabled);
        setAvailableWorldBooks(enabledWorldBooks);
        
        // 如果是编辑模式，获取当前关联的世界书
        if (initialCharacter?.id) {
          const linkedWorldBook = await getWorldBookForCharacter(initialCharacter.id);
          if (linkedWorldBook) {
            setCurrentWorldBook(linkedWorldBook);
            setSelectedWorldBookId(linkedWorldBook.id);
          } else {
            setSelectedWorldBookId("none");
          }
        }
        
        setIsLoadingWorldBooks(false);
      } catch (error) {
        console.error("加载世界书数据失败:", error);
        setIsLoadingWorldBooks(false);
      }
    };
    
    loadWorldBookData();
  }, [loadWorldBooks, worldBooks, initialCharacter, getWorldBookForCharacter]);
  
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

  // 处理世界书选择变更
  const handleWorldBookChange = (value: string) => {
    setSelectedWorldBookId(value);
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
      id,
      alternateGreetings: filteredGreetings,
    } as Character;

    try {
      // 保存角色
      await characterStorage.saveCharacter(characterToSave);
      
      // 处理世界书关联
      if (selectedWorldBookId && selectedWorldBookId !== "none") {
        // 如果选择了不同的世界书，先解除旧关联再建立新关联
        if (currentWorldBook && currentWorldBook.id !== selectedWorldBookId) {
          await unlinkFromCharacter(currentWorldBook.id, id);
        }
        await linkToCharacter(selectedWorldBookId, id);
      } else if (currentWorldBook) {
        // 如果清除了世界书选择，解除关联
        await unlinkFromCharacter(currentWorldBook.id, id);
      }
      
      if (onSave) {
        onSave(characterToSave);
      } else {
        router.push('/characters');
      }
    } catch (error) {
      console.error('保存角色失败:', error);
      alert('保存角色失败');
    }
  };

  return (
    <div className="space-y-6">
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

          {/* 标签 */}
          <div>
            <Label htmlFor="tags">标签</Label>
            <Input
              id="tags"
              name="tags"
              placeholder="以逗号分隔标签"
              value={character.tags?.join(', ') || ''}
              onChange={handleTagsChange}
            />
            <p className="text-sm text-muted-foreground mt-1">用逗号分隔多个标签</p>
          </div>

          {/* 世界书选择 */}
          <div>
            <Label htmlFor="worldBook">关联世界书</Label>
            <Select 
              value={selectedWorldBookId} 
              onValueChange={handleWorldBookChange}
              disabled={isLoadingWorldBooks}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择世界书" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无</SelectItem>
                {availableWorldBooks.map((wb) => (
                  <SelectItem key={wb.id} value={wb.id}>
                    {wb.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoadingWorldBooks ? "加载中..." : "关联世界书将在聊天中自动使用"}
            </p>
            {currentWorldBook && (
              <p className="text-sm text-blue-500 mt-1">
                当前关联: {currentWorldBook.name}
              </p>
            )}
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

      {/* 按钮组 */}
      <div className="flex justify-end gap-2">
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