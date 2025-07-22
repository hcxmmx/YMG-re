"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { useWorldBookStore } from "@/lib/store";

export default function NewWorldBookPage() {
  const router = useRouter();
  const { saveWorldBook } = useWorldBookStore();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // 保存新世界书
  const handleSave = async () => {
    if (!name.trim()) {
      alert("请输入世界书名称");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // 创建新世界书
      const worldBook = await saveWorldBook({
        name: name.trim(),
        description: description.trim(),
        entries: [],
        settings: {
          scanDepth: 2,
          includeNames: true,
          maxRecursionSteps: 3,
          minActivations: 0,
          maxDepth: 10,
          caseSensitive: false,
          matchWholeWords: true
        },
        enabled: true
      });
      
      setIsLoading(false);
      
      // 跳转到世界书详情页
      router.push(`/worldbooks/${worldBook.id}`);
    } catch (error) {
      console.error("创建世界书失败:", error);
      alert("创建世界书失败");
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Button variant="ghost" className="mb-2" asChild>
          <Link href="/worldbooks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Link>
        </Button>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">创建世界书</h1>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isLoading ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>设置世界书的基本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">名称 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="世界书名称"
              disabled={isLoading}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述这个世界书的用途和内容..."
              rows={4}
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter>
          <div className="text-sm text-muted-foreground">
            创建世界书后，您可以在详情页添加条目、配置设置和关联角色。
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 