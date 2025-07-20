"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePromptPresetStore } from "@/lib/store";
import { ArrowLeft } from "lucide-react";
import { PromptPresetItem } from "@/lib/types";

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
    setPrompts([
      ...prompts,
      {
        identifier: `prompt_${Date.now()}`,
        name: `提示词 ${prompts.length + 1}`,
        content: "",
        enabled: true,
        isPlaceholder: false
      }
    ]);
  };
  
  // 更新提示词
  const updatePrompt = (index: number, field: string, value: string | boolean) => {
    const updatedPrompts = [...prompts];
    updatedPrompts[index] = { 
      ...updatedPrompts[index], 
      [field]: value 
    };
    setPrompts(updatedPrompts);
  };
  
  // 删除提示词
  const deletePrompt = (index: number) => {
    setPrompts(prompts.filter((_, i) => i !== index));
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
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="mr-4">
          <Link href="/presets">
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">编辑预设</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="prompts">提示词管理</TabsTrigger>
        </TabsList>
        
        {/* 基本信息标签页 */}
        <TabsContent value="basic" className="space-y-6">
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
            
            {/* 模型参数 */}
            <div className="space-y-6 pt-4">
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
                  在每一步只考虑概率最高的K个词。
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
                  min={0}
                  max={1}
                  step={0.01}
                  value={[topP]}
                  onValueChange={(values) => setTopP(values[0])}
                />
                <p className="text-xs text-muted-foreground">
                  核采样，考虑概率累加到P的词。减少低概率但可能不适当的词。
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* 提示词管理标签页 */}
        <TabsContent value="prompts" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">提示词条目</h2>
            <Button onClick={addPrompt}>添加提示词</Button>
          </div>
          
          {prompts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              没有提示词条目。点击"添加提示词"按钮创建。
            </div>
          ) : (
            <div className="space-y-6">
              {prompts.map((prompt, index) => (
                <div 
                  key={prompt.identifier} 
                  className={`border rounded-md p-4 ${prompt.isPlaceholder ? 'bg-muted/20' : ''}`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <Input
                        value={prompt.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updatePrompt(index, "name", e.target.value)}
                        className="font-medium w-64"
                        disabled={prompt.isPlaceholder}
                      />
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={prompt.enabled}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updatePrompt(index, "enabled", e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">启用</span>
                      </label>
                      
                      {prompt.isPlaceholder && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          占位条目 {prompt.implemented ? '✓' : '⚠️'}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => movePrompt(index, "up")}
                        disabled={index === 0}
                      >
                        上移
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => movePrompt(index, "down")}
                        disabled={index === prompts.length - 1}
                      >
                        下移
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => deletePrompt(index)}
                      >
                        删除
                      </Button>
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
                    <Textarea
                      value={prompt.content}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updatePrompt(index, "content", e.target.value)}
                      className="min-h-[200px]"
                      placeholder="在此输入提示词内容..."
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" asChild>
          <Link href="/presets">取消</Link>
        </Button>
        <Button onClick={handleSave}>保存更改</Button>
      </div>
    </div>
  );
} 