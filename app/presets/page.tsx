"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePromptPresetStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { 
  PlusCircle, Import, Edit, Trash2, Download, ChevronRight, 
  Sliders, Search, XCircle, Check
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function PresetsPage() {
  const router = useRouter();
  const { 
    presets, 
    loadPresets, 
    deletePreset, 
    exportPresetToFile, 
    importPresetFromFile,
    isLoading,
    error
  } = usePromptPresetStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  
  // 文件导入相关
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);
  
  // 过滤预设
  const filteredPresets = searchTerm.trim() === ""
    ? presets
    : presets.filter(preset => 
        preset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        preset.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
  
  // 处理导入
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    try {
      const preset = await importPresetFromFile(file);
      if (preset) {
        // 使用更友好的通知方式
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg flex items-center';
        notification.innerHTML = `<svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>成功导入预设: ${preset.name}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.style.opacity = '0';
          notification.style.transition = 'opacity 0.5s ease';
          setTimeout(() => document.body.removeChild(notification), 500);
        }, 3000);
      }
    } catch (error) {
      console.error("导入预设失败:", error);
      alert("导入预设失败");
    }
    
    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  // 处理删除
  const handleDelete = async (id: string, name: string) => {
    if (confirm(`确定要删除预设 "${name}" 吗？此操作不可撤销。`)) {
      await deletePreset(id);
    }
  };
  
  return (
    <div className="container max-w-screen-xl mx-auto py-6 px-4">
      {/* 标题和操作栏 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold">提示词预设</h1>
          <span className="ml-3 text-muted-foreground">
            {presets.length} 个预设
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {showSearch ? (
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="搜索预设..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
                autoFocus
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2.5"
                >
                  <XCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setShowSearch(true)}>
              <Search className="h-4 w-4" />
            </Button>
          )}
          
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Import className="h-4 w-4 mr-1" />
            导入
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImport} 
              accept=".json" 
              className="hidden" 
            />
          </Button>
          
          <Button variant="default">
            <Link href="/presets/new" className="flex items-center">
              <PlusCircle className="h-4 w-4 mr-1" />
              新建预设
            </Link>
          </Button>
        </div>
      </div>
      
      {/* 错误信息 */}
      {error && (
        <div className="bg-destructive/20 text-destructive p-3 rounded-md mb-6">
          错误: {error}
        </div>
      )}
      
      {/* 加载中状态 */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      
      {/* 预设列表 */}
      {!isLoading && filteredPresets.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {searchTerm.trim() !== "" 
            ? "没有找到匹配的预设"
            : "还没有预设，点击\"新建预设\"按钮创建一个，或导入已有预设文件"
          }
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPresets.map((preset) => (
          <Card key={preset.id} className="flex flex-col overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">{preset.name}</CardTitle>
              <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                {preset.description || "无描述"}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pb-3 flex-grow">
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge variant="outline" className="bg-primary/10">
                  <Sliders className="h-3 w-3 mr-1" />
                  温度: {preset.temperature?.toFixed(1) || "0.7"}
                </Badge>
                <Badge variant="outline" className="bg-primary/10">
                  <Check className="h-3 w-3 mr-1" />
                  已启用: {preset.prompts.filter(p => p.enabled).length}/{preset.prompts.length}
                </Badge>
              </div>
            </CardContent>
            
            <CardFooter className="pt-2 flex justify-between border-t bg-muted/20">
              <div className="flex gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                        onClick={() => exportPresetToFile(preset.id)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>导出预设</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                        <Link href={`/presets/${preset.id}`}>
                          <Edit className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>编辑预设</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                        onClick={() => handleDelete(preset.id, preset.name)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>删除预设</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <Button size="sm" asChild className="h-8">
                <Link href={`/presets/${preset.id}/detail`}>
                  查看
                  <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
} 