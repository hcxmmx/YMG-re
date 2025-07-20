"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePromptPresetStore } from "@/lib/store";
import { ArrowLeft, Edit, ChevronUp, ChevronDown, Trash2, Plus, Power, PowerOff, Info } from "lucide-react";
import { PromptPresetItem } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface EditPresetPageProps {
  params: {
    id: string;
  };
}

export default function EditPresetPage({ params }: EditPresetPageProps) {
  const router = useRouter();
  const { id } = params;
  
  const { presets, getPreset, savePreset, loadPresets } = usePromptPresetStore();
  
  // 编辑状态
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [topK, setTopK] = useState(40);
  const [topP, setTopP] = useState(0.95);
  const [prompts, setPrompts] = useState<PromptPresetItem[]>([]);
  const [activeTab, setActiveTab] = useState("basic");
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  // 当前编辑的提示词
  const [editPromptIndex, setEditPromptIndex] = useState<number | null>(null);
  const [editPrompt, setEditPrompt] = useState<PromptPresetItem | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  
  // 加载预设数据
  useEffect(() => {
    loadPresets().then(() => {
      const preset = getPreset(id);
      if (preset) {
        setName(preset.name);
        setDescription(preset.description || "");
        setTemperature(preset.temperature || 0.7);
        setMaxTokens(preset.maxTokens || 1024);
        setTopK(preset.topK || 40);
        setTopP(preset.topP || 0.95);
        setPrompts([...preset.prompts]);
        setIsLoading(false);
      } else {
        setNotFound(true);
        setIsLoading(false);
      }
    });
  }, [id, loadPresets, getPreset]);
  
  // 处理保存
  const handleSave = async () => {
    const preset = getPreset(id);
    if (!preset) return;
    
    const updatedPreset = {
      ...preset,
      name,
      description,
      temperature,
      maxTokens,
      topK,
      topP,
      prompts,
      updatedAt: Date.now()
    };
    
    await savePreset(updatedPreset);
    router.push("/presets");
  };
  
  // 添加提示词
  const addPrompt = () => {
    const newPrompt = {
      identifier: `prompt_${Date.now()}`,
      name: `提示词 ${prompts.length + 1}`,
      content: "",
      enabled: true,
      isPlaceholder: false
    };
    
    setPrompts([...prompts, newPrompt]);
    
    // 立即打开编辑对话框
    setEditPrompt(newPrompt);
    setEditPromptIndex(prompts.length);
    setShowDialog(true);
  };
  
  // 开始编辑提示词
  const startEditPrompt = (index: number) => {
    setEditPrompt({...prompts[index]});
    setEditPromptIndex(index);
    setShowDialog(true);
  };
  
  // 保存编辑中的提示词
  const savePromptEdit = () => {
    if (editPrompt && editPromptIndex !== null) {
      const updatedPrompts = [...prompts];
      updatedPrompts[editPromptIndex] = editPrompt;
      setPrompts(updatedPrompts);
      setShowDialog(false);
      setEditPrompt(null);
      setEditPromptIndex(null);
    }
  };
  
  // 更新提示词启用状态
  const togglePromptEnabled = (index: number) => {
    const updatedPrompts = [...prompts];
    updatedPrompts[index] = { 
      ...updatedPrompts[index], 
      enabled: !updatedPrompts[index].enabled 
    };
    setPrompts(updatedPrompts);
  };
  
  // 删除提示词
  const deletePrompt = (index: number) => {
    if (confirm("确定要删除此提示词条目吗？此操作不可撤销。")) {
      setPrompts(prompts.filter((_, i) => i !== index));
    }
  };
  
  // 移动提示词（上移/下移）
  const movePrompt = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) || 
      (direction === "down" && index === prompts.length - 1)
    ) {
      return;
    }
    
    const updatedPrompts = [...prompts];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    
    // 交换位置
    [updatedPrompts[index], updatedPrompts[newIndex]] = [updatedPrompts[newIndex], updatedPrompts[index]];
    
    setPrompts(updatedPrompts);
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
          <h1 className="text-2xl font-bold">编辑预设</h1>
        </div>
        
        <Button onClick={handleSave}>保存预设</Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="prompts">提示词管理</TabsTrigger>
        </TabsList>
        
        {/* 基本信息标签页 */}
        <TabsContent value="basic" className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="preset-name">预设名称</Label>
                <Input 
                  id="preset-name"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="preset-description">预设描述</Label>
                <Textarea 
                  id="preset-description"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  className="mt-1 min-h-[100px]"
                  placeholder="描述此预设的用途和功能..."
                />
              </div>
            </div>
          </Card>
          
          {/* 模型参数 */}
          <Card className="p-6">
            <div className="space-y-6">
              <h2 className="text-lg font-medium">模型参数</h2>
              
              {/* 温度滑块 */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="temperature">温度 (Temperature)</Label>
                  <span className="text-sm text-muted-foreground">{temperature.toFixed(1)}</span>
                </div>
                <Slider
                  id="temperature"
                  min={0}
                  max={2}
                  step={0.1}
                  value={[temperature]}
                  onValueChange={(values) => setTemperature(values[0])}
                />
                <p className="text-xs text-muted-foreground">
                  控制生成文本的随机性和创造性。值越低生成的结果越确定性，值越高结果越多样化。
                </p>
              </div>
              
              {/* 最大标记数滑块 */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="max-tokens">最大输出标记数</Label>
                  <span className="text-sm text-muted-foreground">{maxTokens}</span>
                </div>
                <Slider
                  id="max-tokens"
                  min={256}
                  max={8192}
                  step={256}
                  value={[maxTokens]}
                  onValueChange={(values) => setMaxTokens(values[0])}
                />
                <p className="text-xs text-muted-foreground">
                  限制AI回复的最大长度。
                </p>
              </div>
              
              {/* Top-K滑块 */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="top-k">Top-K</Label>
                  <span className="text-sm text-muted-foreground">{topK}</span>
                </div>
                <Slider
                  id="top-k"
                  min={1}
                  max={100}
                  step={1}
                  value={[topK]}
                  onValueChange={(values) => setTopK(values[0])}
                />
                <p className="text-xs text-muted-foreground">
                  在每一步只考虑概率最高的K个词。较小的值使输出更加确定，较大的值使输出更加多样。
                </p>
              </div>
              
              {/* Top-P滑块 */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="top-p">Top-P</Label>
                  <span className="text-sm text-muted-foreground">{topP.toFixed(2)}</span>
                </div>
                <Slider
                  id="top-p"
                  min={0.1}
                  max={1}
                  step={0.01}
                  value={[topP]}
                  onValueChange={(values) => setTopP(values[0])}
                />
                <p className="text-xs text-muted-foreground">
                  核采样，考虑概率累加到P的词。较小的值使输出更加确定，较大的值使输出更加多样。
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        {/* 提示词管理标签页 */}
        <TabsContent value="prompts" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-medium">提示词管理</h2>
              <p className="text-sm text-muted-foreground">
                已启用 {prompts.filter(p => p.enabled).length}/{prompts.length} 项
              </p>
            </div>
            <Button onClick={addPrompt}>
              <Plus className="h-4 w-4 mr-1" />
              添加提示词
            </Button>
          </div>
          
          <Card>
            {prompts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                没有提示词条目。点击"添加提示词"按钮创建一个。
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="divide-y">
                  {prompts.map((prompt, index) => (
                    <div
                      key={prompt.identifier}
                      className={cn(
                        "flex items-center justify-between p-4 hover:bg-muted/30 transition-colors",
                        !prompt.enabled && "opacity-60"
                      )}
                    >
                      <div className="flex-grow mr-4">
                        <div className="flex items-center">
                          <Switch
                            checked={prompt.enabled}
                            onCheckedChange={() => togglePromptEnabled(index)}
                            className="mr-3"
                          />
                          <div>
                            <div className="font-medium flex items-center gap-1">
                              {prompt.name}
                              {prompt.isPlaceholder && (
                                <Badge variant="outline" className="ml-1 bg-primary/10 text-xs">
                                  {prompt.placeholderType}
                                  {!prompt.implemented && " ⚠️"}
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {prompt.isPlaceholder 
                                ? (prompt.implemented 
                                    ? "动态替换为实际内容" 
                                    : "未实现的占位类型") 
                                : prompt.content.substring(0, 100) + (prompt.content.length > 100 ? "..." : "")}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-1 shrink-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => movePrompt(index, "up")}
                                disabled={index === 0}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>上移</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => movePrompt(index, "down")}
                                disabled={index === prompts.length - 1}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>下移</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => startEditPrompt(index)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>编辑</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive"
                                onClick={() => deletePrompt(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>删除</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* 提示词编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={(open) => !open && setShowDialog(false)}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editPromptIndex !== null && editPromptIndex < prompts.length && prompts[editPromptIndex].isPlaceholder
                ? "编辑占位条目"
                : "编辑提示词"}
            </DialogTitle>
          </DialogHeader>
          
          {editPrompt && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="prompt-name">名称</Label>
                <Input
                  id="prompt-name"
                  value={editPrompt.name}
                  onChange={(e) => setEditPrompt({...editPrompt, name: e.target.value})}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="prompt-enabled"
                  checked={editPrompt.enabled}
                  onCheckedChange={(checked) => setEditPrompt({...editPrompt, enabled: checked})}
                />
                <Label htmlFor="prompt-enabled">启用</Label>
              </div>
              
              {editPrompt.isPlaceholder ? (
                <div className="space-y-2 bg-muted/30 p-4 rounded-md">
                  <div className="flex items-center">
                    <Info className="h-4 w-4 mr-2 text-muted-foreground" />
                    <Label>占位类型: {editPrompt.placeholderType}</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    这是一个动态占位条目，将在运行时替换为实际内容。
                    {!editPrompt.implemented && " ⚠️ 此占位类型尚未实现，应用预设时将被忽略。"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="prompt-content">内容</Label>
                  <Textarea
                    id="prompt-content"
                    value={editPrompt.content}
                    onChange={(e) => setEditPrompt({...editPrompt, content: e.target.value})}
                    className="min-h-[200px] font-mono"
                  />
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={savePromptEdit}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 