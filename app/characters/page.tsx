"use client";

import { useEffect, useState } from "react";
import { Character } from "@/lib/types";
import { characterStorage } from "@/lib/storage";
import { CharacterCard } from "@/components/ui/character-card";
import { CharacterForm } from "@/components/ui/character-form";
import { Button } from "@/components/ui/button";

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);

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

  const handleSaveCharacter = async (character: Character) => {
    if (editingCharacter) {
      setEditingCharacter(null);
    } else {
      setIsCreating(false);
    }
    await loadCharacters();
  };

  const handleCancelEdit = () => {
    setEditingCharacter(null);
    setIsCreating(false);
  };

  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character);
    setIsCreating(false);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">角色管理</h1>
        {!isCreating && !editingCharacter && (
          <Button 
            onClick={() => setIsCreating(true)}
            className="ml-auto"
          >
            创建角色
          </Button>
        )}
      </div>

      {isCreating && (
        <div className="mb-8 border p-4 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">创建新角色</h2>
          <CharacterForm
            onSave={handleSaveCharacter}
            onCancel={handleCancelEdit}
          />
        </div>
      )}

      {editingCharacter && (
        <div className="mb-8 border p-4 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">编辑角色</h2>
          <CharacterForm
            initialCharacter={editingCharacter}
            onSave={handleSaveCharacter}
            onCancel={handleCancelEdit}
          />
        </div>
      )}

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
          {!isCreating && (
            <Button onClick={() => setIsCreating(true)}>
              创建第一个角色
            </Button>
          )}
        </div>
      )}
    </div>
  );
} 