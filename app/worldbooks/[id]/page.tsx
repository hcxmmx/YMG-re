"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Plus, Trash, Users, Settings as SettingsIcon, X, Check, Play } from "lucide-react";
import { useWorldBookStore } from "@/lib/store";
import { WorldBook, WorldBookEntry, Character } from "@/lib/types";
import { characterStorage } from "@/lib/storage";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

interface WorldBookPageProps {
  params: {
    id: string;
  };
}

export default function WorldBookPage({ params }: WorldBookPageProps) {
  const { id } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 添加对高亮条目的引用
  const highlightEntryId = searchParams.get('highlightEntryId');
  const highlightedEntryRef = useRef<HTMLDivElement>(null);
  
  const { 
    worldBooks, 
    loadWorldBooks, 
    getWorldBook, 
    saveWorldBook, 
    addEntry, 
    deleteEntry, 
    toggleEntryEnabled,
    toggleWorldBookEnabled,
    getLinkedCharacters,
    linkToCharacter,
    unlinkFromCharacter,
    updateEntry // 新增 updateEntry
  } = useWorldBookStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [worldBook, setWorldBook] = useState<WorldBook | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [linkedCharacters, setLinkedCharacters] = useState<Character[]>([]);
  const [availableCharacters, setAvailableCharacters] = useState<Character[]>([]);
  const [isLinkingCharacter, setIsLinkingCharacter] = useState(false);
  
  // 表单状态
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(true);
  // 根据URL查询参数设置初始标签
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab');
    return tab && ['info', 'entries', 'characters', 'settings'].includes(tab) ? tab : 'info';
  });
  
  // 加载世界书详情
  useEffect(() => {
    const loadData = async () => {
      // 先尝试从状态中获取世界书
      let wb = getWorldBook(id);
      
      // 如果状态中没有，尝试从存储中加载
      if (!wb) {
        await loadWorldBooks();
        wb = getWorldBook(id);
      }
      
      if (wb) {
        setWorldBook(wb);
        setName(wb.name);
        setDescription(wb.description || "");
        setEnabled(wb.enabled);
        
        // 加载关联的角色
        try {
          const characters = await getLinkedCharacters(id);
          setLinkedCharacters(characters);
          
          // 加载所有可用角色（未关联的）
          const allCharacters = await characterStorage.listCharacters();
          const linkedIds = characters.map((c: any) => c.id);
          setAvailableCharacters(allCharacters.filter((c: any) => !linkedIds.includes(c.id)));
        } catch (error) {
          console.error("获取角色数据失败", error);
        }
        
        setIsLoading(false);
      } else {
        setNotFound(true);
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [id, getWorldBook, loadWorldBooks, getLinkedCharacters]);

  // 添加滚动到高亮条目的效果
  useEffect(() => {
    // 当条目加载完成且有指定高亮ID时，滚动到对应条目
    if (!isLoading && highlightEntryId && highlightedEntryRef.current) {
      // 等待DOM更新完成
      setTimeout(() => {
        highlightedEntryRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    }
  }, [isLoading, highlightEntryId, worldBook]);
  
  // 保存世界书信息
  const handleSave = async () => {
    if (!worldBook) return;
    
    try {
      // 获取最新的世界书数据，确保包含最新的关联信息
      const latestWorldBook = await getWorldBook(worldBook.id);
      if (!latestWorldBook) {
        alert("获取最新数据失败");
        return;
      }
      
      await saveWorldBook({
        ...latestWorldBook, // 使用最新的数据作为基础
        name,
        description,
        enabled
      });
      
      alert("保存成功");
      
      // 保存成功后返回世界书管理页面
      router.push("/worldbooks");
    } catch (error) {
      console.error("保存世界书失败:", error);
      alert("保存世界书失败");
    }
  };
  
  // 切换世界书启用状态
  const handleToggleEnabled = async () => {
    if (!worldBook) return;
    
    try {
      await toggleWorldBookEnabled(worldBook.id);
      setEnabled(!enabled);
    } catch (error) {
      console.error("切换世界书启用状态失败:", error);
      alert("切换世界书启用状态失败");
    }
  };
  
  // 添加新条目
  const handleAddEntry = async () => {
    if (!worldBook) return;
    
    try {
      console.log("添加新条目到世界书:", worldBook.id);
      const newEntry = await addEntry(worldBook.id, {
        title: "新条目",
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
      
      console.log("条目添加成功，新条目ID:", newEntry.id);
      
      // 重新加载世界书以获取最新状态
      await loadWorldBooks();
      const updatedWorldBook = getWorldBook(id);
      if (updatedWorldBook) {
        setWorldBook(updatedWorldBook);
        console.log("世界书已更新，条目数量:", updatedWorldBook.entries.length);
        console.log("条目IDs:", updatedWorldBook.entries.map(e => e.id));
      }
      
      // 切换到条目标签
      setActiveTab("entries");
    } catch (error) {
      console.error("添加条目失败:", error);
      alert("添加条目失败");
    }
  };
  
  // 切换条目启用状态
  const handleToggleEntryEnabled = async (entryId: string) => {
    if (!worldBook) return;
    
    try {
      await toggleEntryEnabled(worldBook.id, entryId);
      
      // 刷新数据
      const updatedWorldBook = getWorldBook(id);
      if (updatedWorldBook) {
        setWorldBook(updatedWorldBook);
      }
    } catch (error) {
      console.error("切换条目启用状态失败:", error);
      alert("切换条目启用状态失败");
    }
  };
  
  // 删除条目
  const handleDeleteEntry = async (entryId: string) => {
    if (!worldBook) return;
    
    try {
      await deleteEntry(worldBook.id, entryId);
      
      // 刷新数据
      const updatedWorldBook = getWorldBook(id);
      if (updatedWorldBook) {
        setWorldBook(updatedWorldBook);
      }
    } catch (error) {
      console.error("删除条目失败:", error);
      alert("删除条目失败");
    }
  };
  
  // 关联角色
  const handleLinkCharacter = async (characterId: string) => {
    if (!worldBook) return;
    
    try {
      setIsLinkingCharacter(true);
      await linkToCharacter(worldBook.id, characterId);
      
      // 重新获取最新的世界书数据
      const updatedWorldBook = await getWorldBook(worldBook.id);
      if (updatedWorldBook) {
        setWorldBook(updatedWorldBook);
      }
      
      // 更新关联角色列表
      const characters = await getLinkedCharacters(worldBook.id);
      setLinkedCharacters(characters);
      
      // 更新可用角色列表
      const allCharacters = await characterStorage.listCharacters();
      const linkedIds = characters.map((c: any) => c.id);
      setAvailableCharacters(allCharacters.filter((c: any) => !linkedIds.includes(c.id)));
      
      setIsLinkingCharacter(false);
    } catch (error) {
      console.error("关联角色失败:", error);
      alert("关联角色失败");
      setIsLinkingCharacter(false);
    }
  };
  
  // 解除角色关联
  const handleUnlinkCharacter = async (characterId: string) => {
    if (!worldBook) return;
    
    try {
      setIsLinkingCharacter(true);
      await unlinkFromCharacter(worldBook.id, characterId);
      
      // 重新获取最新的世界书数据
      const updatedWorldBook = await getWorldBook(worldBook.id);
      if (updatedWorldBook) {
        setWorldBook(updatedWorldBook);
      }
      
      // 更新关联角色列表
      const characters = await getLinkedCharacters(worldBook.id);
      setLinkedCharacters(characters);
      
      // 更新可用角色列表
      const allCharacters = await characterStorage.listCharacters();
      const linkedIds = characters.map((c: any) => c.id);
      setAvailableCharacters(allCharacters.filter((c: any) => !linkedIds.includes(c.id)));
      
      setIsLinkingCharacter(false);
    } catch (error) {
      console.error("解除角色关联失败:", error);
      alert("解除角色关联失败");
      setIsLinkingCharacter(false);
    }
  };
  
  // 保存设置
  const handleSaveSettings = async () => {
    if (!worldBook) return;
    
    try {
      await saveWorldBook({
        ...worldBook
      });
      
      alert("设置已保存");
    } catch (error) {
      console.error("保存设置失败:", error);
      alert("保存设置失败");
    }
  };

  // 在WorldBookPage组件中添加新的处理函数
  // 修改handleToggleStrategy函数，接收特定的策略值参数
  const handleToggleStrategy = async (entryId: string, strategy?: 'constant' | 'selective' | 'vectorized') => {
    try {
      if (!worldBook) return;
      
      const entryToUpdate = worldBook.entries.find(e => e.id === entryId);
      if (!entryToUpdate) return;
      
      let newStrategy: 'constant' | 'selective' | 'vectorized';
      
      if (strategy) {
        // 如果提供了特定策略，则直接使用
        newStrategy = strategy;
      } else {
        // 否则按照原来的逻辑循环切换
        if (entryToUpdate.strategy === 'constant') {
          newStrategy = 'selective';
        } else if (entryToUpdate.strategy === 'selective') {
          newStrategy = 'vectorized';
        } else {
          newStrategy = 'constant';
        }
      }
      
      // 更新条目
      const updatedEntry = {
        ...entryToUpdate,
        strategy: newStrategy
      };
      
      // 保存更改
      await updateEntry(id, updatedEntry);
      
      // 更新本地状态以立即反映变化
      setWorldBook({
        ...worldBook,
        entries: worldBook.entries.map(e => 
          e.id === entryId ? {...e, strategy: newStrategy} : e
        )
      });
      
      // 用户反馈
      console.log(`条目 ${entryId} 的激活策略已更新为: ${newStrategy}`);
      
    } catch (error) {
      console.error("切换条目策略失败:", error);
      alert("切换条目策略失败");
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
          <h2 className="text-xl font-bold mb-4">世界书不存在</h2>
          <Button asChild>
            <Link href="/worldbooks">返回世界书列表</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Button variant="ghost" className="mb-2" asChild>
          <Link href="/worldbooks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Link>
        </Button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">世界书详情</h1>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground">管理世界书内容和设置</p>
              <div className="flex items-center gap-2 ml-4">
                <Switch 
                  checked={enabled} 
                  onCheckedChange={handleToggleEnabled}
                  aria-label={enabled ? "禁用世界书" : "启用世界书"}
                />
                <span className="text-sm text-muted-foreground">
                  {enabled ? "已启用" : "已禁用"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/worldbooks/${id}/test`}>
                <Play className="mr-2 h-4 w-4" />
                测试
              </Link>
            </Button>
            <Button onClick={handleSave} disabled={!name}>
              <Save className="mr-2 h-4 w-4" />
              保存
            </Button>
          </div>
        </div>
      </div>

      {/* 标签页部分 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 pb-1">
          <TabsList className="mb-4 w-full sm:w-auto">
            <TabsTrigger value="info" className="flex-1 sm:flex-none">基本信息</TabsTrigger>
            <TabsTrigger value="entries" className="flex-1 sm:flex-none">条目 ({worldBook?.entries.length || 0})</TabsTrigger>
            <TabsTrigger value="characters" className="flex-1 sm:flex-none">关联角色</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 sm:flex-none">设置</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>世界书信息</CardTitle>
              <CardDescription>基本信息设置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">名称</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="世界书名称"
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
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>关联角色</span>
                <span className="text-sm text-blue-500">
                  {linkedCharacters.length > 0 ? `${linkedCharacters.length} 个角色` : ""}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {linkedCharacters.length > 0 ? (
                <div className="space-y-2">
                  {linkedCharacters.map(character => (
                    <div key={character.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {character.avatar && (
                          <div className="h-8 w-8 rounded-full overflow-hidden">
                            <img src={character.avatar} alt={character.name} className="h-full w-full object-cover" />
                          </div>
                        )}
                        <span>{character.name}</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-500 hover:text-red-600" 
                        onClick={() => handleUnlinkCharacter(character.id)}
                        disabled={isLinkingCharacter}
                      >
                        <X className="h-4 w-4" />
                        解除关联
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">此世界书未关联到任何角色</p>
              )}

              {availableCharacters.length > 0 && (
                <>
                  <div className="my-4 border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">可关联角色</h4>
                    <div className="space-y-2">
                      {availableCharacters.map(character => (
                        <div key={character.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            {character.avatar && (
                              <div className="h-8 w-8 rounded-full overflow-hidden">
                                <img src={character.avatar} alt={character.name} className="h-full w-full object-cover" />
                              </div>
                            )}
                            <span>{character.name}</span>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-green-500 hover:text-green-600" 
                            onClick={() => handleLinkCharacter(character.id)}
                            disabled={isLinkingCharacter}
                          >
                            <Check className="h-4 w-4" />
                            关联
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="entries">
          <div className="mb-4">
            <Button onClick={handleAddEntry}>
              <Plus className="mr-2 h-4 w-4" />
              添加条目
            </Button>
          </div>
          
          {worldBook?.entries && worldBook.entries.length > 0 ? (
            <div className="space-y-4">
              {/* 按order排序 */}
              {worldBook.entries
                .slice() // 创建副本以避免修改原数组
                .sort((a, b) => a.order - b.order)
                .map((entry) => (
                <div 
                  key={entry.id} 
                  ref={entry.id === highlightEntryId ? highlightedEntryRef : null}
                  className={`transition-all duration-700 ${entry.id === highlightEntryId ? 'ring-2 ring-primary ring-opacity-70' : ''}`}
                >
                  <EntryCard
                    entry={entry}
                    worldBookId={worldBook.id}
                    onToggleEnabled={() => handleToggleEntryEnabled(entry.id)}
                    onDelete={() => handleDeleteEntry(entry.id)}
                    onToggleStrategy={handleToggleStrategy}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground mb-4">还没有条目</p>
              <Button onClick={handleAddEntry}>添加第一个条目</Button>
            </div>
          )}
        </TabsContent>
        
        {/* 关联角色 */}
        <TabsContent value="characters">
          <Card>
            <CardHeader>
              <CardTitle>关联角色</CardTitle>
              <CardDescription>管理此世界书关联的角色</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">已关联角色</h3>
                {isLoading ? (
                  <p className="text-muted-foreground">加载中...</p>
                ) : linkedCharacters.length === 0 ? (
                  <p className="text-muted-foreground">暂无关联的角色</p>
                ) : (
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {linkedCharacters.map(character => (
                      <div key={character.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex items-center">
                          {character.avatar && (
                            <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                              <Image
                                src={character.avatar}
                                alt={character.name}
                                width={40}
                                height={40}
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{character.name}</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleUnlinkCharacter(character.id)}
                          disabled={isLinkingCharacter}
                        >
                          <X className="h-4 w-4 mr-1" />
                          解除
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium">可关联角色</h3>
                {isLoading ? (
                  <p className="text-muted-foreground">加载中...</p>
                ) : availableCharacters.length === 0 ? (
                  <p className="text-muted-foreground">没有可关联的角色</p>
                ) : (
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {availableCharacters.map(character => (
                      <div key={character.id} className="flex items-center justify-between p-3 border rounded-md">
                        <div className="flex items-center">
                          {character.avatar && (
                            <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                              <Image
                                src={character.avatar}
                                alt={character.name}
                                width={40}
                                height={40}
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{character.name}</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-green-600"
                          onClick={() => handleLinkCharacter(character.id)}
                          disabled={isLinkingCharacter}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          关联
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground mt-4">
                提示: 你也可以在角色编辑页面关联多个世界书
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 全局设置 */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>世界书设置</CardTitle>
              <CardDescription>管理世界书的全局设置</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {worldBook && (
                <form className="space-y-4">
                  <div>
                    <Label htmlFor="scanDepth">扫描深度</Label>
                    <div className="flex items-center gap-4">
                      <Input 
                        id="scanDepth" 
                        type="number" 
                        value={worldBook.settings.scanDepth} 
                        onChange={e => setWorldBook({
                          ...worldBook,
                          settings: {
                            ...worldBook.settings,
                            scanDepth: parseInt(e.target.value)
                          }
                        })}
                        min={1}
                        max={20}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">
                        扫描的最近消息数量
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="maxRecursionSteps">最大递归步骤</Label>
                    <div className="flex items-center gap-4">
                      <Input 
                        id="maxRecursionSteps" 
                        type="number" 
                        value={worldBook.settings.maxRecursionSteps} 
                        onChange={e => setWorldBook({
                          ...worldBook,
                          settings: {
                            ...worldBook.settings,
                            maxRecursionSteps: parseInt(e.target.value)
                          }
                        })}
                        min={0}
                        max={10}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">
                        递归激活的最大步数 (0 表示无递归)
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="minActivations">最小激活数量</Label>
                    <div className="flex items-center gap-4">
                      <Input 
                        id="minActivations" 
                        type="number" 
                        value={worldBook.settings.minActivations} 
                        onChange={e => setWorldBook({
                          ...worldBook,
                          settings: {
                            ...worldBook.settings,
                            minActivations: parseInt(e.target.value)
                          }
                        })}
                        min={0}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">
                        处理的最少条目数量 (0 表示不限制)
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="maxDepth">最大深度</Label>
                    <div className="flex items-center gap-4">
                      <Input 
                        id="maxDepth" 
                        type="number" 
                        value={worldBook.settings.maxDepth} 
                        onChange={e => setWorldBook({
                          ...worldBook,
                          settings: {
                            ...worldBook.settings,
                            maxDepth: parseInt(e.target.value)
                          }
                        })}
                        min={1}
                        max={100}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">
                        最大处理深度 (考虑的条目总数)
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="includeNames"
                      checked={worldBook.settings.includeNames}
                      onCheckedChange={checked => setWorldBook({
                        ...worldBook,
                        settings: {
                          ...worldBook.settings,
                          includeNames: checked
                        }
                      })}
                    />
                    <Label htmlFor="includeNames">包含角色名称</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="caseSensitive"
                      checked={worldBook.settings.caseSensitive}
                      onCheckedChange={checked => setWorldBook({
                        ...worldBook,
                        settings: {
                          ...worldBook.settings,
                          caseSensitive: checked
                        }
                      })}
                    />
                    <Label htmlFor="caseSensitive">默认区分大小写</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="matchWholeWords"
                      checked={worldBook.settings.matchWholeWords}
                      onCheckedChange={checked => setWorldBook({
                        ...worldBook,
                        settings: {
                          ...worldBook.settings,
                          matchWholeWords: checked
                        }
                      })}
                    />
                    <Label htmlFor="matchWholeWords">默认全词匹配</Label>
                  </div>
                  
                  <Button type="button" onClick={handleSaveSettings}>
                    保存设置
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 修改EntryCard组件，将策略指示器改为下拉菜单
function EntryCard({ entry, worldBookId, onToggleEnabled, onDelete, onToggleStrategy }: { 
  entry: WorldBookEntry, 
  worldBookId: string,
  onToggleEnabled: () => void,
  onDelete: () => void,
  onToggleStrategy: (entryId: string, strategy?: 'constant' | 'selective' | 'vectorized') => void
}) {
  const [showStrategyMenu, setShowStrategyMenu] = useState(false);
  
  // 用于关闭菜单的引用
  const menuRef = useRef<HTMLDivElement>(null);
  
  // 添加点击外部关闭菜单的处理
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowStrategyMenu(false);
      }
    };
    
    if (showStrategyMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showStrategyMenu]);
  
  // 修改为直接更新到特定策略的函数
  const handleSetStrategy = async (strategy: 'constant' | 'selective' | 'vectorized') => {
    if (!entry) return;
    
    // 关闭下拉菜单
    setShowStrategyMenu(false);
    
    // 调用父组件传入的onToggleStrategy函数，传递条目ID和指定的策略
    onToggleStrategy(entry.id, strategy);
  };
  
  // 获取策略颜色和名称
  const getStrategyColor = () => {
    switch (entry.strategy) {
      case 'constant': return 'bg-blue-500';
      case 'selective': return 'bg-green-500';
      case 'vectorized': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };
  
  const getStrategyName = () => {
    switch (entry.strategy) {
      case 'constant': return '常量';
      case 'selective': return '选择性';
      case 'vectorized': return '向量化';
      default: return '未知';
    }
  };
  
  console.log("渲染条目卡片，条目ID:", entry.id);
  return (
    <Card className={`${!entry.enabled ? 'opacity-60' : ''}`}>
      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        {/* 标题和状态部分 */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* 策略指示器（可交互下拉菜单） */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowStrategyMenu(!showStrategyMenu)}
              className={`flex-shrink-0 w-6 h-6 rounded-full transition-colors flex items-center justify-center cursor-pointer hover:opacity-80 ${getStrategyColor()}`}
              title="点击切换策略"
              aria-label="点击切换策略"
            >
              <span className="sr-only">切换策略</span>
            </button>
            
            {/* 确保菜单内容完整显示 */}
            {showStrategyMenu && (
              <div className="absolute z-10 left-0 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-border w-48">
                <div className="py-1">
                  <button
                    className={`w-full text-left px-3 py-2 hover:bg-muted flex items-center ${entry.strategy === 'constant' ? 'bg-muted/50' : ''}`}
                    onClick={() => handleSetStrategy('constant')}
                  >
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                    <span>常量（总是激活）</span>
                  </button>
                  <button
                    className={`w-full text-left px-3 py-2 hover:bg-muted flex items-center ${entry.strategy === 'selective' ? 'bg-muted/50' : ''}`}
                    onClick={() => handleSetStrategy('selective')}
                  >
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span>选择性（关键字触发）</span>
                  </button>
                  <button
                    className={`w-full text-left px-3 py-2 hover:bg-muted flex items-center ${entry.strategy === 'vectorized' ? 'bg-muted/50' : ''}`}
                    onClick={() => handleSetStrategy('vectorized')}
                  >
                    <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                    <span>向量化（语义触发）</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* 显示当前策略名称（小屏幕下） */}
          <span className="text-xs text-muted-foreground sm:hidden">{getStrategyName()}</span>
          
          {/* 启用/禁用开关 */}
          <Switch 
            checked={entry.enabled}
            onCheckedChange={onToggleEnabled}
            aria-label={entry.enabled ? '禁用条目' : '启用条目'}
            className="flex-shrink-0"
          />
          
          {/* 条目标题 */}
          <div className="font-medium truncate">{entry.title}</div>
        </div>
        
        {/* 操作按钮部分 */}
        <div className="flex items-center gap-2 sm:ml-auto sm:flex-shrink-0 mt-2 sm:mt-0">
          {/* 插入位置标签 */}
          <div 
            className={`px-2 py-0.5 rounded text-xs flex-shrink-0 ${
              entry.position === 'before' 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
            }`}
          >
            {entry.position === 'before' ? '前置' : '后置'}
          </div>
          
          {/* 排序值 */}
          <div className="text-xs text-muted-foreground flex-shrink-0">
            顺序: {entry.order}
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-auto sm:ml-0">
            <Button 
              variant="outline" 
              size="sm"
              asChild
            >
              <Link href={`/worldbooks/${worldBookId}/entries/${entry.id}`}>
                编辑
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="text-red-500 hover:text-red-600"
              onClick={onDelete}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
} 