"use client";

import Link from "next/link";
import { MessageSquare, Settings, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="border-b">
      <div className="container mx-auto flex justify-between items-center py-4 px-4">
        {/* 标志和名称 */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold text-xl">AI对话平台</span>
        </Link>

        {/* 桌面导航 */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            href="/chat"
            className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <MessageSquare size={18} />
            <span>聊天</span>
          </Link>
          <Link
            href="/settings"
            className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <Settings size={18} />
            <span>设置</span>
          </Link>
        </nav>

        {/* 移动端菜单按钮 */}
        <button
          onClick={toggleMenu}
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          aria-label="菜单"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* 移动端下拉菜单 */}
      <div
        className={cn(
          "md:hidden absolute w-full bg-background border-b z-50 transition-all duration-300",
          isMenuOpen ? "max-h-60" : "max-h-0 overflow-hidden border-b-0"
        )}
      >
        <nav className="container mx-auto py-4 px-6 flex flex-col space-y-4">
          <Link
            href="/chat"
            className="py-2 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            onClick={() => setIsMenuOpen(false)}
          >
            <MessageSquare size={18} />
            <span>聊天</span>
          </Link>
          <Link
            href="/settings"
            className="py-2 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            onClick={() => setIsMenuOpen(false)}
          >
            <Settings size={18} />
            <span>设置</span>
          </Link>
        </nav>
      </div>
    </header>
  );
} 