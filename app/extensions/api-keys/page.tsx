"use client";

import { useState, useEffect } from "react";
import { useApiKeyStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { AlertCircle, Check, Key, Plus, RefreshCw, Trash, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ApiKey } from "@/lib/types";

export default function ApiKeysPage() {
  const { 
    apiKeys, 
    settings, 
    isLoading, 
    error,
    loadApiKeys,
    saveApiKey,
    deleteApiKey,
    setActiveApiKey,
    updateApiKeySettings
  } = useApiKeyStore();
  
  // 组件状态
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // 新API密钥表单状态
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [newKeyPriority, setNewKeyPriority] = useState(10);
  
  // 本地设置状态
  const [localSettings, setLocalSettings] = useState({
    rotationStrategy: "sequential" as "sequential" | "random" | "least-used",
    autoSwitch: true,
    switchThreshold: 100
  });
  
  // 加载API密钥
  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);
  
  // 同步远程设置到本地
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        rotationStrategy: settings.rotationStrategy,
        autoSwitch: settings.autoSwitch,
        switchThreshold: settings.switchThreshold
      });
    }
  }, [settings]);
  
  // 处理保存设置
  const handleSaveSettings = async () => {
    await updateApiKeySettings(localSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };
  
  // 处理添加API密钥
  const handleAddKey = async () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      return;
    }
    
    const newKey: ApiKey = {
      id: "",
      name: newKeyName.trim(),
      key: newKeyValue.trim(),
      enabled: true,
      priority: newKeyPriority,
      usageCount: 0,
      createdAt: Date.now()
    };
    
    await saveApiKey(newKey);
    setIsAddDialogOpen(false);
    setNewKeyName("");
    setNewKeyValue("");
    setNewKeyPriority(10);
  };
  
  // 处理删除API密钥
  const handleDeleteKey = async () => {
    if (keyToDelete) {
      await deleteApiKey(keyToDelete);
      setIsDeleteDialogOpen(false);
      setKeyToDelete(null);
    }
  };
  
  // 处理切换API密钥启用状态
  const handleToggleKeyEnabled = async (key: ApiKey) => {
    await saveApiKey({
      ...key,
      enabled: !key.enabled
    });
  };
  
  // 处理设置活动API密钥
  const handleSetActiveKey = async (id: string) => {
    await setActiveApiKey(id);
  };
  
  // 获取密钥掩码显示
  const getMaskedKey = (key: string) => {
    if (!key) return "•••••••••••••••";
    return key.substring(0, 4) + "••••••••••••••••" + key.substring(key.length - 4);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">API密钥管理</h1>
        <p className="text-muted-foreground">管理和轮询使用多个API密钥</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="col-span-1 md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>API密钥列表</span>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" /> 添加密钥
                </Button>
              </CardTitle>
              <CardDescription>
                管理可用的API密钥并设置使用顺序
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="animate-spin h-6 w-6 mr-2" />
                  <span>加载中...</span>
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-md">
                  <Key className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <h3 className="font-medium mb-1">还没有API密钥</h3>
                  <p className="text-muted-foreground mb-4">
                    添加至少一个API密钥以使用该功能
                  </p>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-1 h-4 w-4" /> 添加API密钥
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys
                    .sort((a, b) => a.priority - b.priority)
                    .map((key) => (
                      <div 
                        key={key.id} 
                        className={`border rounded-md p-4 ${
                          settings?.activeKeyId === key.id ? 'border-primary bg-primary/5' : ''
                        } ${
                          !key.enabled ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">{key.name}</h3>
                              {settings?.activeKeyId === key.id && (
                                <Badge className="bg-green-500">当前使用中</Badge>
                              )}
                              <Badge variant="outline">{`优先级: ${key.priority}`}</Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                              <p className="font-mono text-sm">{getMaskedKey(key.key)}</p>
                              <button 
                                className="text-primary hover:text-primary/80 text-xs underline"
                                onClick={() => {
                                  navigator.clipboard.writeText(key.key);
                                  alert("API密钥已复制到剪贴板");
                                }}
                              >
                                复制
                              </button>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              使用次数: {key.usageCount || 0} 次
                              {key.lastUsed && (
                                <span> · 最后使用: {new Date(key.lastUsed).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={key.enabled ? "text-green-500" : "text-muted-foreground"}
                                    onClick={() => handleToggleKeyEnabled(key)}
                                  >
                                    {key.enabled ? (
                                      <Check className="h-4 w-4" />
                                    ) : (
                                      <AlertCircle className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {key.enabled ? "禁用" : "启用"}
                                </TooltipContent>
                              </Tooltip>
                              
                              {settings?.activeKeyId !== key.id && key.enabled && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-primary"
                                      onClick={() => handleSetActiveKey(key.id)}
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    设为当前密钥
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive"
                                    onClick={() => {
                                      setKeyToDelete(key.id);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  删除
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>轮询设置</CardTitle>
              <CardDescription>
                配置API密钥轮询策略
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>轮询策略</Label>
                <RadioGroup
                  value={localSettings.rotationStrategy}
                  onValueChange={(value: string) => 
                    setLocalSettings(prev => ({ 
                      ...prev, 
                      rotationStrategy: value as "sequential" | "random" | "least-used" 
                    }))
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sequential" id="sequential" />
                    <Label htmlFor="sequential">顺序轮询</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="random" id="random" />
                    <Label htmlFor="random">随机选择</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="least-used" id="least-used" />
                    <Label htmlFor="least-used">优先使用次数最少</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-switch">自动切换</Label>
                  <Switch
                    id="auto-switch"
                    checked={localSettings.autoSwitch}
                    onCheckedChange={(checked) => 
                      setLocalSettings(prev => ({ ...prev, autoSwitch: checked }))
                    }
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  在使用次数达到阈值时自动切换到下一个密钥
                </p>
              </div>
              
              {localSettings.autoSwitch && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>切换阈值: {localSettings.switchThreshold}</Label>
                  </div>
                  <Slider
                    value={[localSettings.switchThreshold]}
                    min={10}
                    max={1000}
                    step={10}
                    onValueChange={(values) => 
                      setLocalSettings(prev => ({ ...prev, switchThreshold: values[0] }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    当单个密钥使用次数达到此阈值时切换到下一个密钥
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleSaveSettings}>
                {isSaved ? (
                  <>
                    <Check className="mr-1 h-4 w-4" /> 已保存
                  </>
                ) : (
                  "保存设置"
                )}
              </Button>
            </CardFooter>
          </Card>
          
          <div className="mt-4">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-base flex items-center">
                  <ShieldAlert className="h-4 w-4 mr-2 text-amber-500" />
                  安全提示
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  所有API密钥仅存储在您的浏览器中，不会上传到任何服务器。请确保保管好您的API密钥。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* 添加API密钥对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加API密钥</DialogTitle>
            <DialogDescription>
              添加一个新的API密钥到轮询列表
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">名称</Label>
              <Input
                id="key-name"
                placeholder="例如: 主要密钥"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="key-value">API密钥</Label>
              <Input
                id="key-value"
                type="password"
                placeholder="输入您的API密钥"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="key-priority">优先级: {newKeyPriority}</Label>
              </div>
              <Slider
                id="key-priority"
                value={[newKeyPriority]}
                min={1}
                max={100}
                step={1}
                onValueChange={(values) => setNewKeyPriority(values[0])}
              />
              <p className="text-xs text-muted-foreground">
                优先级数字越小，优先级越高。在顺序轮询模式下决定使用顺序。
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddKey}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 删除API密钥确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这个API密钥吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteKey}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 