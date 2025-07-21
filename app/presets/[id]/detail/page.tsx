"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePromptPresetStore } from "@/lib/store";
import { ArrowLeft, Edit, Download, Copy, CheckCircle, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
  const [systemPrompt, setSystemPrompt] = useState("");
  const [activeTab, setActiveTab] = useState("prompts");
  
  // 加载预设数据
  useEffect(() => {
    loadPresets().then(() => {
      const foundPreset = getPreset(id);
      if (foundPreset) {
        setPreset(foundPreset);
        
        // 构建系统提示词预览
        const systemPromptParts: string[] = [];
        
        for (const promptItem of foundPreset.prompts) {
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
              promptItem.placeholderType === 'personaDescription' ? '玩家描述' : 
              '动态内容'
            }]`);
          }
        }
        
        setSystemPrompt(systemPromptParts.join('\n\n'));
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
    if (!systemPrompt) return;
    
    navigator.clipboard.writeText(systemPrompt);
    // 使用Toast或通知代替alert
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg flex items-center';
    notification.innerHTML = `<svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>系统提示词已复制到剪贴板`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s ease';
      setTimeout(() => document.body.removeChild(notification), 500);
    }, 3000);
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
    <div className="container max-w-screen-xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/presets">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{preset.name}</h1>
            <p className="text-sm text-muted-foreground">{preset.description || "无描述"}</p>
          </div>
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
          <Button onClick={handleApplyPreset} className={applied ? "bg-green-600" : ""} size="sm">
            {applied ? (
              <><CheckCircle className="h-4 w-4 mr-1" /> 已应用</>
            ) : (
              "应用此预设"
            )}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 左侧 - 参数和提示词条目 */}
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="prompts">提示词</TabsTrigger>
              <TabsTrigger value="params">模型参数</TabsTrigger>
            </TabsList>
            
            <TabsContent value="prompts" className="pt-4">
              <Card>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">提示词条目</CardTitle>
                    <Badge variant="outline" className="bg-primary/10">
                      {preset.prompts.filter((p: any) => p.enabled).length}/{preset.prompts.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="py-0 px-0">
                  <ScrollArea className="h-[400px]">
                    <div className="divide-y">
                      {preset.prompts.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          没有提示词条目。
                        </div>
                      ) : (
                        preset.prompts.map((prompt: any, index: number) => (
                          <div 
                            key={prompt.identifier}
                            className={cn(
                              "py-2 px-4 hover:bg-muted/20",
                              !prompt.enabled && "opacity-50"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div 
                                  className={cn(
                                    "w-3 h-3 rounded-full mr-2",
                                    prompt.enabled ? "bg-green-500" : "bg-gray-300"
                                  )}
                                />
                                <div>
                                  <div className="font-medium text-sm">
                                    {prompt.name}
                                  </div>
                                  {prompt.isPlaceholder && (
                                    <Badge variant="outline" className="mt-1 text-xs bg-primary/10">
                                      {prompt.placeholderType}
                                      {!prompt.implemented && " ⚠️"}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
                                      <Link href={`/presets/${id}?promptIndex=${index}`}>
                                        <ChevronRight className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>编辑此提示词</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="params" className="pt-4">
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-base">模型参数</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium">温度 (Temperature)</h3>
                    <div className="flex items-center">
                      <div className="w-full bg-muted h-2 rounded-full mr-2 mt-1">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{width: `${(preset.temperature || 0.7) * 50}%`}}
                        ></div>
                      </div>
                      <span className="text-sm">{(preset.temperature || 0.7).toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">控制生成文本的随机性和创造性</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium">最大输出标记数</h3>
                    <div className="flex items-center">
                      <div className="w-full bg-muted h-2 rounded-full mr-2 mt-1">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{width: `${((preset.maxTokens || 1024) / 8192) * 100}%`}}
                        ></div>
                      </div>
                      <span className="text-sm">{preset.maxTokens || 1024}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">限制AI回复的最大长度</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium">Top-K</h3>
                    <div className="flex items-center">
                      <div className="w-full bg-muted h-2 rounded-full mr-2 mt-1">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{width: `${((preset.topK || 40) / 100) * 100}%`}}
                        ></div>
                      </div>
                      <span className="text-sm">{preset.topK || 40}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">在每一步只考虑概率最高的K个词</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium">Top-P</h3>
                    <div className="flex items-center">
                      <div className="w-full bg-muted h-2 rounded-full mr-2 mt-1">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{width: `${(preset.topP || 0.95) * 100}%`}}
                        ></div>
                      </div>
                      <span className="text-sm">{(preset.topP || 0.95).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">核采样，考虑概率累加到P的词</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* 右侧 - 系统提示词预览 */}
        <div className="md:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">系统提示词预览</CardTitle>
                <Button variant="ghost" size="sm" onClick={copySystemPrompt}>
                  <Copy className="h-4 w-4 mr-1" />
                  复制
                </Button>
              </div>
              <CardDescription>
                此预览显示应用预设时构建的系统提示词。占位内容将在运行时动态替换。
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow p-0">
              <ScrollArea className="h-full">
                <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md text-sm overflow-x-auto min-h-[400px] mx-6">
                  {systemPrompt || "预设未包含任何启用的提示词，系统提示词将为空。"}
                </pre>
              </ScrollArea>
            </CardContent>
            <CardFooter className="border-t mt-auto py-3">
              <Button onClick={handleApplyPreset} className={applied ? "bg-green-600" : ""}>
                {applied ? (
                  <><CheckCircle className="h-4 w-4 mr-1" /> 已应用</>
                ) : (
                  "应用此预设"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
} 