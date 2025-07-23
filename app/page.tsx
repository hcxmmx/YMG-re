"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare, Settings, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm lg:flex">
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <div className="flex items-center justify-center lg:pointer-events-auto">
            
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center text-center">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter mb-4">云边有个妙妙馆</h1>
        <p className="text-xl mb-8 max-w-2xl"></p>
        
        <div className="flex flex-wrap gap-4 justify-center mb-12">
          <Button size="lg">
            <Link href="/chat" className="flex items-center gap-2">
              <MessageSquare size={20} />
              开始聊天
            </Link>
          </Button>
          
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
            <h2 className="text-xl font-bold mb-2">强大AI能力</h2>
            <p className="text-center">提供准确、智能的回答和交互体验</p>
          </div>
          <div className="flex flex-col items-center p-6 bg-card rounded-lg border shadow-sm">
            <MessageSquare className="h-10 w-10 mb-4 text-primary" />
            <h2 className="text-xl font-bold mb-2">智能对话</h2>
            <p className="text-center">实现流畅自然的对话体验，支持流式响应</p>
          </div>
          <div className="flex flex-col items-center p-6 bg-card rounded-lg border shadow-sm">
            <Settings className="h-10 w-10 mb-4 text-primary" />
            <h2 className="text-xl font-bold mb-2">可定制设置</h2>
            <p className="text-center">根据需求调整AI参数，获得最佳对话效果</p>
          </div>
        </div>
      </div>
    </main>
  );
} 