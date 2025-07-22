"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Save, Plus, Trash, XCircle } from "lucide-react";
import { useWorldBookStore } from "@/lib/store";
import { WorldBookEntry } from "@/lib/types";

interface EntryPageProps {
  params: {
    id: string;
    entryId: string;
  };
}

export default function EntryPage({ params }: EntryPageProps) {
  const { id, entryId } = params;
  const router = useRouter();
  
  const { 
    worldBooks, 
    loadWorldBooks, 
    getWorldBook, 
    updateEntry 
  } = useWorldBookStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [entry, setEntry] = useState<WorldBookEntry | null>(null);
  const [worldBookName, setWorldBookName] = useState("");
  
  // 表单状态
  const [formData, setFormData] = useState<Partial<WorldBookEntry>>({
    title: "",
    content: "",
    strategy: "selective",
    enabled: true,
    order: 100,
    position: "after",
    primaryKeys: [],
    secondaryKeys: [],
    selectiveLogic: "andAny",
    caseSensitive: false,
    matchWholeWords: true,
    excludeRecursion: false,
    preventRecursion: false,
    delayUntilRecursion: false,
    recursionLevel: 0,
    probability: 100,
    sticky: 0,
    cooldown: 0,
    delay: 0
  });
  
  // 新关键字输入
  const [newPrimaryKey, setNewPrimaryKey] = useState("");
  const [newSecondaryKey, setNewSecondaryKey] = useState("");
  
  // 当前活动标签
  const [activeTab, setActiveTab] = useState("basic");
  
  // 加载条目数据
  useEffect(() => {
    const loadData = async () => {
      console.log("正在加载条目数据，世界书ID:", id, "条目ID:", entryId);
      
      // 先从状态中获取世界书
      let worldBook = getWorldBook(id);
      
      // 如果状态中没有，则从存储中加载
      if (!worldBook) {
        console.log("状态中没有世界书数据，尝试加载...");
        await loadWorldBooks();
        worldBook = getWorldBook(id);
      }
      
      if (worldBook) {
        console.log("找到世界书:", worldBook.name, "条目数量:", worldBook.entries.length);
        setWorldBookName(worldBook.name);
        
        // 查找条目
        const foundEntry = worldBook.entries.find(e => e.id === entryId);
        console.log("条目查找结果:", foundEntry ? foundEntry.title : "未找到");
        
        if (foundEntry) {
          setEntry(foundEntry);
          setFormData(foundEntry);
          setIsLoading(false);
        } else {
          console.log("条目不存在，可能ID有误:", entryId);
          console.log("可用条目IDs:", worldBook.entries.map(e => e.id));
          setNotFound(true);
          setIsLoading(false);
        }
      } else {
        console.log("世界书不存在，ID:", id);
        setNotFound(true);
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [id, entryId, loadWorldBooks, getWorldBook]);
  
  // 表单字段更新函数
  const updateField = <K extends keyof WorldBookEntry>(
    field: K,
    value: WorldBookEntry[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // 添加主要关键字
  const addPrimaryKey = () => {
    if (newPrimaryKey.trim() && !formData.primaryKeys?.includes(newPrimaryKey.trim())) {
      updateField('primaryKeys', [...(formData.primaryKeys || []), newPrimaryKey.trim()]);
      setNewPrimaryKey("");
    }
  };
  
  // 删除主要关键字
  const removePrimaryKey = (key: string) => {
    updateField('primaryKeys', (formData.primaryKeys || []).filter(k => k !== key));
  };
  
  // 添加次要关键字
  const addSecondaryKey = () => {
    if (newSecondaryKey.trim() && !formData.secondaryKeys?.includes(newSecondaryKey.trim())) {
      updateField('secondaryKeys', [...(formData.secondaryKeys || []), newSecondaryKey.trim()]);
      setNewSecondaryKey("");
    }
  };
  
  // 删除次要关键字
  const removeSecondaryKey = (key: string) => {
    updateField('secondaryKeys', (formData.secondaryKeys || []).filter(k => k !== key));
  };
  
  // 保存条目
  const handleSave = async () => {
    if (!entry) return;
    
    try {
      // 合并原始条目和表单数据
      const updatedEntry: WorldBookEntry = {
        ...entry,
        ...formData,
      };
      
      await updateEntry(id, updatedEntry);
      alert("保存成功");
      
      // 返回世界书详情页
      router.push(`/worldbooks/${id}?tab=entries`);
    } catch (error) {
      console.error("保存条目失败:", error);
      alert("保存条目失败");
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center py-10">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }
  
  if (notFound) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-10">
          <h2 className="text-xl font-bold mb-4">条目不存在</h2>
          <Button asChild>
            <Link href={`/worldbooks/${id}`}>返回世界书详情</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Button variant="ghost" className="mb-2" asChild>
          <Link href={`/worldbooks/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回世界书
          </Link>
        </Button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">编辑条目</h1>
            <p className="text-muted-foreground">世界书: {worldBookName}</p>
          </div>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            保存
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="keywords">关键字</TabsTrigger>
          <TabsTrigger value="recursion">递归设置</TabsTrigger>
          <TabsTrigger value="timing">时效设置</TabsTrigger>
        </TabsList>
        
        {/* 基本信息标签页 */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>基本设置</CardTitle>
              <CardDescription>设置条目的基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={formData.enabled}
                    onCheckedChange={(checked) => updateField('enabled', checked)}
                    id="enabled"
                  />
                  <Label htmlFor="enabled">
                    {formData.enabled ? "已启用" : "已禁用"}
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Label>顺序:</Label>
                  <Input 
                    type="number"
                    value={formData.order}
                    onChange={(e) => updateField('order', parseInt(e.target.value, 10))}
                    className="w-24"
                    min={0}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title">标题</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="条目标题"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">内容</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => updateField('content', e.target.value)}
                  placeholder="条目内容，将被插入到提示词中"
                  rows={8}
                />
              </div>
              
              <div className="space-y-2">
                <Label>激活策略</Label>
                <RadioGroup 
                  value={formData.strategy}
                  onValueChange={(value: 'constant' | 'selective' | 'vectorized') => 
                    updateField('strategy', value)
                  }
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="constant" id="constant" />
                    <Label htmlFor="constant" className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                      常量（总是激活）
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="selective" id="selective" />
                    <Label htmlFor="selective" className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                      选择性（关键字触发）
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="vectorized" id="vectorized" />
                    <Label htmlFor="vectorized" className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                      向量化（语义触发）
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label>插入位置</Label>
                <RadioGroup 
                  value={formData.position}
                  onValueChange={(value: 'before' | 'after') => 
                    updateField('position', value)
                  }
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="before" id="before" />
                    <Label htmlFor="before">角色描述前</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="after" id="after" />
                    <Label htmlFor="after">角色描述后</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 关键字标签页 */}
        <TabsContent value="keywords">
          <Card>
            <CardHeader>
              <CardTitle>关键字设置</CardTitle>
              <CardDescription>当使用选择性激活策略时的关键字设置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.strategy === 'selective' ? (
                <>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label htmlFor="primaryKeys">主要关键字</Label>
                      <div className="text-sm text-muted-foreground">
                        匹配这些关键字会激活条目
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        id="primaryKeys"
                        value={newPrimaryKey}
                        onChange={(e) => setNewPrimaryKey(e.target.value)}
                        placeholder="添加主要关键字"
                        onKeyDown={(e) => e.key === 'Enter' && addPrimaryKey()}
                      />
                      <Button type="button" onClick={addPrimaryKey}>
                        添加
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {(formData.primaryKeys || []).length > 0 ? (
                        formData.primaryKeys?.map((key) => (
                          <div 
                            key={key}
                            className="flex items-center gap-1 bg-secondary px-2 py-1 rounded"
                          >
                            <span>{key}</span>
                            <button 
                              type="button" 
                              onClick={() => removePrimaryKey(key)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          暂无主要关键字
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <Label htmlFor="secondaryKeys">次要关键字</Label>
                      <div className="text-sm text-muted-foreground">
                        用于筛选主要关键字匹配
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        id="secondaryKeys"
                        value={newSecondaryKey}
                        onChange={(e) => setNewSecondaryKey(e.target.value)}
                        placeholder="添加次要关键字"
                        onKeyDown={(e) => e.key === 'Enter' && addSecondaryKey()}
                      />
                      <Button type="button" onClick={addSecondaryKey}>
                        添加
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {(formData.secondaryKeys || []).length > 0 ? (
                        formData.secondaryKeys?.map((key) => (
                          <div 
                            key={key}
                            className="flex items-center gap-1 bg-secondary/60 px-2 py-1 rounded"
                          >
                            <span>{key}</span>
                            <button 
                              type="button" 
                              onClick={() => removeSecondaryKey(key)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          暂无次要关键字
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>关键字逻辑</Label>
                    <RadioGroup 
                      value={formData.selectiveLogic}
                      onValueChange={(value: 'andAny' | 'andAll' | 'notAny' | 'notAll') => 
                        updateField('selectiveLogic', value)
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="andAny" id="andAny" />
                        <Label htmlFor="andAny">包含任一次要关键字</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="andAll" id="andAll" />
                        <Label htmlFor="andAll">包含所有次要关键字</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="notAny" id="notAny" />
                        <Label htmlFor="notAny">不包含任何次要关键字</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="notAll" id="notAll" />
                        <Label htmlFor="notAll">不包含所有次要关键字</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="caseSensitive"
                        checked={formData.caseSensitive}
                        onCheckedChange={(checked) => updateField('caseSensitive', checked)}
                      />
                      <Label htmlFor="caseSensitive">区分大小写</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="matchWholeWords"
                        checked={formData.matchWholeWords}
                        onCheckedChange={(checked) => updateField('matchWholeWords', checked)}
                      />
                      <Label htmlFor="matchWholeWords">全词匹配</Label>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-10 text-center text-muted-foreground">
                  {formData.strategy === 'constant' ? 
                    '常量条目无需设置关键字，它们总是被激活' : 
                    '向量条目使用语义相似度，不需要设置关键字'
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 递归标签页 */}
        <TabsContent value="recursion">
          <Card>
            <CardHeader>
              <CardTitle>递归设置</CardTitle>
              <CardDescription>控制条目如何参与递归激活</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="excludeRecursion"
                  checked={formData.excludeRecursion}
                  onCheckedChange={(checked) => updateField('excludeRecursion', checked)}
                />
                <Label htmlFor="excludeRecursion">不可递归（不被其他条目激活）</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="preventRecursion"
                  checked={formData.preventRecursion}
                  onCheckedChange={(checked) => updateField('preventRecursion', checked)}
                />
                <Label htmlFor="preventRecursion">防止进一步递归</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="delayUntilRecursion"
                  checked={formData.delayUntilRecursion}
                  onCheckedChange={(checked) => updateField('delayUntilRecursion', checked)}
                />
                <Label htmlFor="delayUntilRecursion">延迟到递归（仅通过递归激活）</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="recursionLevel">递归等级: {formData.recursionLevel}</Label>
                <Slider 
                  id="recursionLevel"
                  value={[formData.recursionLevel || 0]}
                  onValueChange={(values) => updateField('recursionLevel', values[0])}
                  min={0}
                  max={5}
                  step={1}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 时效设置标签页 */}
        <TabsContent value="timing">
          <Card>
            <CardHeader>
              <CardTitle>时效设置</CardTitle>
              <CardDescription>控制条目激活的时间效果</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>
                  激活概率: {formData.probability}%
                </Label>
                <Slider 
                  value={[formData.probability || 100]}
                  onValueChange={(values) => updateField('probability', values[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="py-4"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sticky">
                  黏性（保持激活的消息数）: {formData.sticky}
                </Label>
                <Slider 
                  id="sticky"
                  value={[formData.sticky || 0]}
                  onValueChange={(values) => updateField('sticky', values[0])}
                  min={0}
                  max={10}
                  step={1}
                  className="py-4"
                />
                <div className="text-xs text-muted-foreground">
                  0 = 无黏性，只在匹配时激活
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cooldown">
                  冷却（不能激活的消息数）: {formData.cooldown}
                </Label>
                <Slider 
                  id="cooldown"
                  value={[formData.cooldown || 0]}
                  onValueChange={(values) => updateField('cooldown', values[0])}
                  min={0}
                  max={10}
                  step={1}
                  className="py-4"
                />
                <div className="text-xs text-muted-foreground">
                  0 = 无冷却，可以连续激活
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="delay">
                  延迟（要求最少消息数才能激活）: {formData.delay}
                </Label>
                <Slider 
                  id="delay"
                  value={[formData.delay || 0]}
                  onValueChange={(values) => updateField('delay', values[0])}
                  min={0}
                  max={10}
                  step={1}
                  className="py-4"
                />
                <div className="text-xs text-muted-foreground">
                  0 = 无延迟，对话开始即可激活
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 