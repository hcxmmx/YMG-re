"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfilesStore } from "@/lib/store";
import { ArrowLeft, Download, Trash } from "lucide-react";
import Link from "next/link";

export default function EditProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { profiles, updateProfile, deleteProfile } = useProfilesStore();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 加载角色信息
  useEffect(() => {
    const id = params.id as string;
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      setName(profile.name);
      setDescription(profile.description);
      setSystemPrompt(profile.systemPrompt);
      setTags([...profile.tags]); // 复制数组以避免直接修改
    } else {
      router.push("/profiles");
    }
  }, [params.id, profiles, router]);
  
  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const id = params.id as string;
    if (!name || !systemPrompt) return;
    
    // 更新角色
    updateProfile(id, {
      name,
      description,
      systemPrompt,
      tags,
    });
    
    // 返回角色列表页面
    router.push("/profiles");
  };
  
  // 添加标签
  const addTag = () => {
    if (!tagInput.trim()) return;
    setTags([...tags, tagInput.trim()]);
    setTagInput("");
  };
  
  // 删除标签
  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };
  
  // 删除角色
  const handleDelete = () => {
    if (isDeleting) {
      const id = params.id as string;
      deleteProfile(id);
      router.push("/profiles");
    } else {
      setIsDeleting(true);
      // 3秒后自动取消删除确认
      setTimeout(() => setIsDeleting(false), 3000);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">编辑角色</h1>
            <p className="text-muted-foreground">修改角色设置和提示词</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            asChild
          >
            <Link href={`/profiles/${params.id}/export`}>
              <Download className="h-4 w-4" /> 导出
            </Link>
          </Button>
          <Button 
            variant="destructive" 
            className="flex items-center gap-2" 
            onClick={handleDelete}
          >
            <Trash className="h-4 w-4" />
            {isDeleting ? "确认删除" : "删除"}
          </Button>
        </div>
      </header>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 基本信息 */}
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              角色名称 <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：历史学家、科幻小说家、心理咨询师"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              角色描述
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简单描述这个角色的特点和专长..."
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        
        {/* 系统提示词 */}
        <div className="space-y-4">
          <div>
            <label htmlFor="systemPrompt" className="block text-sm font-medium mb-1">
              系统提示词 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="详细描述AI应该如何扮演这个角色，包括语气、专业知识、行为模式等..."
              className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              这是AI扮演角色的关键指令，请尽可能详细地描述角色特点。
            </p>
          </div>
        </div>
        
        {/* 标签 */}
        <div className="space-y-4">
          <label htmlFor="tags" className="block text-sm font-medium mb-1">
            标签
          </label>
          <div className="flex gap-2">
            <Input
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="添加标签..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <Button 
              type="button" 
              onClick={addTag}
            >
              添加
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag, index) => (
              <div
                key={index}
                className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-sm flex items-center gap-1"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-muted"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        
        {/* 提交按钮 */}
        <div className="flex justify-end pt-4">
          <Button type="submit">保存更改</Button>
        </div>
      </form>
    </div>
  );
} 