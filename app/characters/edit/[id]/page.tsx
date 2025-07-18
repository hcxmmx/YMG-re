"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CharacterForm } from "@/components/ui/character-form";
import { characterStorage } from "@/lib/storage";
import { Character } from "@/lib/types";

export default function EditCharacterPage() {
  const params = useParams();
  const router = useRouter();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        if (typeof params.id !== "string") {
          router.push("/characters");
          return;
        }

        const characterData = await characterStorage.getCharacter(params.id);
        if (!characterData) {
          router.push("/characters");
          return;
        }

        setCharacter(characterData);
        document.title = `编辑角色: ${characterData.name} - AI角色扮演平台`;
      } catch (error) {
        console.error("获取角色信息失败:", error);
        router.push("/characters");
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
  }, [params.id, router]);

  const handleSave = async (savedCharacter: Character) => {
    router.push("/characters");
  };

  const handleCancel = () => {
    router.push("/characters");
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center h-60">
        <p>加载中...</p>
      </div>
    );
  }

  if (!character) {
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">编辑角色: {character.name}</h1>
      
      <div className="mb-8">
        <CharacterForm
          initialCharacter={character}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
} 