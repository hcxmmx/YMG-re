"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePromptPresetStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { PlusCircle, Import, Edit, Trash2, Download, ChevronRight } from "lucide-react";

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
        preset.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
  
  // 处理导入
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    try {
      const preset = await importPresetFromFile(file);
      if (preset) {
        alert(`成功导入预设: ${preset.name}`);
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
    <div className="container mx-auto py-6 px-4">
      {/* 标题和操作栏 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">提示词预设管理</h1>
        
        <div className="flex gap-2">
          <Button asChild variant="default">
            <Link href="/presets/new">
              <PlusCircle className="h-4 w-4 mr-1" />
              新建预设
            </Link>
          </Button>
          
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Import className="h-4 w-4 mr-1" />
            导入预设
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImport} 
              accept=".json" 
              className="hidden" 
            />
          </Button>
        </div>
      </div>
      
      {/* 搜索栏 */}
      <div className="mb-6">
        <Input 
          placeholder="搜索预设..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
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
      
      <div className="grid gap-4">
        {filteredPresets.map((preset) => (
          <div key={preset.id} className="border rounded-lg p-4 bg-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="mb-2 md:mb-0">
                <h2 className="text-xl font-semibold">{preset.name}</h2>
                <p className="text-muted-foreground line-clamp-2">{preset.description || "无描述"}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-sm">
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    温度: {preset.temperature?.toFixed(1) || "默认"}
                  </span>
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    提示词: {preset.prompts.length}项
                  </span>
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    已启用: {preset.prompts.filter(p => p.enabled).length}项
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 mt-2 md:mt-0">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => exportPresetToFile(preset.id)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  导出
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  asChild
                >
                  <Link href={`/presets/${preset.id}`}>
                    <Edit className="h-4 w-4 mr-1" />
                    编辑
                  </Link>
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleDelete(preset.id, preset.name)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除
                </Button>
                
                <Button
                  variant="default"
                  size="sm"
                  asChild
                >
                  <Link href={`/presets/${preset.id}/detail`}>
                    查看
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 