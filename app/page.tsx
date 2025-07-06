"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare, UserRound, Settings, Sparkles } from "lucide-react";
import { useProfilesStore } from "@/lib/store";

export default function Home() {
  const { profiles, currentProfileId, initDefaultProfiles } = useProfilesStore();
  
  // 在组件加载时初始化默认角色
  useEffect(() => {
    initDefaultProfiles();
  }, [initDefaultProfiles]);
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm lg:flex">
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <div className="flex items-center justify-center lg:pointer-events-auto">
            由 Gemini API 提供支持
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center text-center">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter mb-4">AI角色扮演平台</h1>
        <p className="text-xl mb-8 max-w-2xl">高度可定制的AI对话体验，让AI成为您想要的任何角色</p>
        
        <div className="flex flex-wrap gap-4 justify-center mb-12">
          {currentProfileId ? (
            <Button size="lg">
              <Link href="/chat" className="flex items-center gap-2">
                <MessageSquare size={20} />
                开始聊天
              </Link>
            </Button>
          ) : (
            <Button size="lg">
              <Link href="/profiles" className="flex items-center gap-2">
                <UserRound size={20} />
                选择角色
              </Link>
            </Button>
          )}
          
          <Button variant="outline" size="lg">
            <Link href="/settings" className="flex items-center gap-2">
              <Settings size={20} />
              设置
            </Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
          <div className="flex flex-col items-center p-6 bg-card rounded-lg border shadow-sm">
            <Sparkles className="h-10 w-10 mb-4 text-primary" />
            <h2 className="text-xl font-bold mb-2">自定义角色</h2>
            <p className="text-center">创建独特的AI角色，自定义提示词、人设和回复风格</p>
          </div>
          <div className="flex flex-col items-center p-6 bg-card rounded-lg border shadow-sm">
            <MessageSquare className="h-10 w-10 mb-4 text-primary" />
            <h2 className="text-xl font-bold mb-2">智能对话</h2>
            <p className="text-center">基于Gemini强大的AI模型，实现流畅自然的对话体验</p>
          </div>
          <div className="flex flex-col items-center p-6 bg-card rounded-lg border shadow-sm">
            <UserRound className="h-10 w-10 mb-4 text-primary" />
            <h2 className="text-xl font-bold mb-2">多角色支持</h2>
            <p className="text-center">在多种预设角色之间切换，或创建你自己的独特角色</p>
          </div>
        </div>
        
        {/* 默认角色展示 */}
        {profiles.length > 0 && (
          <div className="mt-16 w-full max-w-4xl">
            <h2 className="text-2xl font-bold mb-6 text-center">可用角色</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {profiles.slice(0, 4).map((profile) => (
                <Link 
                  key={profile.id} 
                  href={`/chat?profile=${profile.id}`}
                  className="flex flex-col items-center p-4 bg-card border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <span className="text-xl font-bold text-primary">{profile.name.charAt(0)}</span>
                  </div>
                  <h3 className="font-medium">{profile.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{profile.description}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
} 