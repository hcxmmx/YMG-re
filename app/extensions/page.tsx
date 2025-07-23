"use client";

import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Code, FileText, Wand2 } from "lucide-react";

export default function ExtensionsPage() {
  useEffect(() => {
    document.title = "拓展功能 - AI角色扮演平台";
  }, []);

  // 扩展列表
  const extensions = [
    {
      id: "regex",
      title: "正则表达式",
      description: "使用正则表达式处理聊天消息和提示词",
      icon: <Code className="h-10 w-10 text-primary" />,
      href: "/extensions/regex",
      available: true
    },
    {
      id: "custom-commands",
      title: "自定义命令",
      description: "创建和管理自定义聊天命令",
      icon: <Wand2 className="h-10 w-10 text-muted-foreground" />,
      href: "/extensions/commands",
      available: false
    },
    {
      id: "templates",
      title: "提示词模板",
      description: "创建和管理提示词模板",
      icon: <FileText className="h-10 w-10 text-muted-foreground" />,
      href: "/extensions/templates",
      available: false
    }
  ];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">拓展功能</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {extensions.map((extension) => (
          <Card key={extension.id} className={!extension.available ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                {extension.icon}
                {extension.available ? (
                  <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full">
                    可用
                  </span>
                ) : (
                  <span className="text-xs bg-muted px-2 py-1 rounded-full">
                    开发中
                  </span>
                )}
              </div>
              <CardTitle className="mt-4">{extension.title}</CardTitle>
              <CardDescription>{extension.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {extension.available ? (
                <Button asChild className="w-full">
                  <Link href={extension.href}>进入</Link>
                </Button>
              ) : (
                <Button disabled className="w-full">
                  即将推出
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 