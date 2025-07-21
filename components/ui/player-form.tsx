"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Player } from "@/lib/types";
import { generateId } from "@/lib/utils";
import { X } from "lucide-react";
import Image from "next/image";

interface PlayerFormProps {
  initialPlayer?: Player;
  onSave: (player: Player) => Promise<void> | void;
  onCancel?: () => void;
}

export function PlayerForm({ initialPlayer, onSave, onCancel }: PlayerFormProps) {
  const [player, setPlayer] = useState<Player>(() => {
    return initialPlayer || {
      id: generateId(),
      name: "",
      description: "",
      avatar: "",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  });
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    player.avatar || null
  );
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setPlayer((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const avatar = e.target.result as string;
        setPlayer((prev) => ({ ...prev, avatar }));
        setAvatarPreview(avatar);
      }
    };
    reader.readAsDataURL(file);
  };
  
  const removeAvatar = () => {
    setPlayer((prev) => ({ ...prev, avatar: "" }));
    setAvatarPreview(null);
  };
  
  const handleSubmit = async () => {
    // 更新时间戳
    const updatedPlayer = {
      ...player,
      updatedAt: Date.now()
    };
    
    await onSave(updatedPlayer);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="grid md:grid-cols-[1fr_250px] gap-6">
        {/* 左侧表单 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">玩家名称</label>
            <Input
              name="name"
              value={player.name || ""}
              onChange={handleChange}
              placeholder="输入玩家名称"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">玩家描述</label>
            <textarea
              name="description"
              value={player.description || ""}
              onChange={handleChange}
              className="min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              placeholder="输入玩家描述（可选）"
              rows={5}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                取消
              </Button>
            )}
            <Button onClick={handleSubmit}>
              保存
            </Button>
          </div>
        </div>
        
        {/* 右侧头像上传 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">玩家头像</label>
            <div className="flex flex-col items-center">
              <div 
                onClick={handleAvatarClick}
                className="relative w-48 h-48 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                {avatarPreview ? (
                  <>
                    <Image
                      src={avatarPreview}
                      alt="玩家头像预览"
                      fill
                      className="object-cover rounded-md"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAvatar();
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                      title="删除头像"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-4">
                    <p className="text-sm text-gray-500">点击上传头像</p>
                    <p className="text-xs text-gray-400 mt-1">
                      建议尺寸: 256×256 像素
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-2">
                点击方框区域上传图片
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 