"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare, Settings, Sparkles, X } from "lucide-react";
import { useState } from "react";

// 贡献者名单
const contributors = [
  { id: 1, name: "艾尔蕾丝", note: "(大脑已卖掉)" },
  { id: 2, name: "Repal", note: "" },
  { id: 3, name: "claystal", note: "" },
  { id: 4, name: "夏礼", note: "" },
  { id: 5, name: "给你加个神圣狂暴", note: "" },
  { id: 6, name: "其他试验bug小白鼠", note: "（滑稽）", strikethrough: true },
];

export default function Home() {
  const [showCredits, setShowCredits] = useState(false);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 overflow-hidden">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm lg:flex">
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <div className="flex items-center justify-center lg:pointer-events-auto">
            
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center text-center">
        {/* 标题区域 */}
        <div className="relative">
          {/* 装饰性云朵 */}
          <div className="absolute -top-12 -left-16 animate-float opacity-10 dark:opacity-5">
            <svg width="60" height="40" viewBox="0 0 60 40" fill="currentColor">
              <path d="M50,40A15,15,0,0,1,35,25H15A15,15,0,0,1,15,0H50a15,15,0,0,1,0,30Z" />
            </svg>
          </div>
          <div className="absolute -bottom-10 -right-16 animate-float-delay opacity-10 dark:opacity-5">
            <svg width="50" height="35" viewBox="0 0 50 35" fill="currentColor">
              <path d="M40,35A12,12,0,0,1,28,23H12A12,12,0,0,1,12,0H40a12,12,0,0,1,0,24Z" />
            </svg>
          </div>
          <div className="absolute top-8 right-12 animate-float opacity-10 dark:opacity-5" style={{ animationDelay: "1.5s" }}>
            <svg width="40" height="25" viewBox="0 0 40 25" fill="currentColor">
              <path d="M30,25A10,10,0,0,1,20,15H10A10,10,0,0,1,10,0H30a10,10,0,0,1,0,20Z" />
            </svg>
          </div>
          
          {/* 标题 */}
          <h1 
            onClick={() => setShowCredits(true)}
            className="text-5xl sm:text-6xl font-bold tracking-tighter mb-4 cursor-pointer
                     hover:opacity-80 transition-opacity duration-300 relative group"
            style={{ textShadow: "0px 1px 1px rgba(0,0,0,0.1)" }}
          >
            <span className="group-hover:border-b-2 pb-1 transition-all duration-300">云边有个妙妙馆</span>
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 group-hover:w-3/4 h-0.5 bg-foreground opacity-30 transition-all duration-300"></span>
          </h1>
        </div>
        
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

      {/* 贡献者致谢弹窗 */}
      {showCredits && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowCredits(false)}
        >
          <div 
            className="bg-background p-6 rounded-lg max-w-md w-full shadow-lg border border-border" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">命名灵感 & 致谢</h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowCredits(false)}
              >
                <X size={20} />
              </Button>
            </div>
            
            <p className="mb-4 text-muted-foreground">
              "云边有个妙妙馆"的灵感来源于以下朋友们的创意与支持：
            </p>
            
            <div className="grid grid-cols-1 gap-3 mb-6">
              {contributors.map((contributor) => (
                <div key={contributor.id} className="flex items-center p-3 bg-muted rounded-md">
                  <span className={`font-medium ${contributor.strikethrough ? 'line-through' : ''}`}>
                    {contributor.name}
                  </span>
                  {contributor.note && (
                    <span className="ml-2 text-sm text-muted-foreground">{contributor.note}</span>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-center">
              <Button 
                className="w-full" 
                onClick={() => setShowCredits(false)}
              >
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 