"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePromptPresetStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { 
  PlusCircle, Import, Edit, Trash2, Download, ChevronRight, 
  Sliders, Search, XCircle, Check, Plus
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useResponsiveView } from "@/lib/useResponsiveView";
import { PresetListItem } from "@/components/ui/preset-list-item";
import { BatchImport, ImportResult } from "@/components/ui/batch-import";

type ViewMode = 'grid' | 'list';

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
  const [viewMode, setViewMode] = useResponsiveView('presets-view-mode');
  
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
  
  // 处理批量导入
  const handleBatchImport = async (files: File[]): Promise<ImportResult[]> => {
    const results: ImportResult[] = [];
    
    for (const file of files) {
      try {
        const preset = await importPresetFromFile(file);
        if (preset) {
          results.push({
            success: true,
            fileName: file.name,
            id: preset.id,
            name: preset.name,
            message: `成功导入预设: ${preset.name}`
          });
        } else {
          results.push({
            success: false,
            fileName: file.name,
            message: "无效的预设文件"
          });
        }
      } catch (error) {
        console.error("导入预设失败:", error);
        results.push({
          success: false,
          fileName: file.name,
          message: error instanceof Error ? error.message : "导入失败"
        });
      }
    }
    
    return results;
  };
  
  // 处理删除
  const handleDelete = async (id: string, name: string) => {
    // 防止删除默认预设
    if (id === 'default') {
      alert('默认预设不能删除');
      return;
    }
    
    if (confirm(`确定要删除预设 "${name}" 吗？此操作不可撤销。`)) {
      await deletePreset(id);
    }
  };

  // 处理视图切换
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
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
          {/* 视图切换组件 */}
          <div className="hidden sm:block">
            <ViewToggle viewMode={viewMode} onChange={handleViewModeChange} />
          </div>
          
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
          
          <BatchImport
            onImport={handleBatchImport}
            accept=".json"
            buttonText="批量导入"
            variant="outline"
          />
          
          <Button variant="default">
            <Link href="/presets/new" className="flex items-center">
              <Plus className="h-4 w-4 mr-1" />
              新建预设
            </Link>
          </Button>
        </div>
      </div>
      
      {/* 移动端专用的视图切换按钮 */}
      <div className="sm:hidden flex justify-between items-center mb-4">
        <ViewToggle viewMode={viewMode} onChange={handleViewModeChange} />
        
        {!showSearch && (
          <Button variant="ghost" size="icon" onClick={() => setShowSearch(true)}>
            <Search className="h-4 w-4" />
          </Button>
        )}
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
      
      {!isLoading && filteredPresets.length > 0 && (
        viewMode === 'grid' ? (
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
        ) : (
          <div className="space-y-3">
            {filteredPresets.map((preset) => (
              <PresetListItem 
                key={preset.id}
                preset={preset}
                onExport={exportPresetToFile}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
} 