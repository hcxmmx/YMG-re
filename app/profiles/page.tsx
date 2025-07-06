"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash, MessageSquare } from "lucide-react";
import { useProfilesStore, useChatsStore } from "@/lib/store";
import { Profile } from "@/lib/types";
import Link from "next/link";

export default function ProfilesPage() {
  const router = useRouter();
  const { profiles, currentProfileId, setCurrentProfile, deleteProfile } = useProfilesStore();
  const { addDialog, setCurrentDialog } = useChatsStore();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // 选择角色并开始对话
  const handleStartChat = (profile: Profile) => {
    setCurrentProfile(profile.id);
    const newDialogId = addDialog({
      profileId: profile.id,
      title: `与${profile.name}的对话`,
      messages: [],
    });
    setCurrentDialog(newDialogId);
    router.push("/chat");
  };

  // 删除角色
  const handleDeleteProfile = (id: string) => {
    setIsDeleting(id);
    // 这里可以添加确认对话框
    setTimeout(() => {
      deleteProfile(id);
      setIsDeleting(null);
    }, 300);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">角色管理</h1>
          <p className="text-muted-foreground">创建和管理您的AI角色</p>
        </div>
        <Button asChild>
          <Link href="/profiles/new">
            <Plus className="mr-2 h-4 w-4" /> 创建角色
          </Link>
        </Button>
      </header>

      {profiles.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">还没有角色</h2>
          <p className="mb-8 text-muted-foreground">
            创建您的第一个AI角色开始对话
          </p>
          <Button asChild>
            <Link href="/profiles/new">
              <Plus className="mr-2 h-4 w-4" /> 创建角色
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`bg-card border rounded-lg p-6 flex flex-col ${
                profile.id === currentProfileId ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="flex items-center gap-4 mb-4">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xl font-bold">
                      {profile.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="font-bold">{profile.name}</h3>
                  <div className="flex gap-2 flex-wrap">
                    {profile.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs bg-secondary px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-sm mb-4 flex-grow line-clamp-3">
                {profile.description}
              </p>

              <div className="flex gap-2 justify-between mt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/profiles/${profile.id}`}>
                    <Edit className="mr-2 h-4 w-4" /> 编辑
                  </Link>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteProfile(profile.id)}
                  disabled={isDeleting === profile.id}
                >
                  <Trash className="mr-2 h-4 w-4" /> 删除
                </Button>
                <Button size="sm" onClick={() => handleStartChat(profile)}>
                  <MessageSquare className="mr-2 h-4 w-4" /> 对话
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 