"use client";

import { useEffect, useState, useRef } from "react";
import { Character, CharacterImportResult } from "@/lib/types";
import { characterStorage } from "@/lib/storage";
import { CharacterCard } from "@/components/ui/character-card";
import { CharacterForm } from "@/components/ui/character-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useChatStore } from "@/lib/store";

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "角色管理 - AI角色扮演平台";
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    try {
      setLoading(true);
      const loadedCharacters = await characterStorage.listCharacters();
      setCharacters(loadedCharacters.reverse()); // 最新创建的角色排在前面
    } catch (error) {
      console.error('加载角色失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCharacter = () => {
    setIsCreating(true);
    setEditingCharacter(null);
    setDialogTitle("创建新角色");
    setIsDialogOpen(true);
  };

  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character);
    setIsCreating(false);
    setDialogTitle(`编辑角色: ${character.name}`);
    setIsDialogOpen(true);
  };

  const handleSaveCharacter = async (character: Character) => {
    setIsDialogOpen(false);
    await loadCharacters();
  };

  const handleCancelEdit = () => {
    setIsDialogOpen(false);
  };

  // 处理角色卡导入
  const handleImportCharacter = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    if (!file) {
      return;
    }

    try {
      setIsImporting(true);
      
      // 导入角色卡
      const result = await characterStorage.importCharacter(file);
      
      if (result?.characterId) {
        let successMessage = `角色卡导入成功！每次导入的角色都是独立的，拥有自己的对话记录。`;
        
        // 如果有导入的世界书，添加相关信息
        if (result.importedWorldBooks && result.importedWorldBooks.length > 0) {
          successMessage += `\n\n同时导入了以下世界书并自动关联到角色：\n- ${result.importedWorldBooks.join('\n- ')}`;
        }
        
        alert(successMessage);
        await loadCharacters(); // 重新加载角色列表
      } else {
        alert(`角色卡导入失败：${result?.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('导入角色卡失败:', error);
      alert('导入过程中出错，请重试');
    } finally {
      setIsImporting(false);
      // 重置文件输入，允许用户导入同一个文件
      if (importFileRef.current) {
        importFileRef.current.value = '';
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">角色管理</h1>
        <div className="flex space-x-2">
          <Button 
            onClick={() => importFileRef.current?.click()}
            variant="outline"
            disabled={isImporting}
          >
            {isImporting ? '导入中...' : '导入角色卡'}
          </Button>
          <input
            type="file"
            ref={importFileRef}
            onChange={handleImportCharacter}
            accept=".json,.png"
            className="hidden"
          />
          <Button 
            onClick={handleCreateCharacter}
          >
            创建角色
          </Button>
        </div>
      </div>

      {/* 角色表单模态框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[850px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {editingCharacter ? "编辑角色信息，包括名称、描述、开场白和头像" : "创建一个新的角色，填写基本信息"}
            </DialogDescription>
          </DialogHeader>
          <CharacterForm
            initialCharacter={editingCharacter || undefined}
            onSave={handleSaveCharacter}
            onCancel={handleCancelEdit}
          />
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <p>加载中...</p>
        </div>
      ) : characters.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {characters.map((character) => (
            <CharacterCard 
              key={character.id} 
              character={character} 
              onEdit={() => handleEditCharacter(character)}
              onDelete={loadCharacters}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-60">
          <p className="text-muted-foreground mb-4">还没有创建角色</p>
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={() => importFileRef.current?.click()}
              disabled={isImporting}
            >
              导入角色卡
            </Button>
            <Button onClick={handleCreateCharacter}>
              创建角色
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 