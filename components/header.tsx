"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon, MessageSquare, Users, User, BookOpen, Puzzle, Settings, FileText } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // 在客户端完成挂载后才渲染主题按钮内容
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // 导航链接
  const navLinks = [
    { href: "/chat", label: "聊天", icon: MessageSquare },
    { href: "/characters", label: "角色", icon: Users },
    { href: "/players", label: "玩家", icon: User },
    { href: "/worldbooks", label: "世界书", icon: BookOpen },
    { href: "/presets", label: "预设", icon: FileText },
    { href: "/extensions", label: "拓展", icon: Puzzle },
    { href: "/settings", label: "设置", icon: Settings },
  ];

  return (
    <header className="border-b sticky top-0 bg-background z-10">
      <div className="container mx-auto flex items-center justify-between p-2 md:p-4">
        {/* 标志和标题 */}
        <Link href="/" className="font-bold text-lg md:text-xl flex items-center">
          <span>云</span>
          <span className="animate-pulse-subtle">妙</span>
          <span>馆</span>
        </Link>

        {/* 导航链接 */}
        <nav className="flex items-center gap-1 md:gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "p-2 rounded-md transition-colors flex items-center justify-center",
                pathname === link.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title={link.label}
            >
              <link.icon className="h-4 w-4 md:h-5 md:w-5" />
              <span className="sr-only md:not-sr-only md:ml-2 md:text-sm">{link.label}</span>
            </Link>
          ))}
          
          {/* 主题切换 - 只在客户端渲染后显示图标和title */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="ml-1"
            title={mounted ? (theme === "dark" ? "切换到亮色模式" : "切换到暗色模式") : "切换主题"}
          >
            {mounted && (theme === "dark" ? (
              <SunIcon className="h-4 w-4 md:h-5 md:w-5" />
            ) : (
              <MoonIcon className="h-4 w-4 md:h-5 md:w-5" />
            ))}
            <span className="sr-only">切换主题</span>
          </Button>
        </nav>
      </div>
    </header>
  );
} 