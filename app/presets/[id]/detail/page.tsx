"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePromptPresetStore } from "@/lib/store";
import { ArrowLeft, Edit, Download, Copy } from "lucide-react";

interface PresetDetailPageProps {
  params: {
    id: string;
  };
}

export default function PresetDetailPage({ params }: PresetDetailPageProps) {
  const { id } = params;
  
  const { presets, getPreset, loadPresets, exportPresetToFile, applyPreset } = usePromptPresetStore();
  
  const [preset, setPreset] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [applied, setApplied] = useState(false);
  
  // 加载预设数据
  useEffect(() => {
    loadPresets().then(() => {
      const foundPreset = getPreset(id);
      if (foundPreset) {
        setPreset(foundPreset);
        setIsLoading(false);
      } else {
        setNotFound(true);
        setIsLoading(false);
      }
    });
  }, [id, loadPresets, getPreset]);
  
  // 处理应用预设
  const handleApplyPreset = async () => {
    await applyPreset(id);
    setApplied(true);
    
    // 3秒后重置应用状态
    setTimeout(() => setApplied(false), 3000);
  };
  
  // 复制系统提示词
  const copySystemPrompt = () => {
    if (!preset) return;
    
    // 构建系统提示词
    const systemPromptParts: string[] = [];
    
    for (const promptItem of preset.prompts) {
      if (!promptItem.enabled) continue;
      
      // 忽略未实现的占位条目
      if (promptItem.isPlaceholder && !promptItem.implemented) continue;
      
      // 非占位条目，直接添加内容
      if (!promptItem.isPlaceholder) {
        systemPromptParts.push(promptItem.content);
      } else {
        // 占位条目，添加提示
        systemPromptParts.push(`[这里将在运行时替换为${
          promptItem.placeholderType === 'chatHistory' ? '对话历史' : 
          promptItem.placeholderType === 'charDescription' ? '角色描述' : 
          '动态内容'
        }]`);
      }
    }
    
    const systemPrompt = systemPromptParts.join('\n\n');
    
    // 复制到剪贴板
    navigator.clipboard.writeText(systemPrompt);
    alert('系统提示词已复制到剪贴板');
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  if (notFound) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/presets">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">预设未找到</h1>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          未找到ID为 {id} 的预设。可能已被删除或ID无效。
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/presets">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{preset.name}</h1>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportPresetToFile(id)}>
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/presets/${id}`}>
              <Edit className="h-4 w-4 mr-1" />
              编辑
            </Link>
          </Button>
        </div>
      </div>
      
      {/* 预设信息 */}
      <div className="space-y-6">
        {/* 描述 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-medium mb-2">描述</h2>
          <p className="text-muted-foreground">
            {preset.description || "无描述"}
          </p>
        </div>
        
        {/* 模型参数 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-medium mb-4">模型参数</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium">温度 (Temperature)</h3>
              <p className="text-xl">{preset.temperature?.toFixed(1) || "默认"}</p>
              <p className="text-xs text-muted-foreground">控制生成文本的随机性和创造性</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">最大输出标记数</h3>
              <p className="text-xl">{preset.maxTokens || "默认"}</p>
              <p className="text-xs text-muted-foreground">限制AI回复的最大长度</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Top-K</h3>
              <p className="text-xl">{preset.topK || "默认"}</p>
              <p className="text-xs text-muted-foreground">在每一步只考虑概率最高的K个词</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Top-P</h3>
              <p className="text-xl">{preset.topP?.toFixed(2) || "默认"}</p>
              <p className="text-xs text-muted-foreground">核采样，考虑概率累加到P的词</p>
            </div>
          </div>
        </div>
        
        {/* 提示词条目 */}
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">提示词条目</h2>
            <div className="text-sm text-muted-foreground">
              共 {preset.prompts.length} 项，已启用 {preset.prompts.filter((p: any) => p.enabled).length} 项
            </div>
          </div>
          
          {preset.prompts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              没有提示词条目。
            </div>
          ) : (
            <div className="space-y-4">
              {preset.prompts.map((prompt: any) => (
                <div 
                  key={prompt.identifier} 
                  className={`border rounded-md p-4 ${!prompt.enabled ? 'opacity-50' : ''} ${prompt.isPlaceholder ? 'bg-muted/20' : ''}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{prompt.name}</h3>
                      {!prompt.enabled && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          已禁用
                        </span>
                      )}
                      {prompt.isPlaceholder && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          占位条目 {prompt.implemented ? '✓' : '⚠️'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {prompt.isPlaceholder ? (
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-sm">
                        {prompt.placeholderType === 'chatHistory' && '这是一个动态占位条目，将在运行时替换为当前的聊天历史。'}
                        {prompt.placeholderType === 'charDescription' && '这是一个动态占位条目，将在运行时替换为当前角色的描述。'}
                        {!prompt.implemented && '⚠️ 此占位类型尚未实现，应用预设时将被忽略。'}
                      </p>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md text-sm overflow-x-auto">
                      {prompt.content}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 mt-8">
          <Button variant="outline" onClick={copySystemPrompt}>
            <Copy className="h-4 w-4 mr-1" />
            复制系统提示词
          </Button>
          <Button onClick={handleApplyPreset} className={applied ? "bg-green-600" : ""}>
            {applied ? "已应用" : "应用此预设"}
          </Button>
        </div>
      </div>
    </div>
  );
} 