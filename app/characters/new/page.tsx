"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CharacterForm } from "@/components/ui/character-form";
import { Character } from "@/lib/types";

export default function NewCharacterPage() {
  const router = useRouter();

  useEffect(() => {
    document.title = "创建新角色 - AI角色扮演平台";
  }, []);

  const handleSave = (character: Character) => {
    router.push("/characters");
  };

  const handleCancel = () => {
    router.push("/characters");
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">创建新角色</h1>
      
      <div className="mb-8">
        <CharacterForm
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
} 