"use client";

import { useState, useEffect } from "react";
import { useApiKeyStore } from "@/lib/store";
import { apiKeyStorage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { AlertCircle, Check, Key, Plus, RefreshCw, Trash, ShieldAlert, Upload, Download, Trash2, Power, PowerOff } from "lucide-react";
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
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [isBatchImportDialogOpen, setIsBatchImportDialogOpen] = useState(false);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
  const [duplicateKeyInfo, setDuplicateKeyInfo] = useState<{ name: string; id: string } | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  
  // 批量操作状态
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [batchImportText, setBatchImportText] = useState("");
  const [parsedKeys, setParsedKeys] = useState<string[]>([]);

  // 新API密钥表单状态
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  
  // 本地设置状态
  const [localSettings, setLocalSettings] = useState({
    rotationStrategy: "sequential" as "sequential" | "random" | "least-used",
    switchTiming: "threshold" as "every-call" | "threshold",
    switchThreshold: 50,
    rotationEnabled: false
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
        switchTiming: settings.switchTiming,
        switchThreshold: settings.switchThreshold,
        rotationEnabled: settings.rotationEnabled
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
    
    // 检查密钥是否已存在
    const existingKey = apiKeys.find(key => key.key === newKeyValue.trim());
    if (existingKey) {
      setDuplicateKeyInfo({ name: existingKey.name, id: existingKey.id });
      setIsDuplicateDialogOpen(true);
      return;
    }
    
    // 自动分配优先级（按现有密钥数量递增）
    const nextPriority = apiKeys.length === 0 ? 10 : Math.max(...apiKeys.map(k => k.priority)) + 10;
    
    const newKey: ApiKey = {
      id: "",
      name: newKeyName.trim(),
      key: newKeyValue.trim(),
      enabled: true,
      priority: nextPriority,
      usageCount: 0,
      createdAt: Date.now()
    };
    
    await saveApiKey(newKey);
    
    // 如果这是第一个密钥，自动设置为活动密钥
    if (apiKeys.length === 0 && settings && !settings.activeKeyId) {
      // 重新加载密钥列表以获取新添加的密钥ID
      await loadApiKeys();
      // 获取刚添加的密钥（通过key值查找）
      const allKeys = await apiKeyStorage.listApiKeys();
      const addedKey = allKeys.find(key => key.key === newKeyValue.trim());
      if (addedKey) {
        await updateApiKeySettings({ activeKeyId: addedKey.id });
      }
    }
    
    setIsAddDialogOpen(false);
    setNewKeyName("");
    setNewKeyValue("");
  };
  
  // 处理重复密钥的更新
  const handleUpdateDuplicateKey = async () => {
    if (!duplicateKeyInfo) return;
    
    const keyToUpdate = apiKeys.find(key => key.id === duplicateKeyInfo.id);
    if (keyToUpdate) {
      await saveApiKey({
        ...keyToUpdate,
        name: newKeyName.trim() // 更新名称
      });
    }
    
    setIsDuplicateDialogOpen(false);
    setIsAddDialogOpen(false);
    setNewKeyName("");
    setNewKeyValue("");
    setDuplicateKeyInfo(null);
  };
  
  // 解析批量导入文本
  const parseBatchImportText = (text: string): string[] => {
    if (!text.trim()) return [];
    
    // 先按换行分割，再按逗号分割，最后按空格分割
    const keys = text
      .split(/[\n\r]+/) // 换行分割
      .flatMap(line => line.split(',')) // 逗号分割
      .flatMap(part => part.split(/\s+/)) // 空格分割
      .map(key => key.trim())
      .filter(key => key.length > 0) // 过滤空字符串
      .filter((key, index, arr) => arr.indexOf(key) === index); // 去重
    
    return keys;
  };
  
  // 处理批量导入文本变化
  const handleBatchImportTextChange = (text: string) => {
    setBatchImportText(text);
    setParsedKeys(parseBatchImportText(text));
  };
  
  // 处理批量导入
  const handleBatchImport = async () => {
    if (parsedKeys.length === 0) return;
    
    const existingKeys = new Set(apiKeys.map(key => key.key));
    const newKeys = parsedKeys.filter(key => !existingKeys.has(key));
    
    if (newKeys.length === 0) {
      alert("所有密钥都已存在，没有新密钥需要导入");
      return;
    }
    
    // 获取下一个优先级起始值
    const nextPriority = apiKeys.length === 0 ? 10 : Math.max(...apiKeys.map(k => k.priority)) + 10;
    const isFirstKeys = apiKeys.length === 0; // 记录是否是首次添加密钥
    
    // 批量创建密钥
    for (let i = 0; i < newKeys.length; i++) {
      const key = newKeys[i];
      const newKey: ApiKey = {
        id: "",
        name: `API密钥${apiKeys.length + i + 1}`,
        key: key,
        enabled: true,
        priority: nextPriority + (i * 10),
        usageCount: 0,
        createdAt: Date.now()
      };
      
      await saveApiKey(newKey);
    }
    
    // 如果这是首次添加密钥，自动设置第一个为活动密钥
    if (isFirstKeys && newKeys.length > 0 && settings && !settings.activeKeyId) {
      await loadApiKeys(); // 重新加载以获取新密钥ID
      const allKeys = await apiKeyStorage.listApiKeys();
      const firstAddedKey = allKeys.find(key => key.key === newKeys[0]);
      if (firstAddedKey) {
        await updateApiKeySettings({ activeKeyId: firstAddedKey.id });
      }
    }
    
    setIsBatchImportDialogOpen(false);
    setBatchImportText("");
    setParsedKeys([]);
    alert(`成功导入 ${newKeys.length} 个新密钥${isFirstKeys ? '，已自动设置第一个密钥为活动密钥' : ''}`);
  };
  
  // 处理全选/取消全选
  const handleSelectAll = () => {
    if (selectedKeys.size === apiKeys.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(apiKeys.map(key => key.id)));
    }
  };
  
  // 处理单个密钥选择
  const handleKeySelect = (keyId: string) => {
    const newSelection = new Set(selectedKeys);
    if (newSelection.has(keyId)) {
      newSelection.delete(keyId);
    } else {
      newSelection.add(keyId);
    }
    setSelectedKeys(newSelection);
  };
  
  // 处理批量启用/禁用
  const handleBatchToggleEnabled = async (enabled: boolean) => {
    const selectedKeyIds = Array.from(selectedKeys);
    
    for (const keyId of selectedKeyIds) {
      const key = apiKeys.find(k => k.id === keyId);
      if (key) {
        await saveApiKey({
          ...key,
          enabled: enabled
        });
      }
    }
    
    setSelectedKeys(new Set());
    alert(`已${enabled ? '启用' : '禁用'} ${selectedKeyIds.length} 个密钥`);
  };
  
  // 处理批量删除
  const handleBatchDelete = async () => {
    const selectedKeyIds = Array.from(selectedKeys);
    
    for (const keyId of selectedKeyIds) {
      await deleteApiKey(keyId);
    }
    
    setSelectedKeys(new Set());
    setIsBatchDeleteDialogOpen(false);
    alert(`已删除 ${selectedKeyIds.length} 个密钥`);
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
                <div className="flex items-center space-x-2">
                  <Button variant="outline" onClick={() => setIsBatchImportDialogOpen(true)}>
                    <Upload className="mr-1 h-4 w-4" /> 批量导入
                  </Button>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-1 h-4 w-4" /> 添加密钥
                  </Button>
                </div>
              </CardTitle>
              <CardDescription className="flex items-center justify-between">
                <span>管理可用的API密钥，支持自动查重和智能排序</span>
                {apiKeys.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedKeys.size === apiKeys.length && apiKeys.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm">全选</span>
                    {selectedKeys.size > 0 && (
                      <>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-sm text-primary">已选择 {selectedKeys.size} 项</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleBatchToggleEnabled(true)}
                        >
                          <Power className="mr-1 h-3 w-3" /> 启用
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleBatchToggleEnabled(false)}
                        >
                          <PowerOff className="mr-1 h-3 w-3" /> 禁用
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setIsBatchDeleteDialogOpen(true)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" /> 删除
                        </Button>
                      </>
                    )}
                  </div>
                )}
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
                    .map((key, index) => (
                      <div 
                        key={key.id} 
                        className={`border rounded-md p-4 ${
                          settings?.activeKeyId === key.id ? 'border-primary bg-primary/5' : ''
                        } ${
                          !key.enabled ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={selectedKeys.has(key.id)}
                                onCheckedChange={() => handleKeySelect(key.id)}
                              />
                              <span className="flex items-center justify-center w-6 h-6 bg-muted text-muted-foreground text-xs rounded-full font-medium">
                                {index + 1}
                              </span>
                              <h3 className="font-medium">{key.name}</h3>
                              {settings?.activeKeyId === key.id && (
                                <Badge className="bg-green-500">当前使用中</Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 ml-8">
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
                            <div className="text-xs text-muted-foreground ml-8">
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
            <CardContent className="space-y-6">
              {/* 轮询系统启用开关 */}
              <div className="space-y-3 p-4 border rounded-lg bg-gradient-to-r from-primary/5 to-secondary/5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold">启用API密钥轮询系统</Label>
                    <p className="text-sm text-muted-foreground">
                      启用后，系统将根据下方配置自动选择和切换API密钥
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.rotationEnabled}
                    onCheckedChange={(checked) => 
                      setLocalSettings(prev => ({ ...prev, rotationEnabled: checked }))
                    }
                  />
                </div>
                <div className="text-xs text-muted-foreground border-t pt-2">
                  <strong>优先级说明：</strong>
                  {localSettings.rotationEnabled 
                    ? " 轮询系统已启用，将按下方策略自动选择密钥，忽略手动设置的活动密钥"
                    : " 轮询系统已关闭，将使用手动设置的活动密钥，或第一个可用密钥"
                  }
                </div>
              </div>

              {/* 轮询配置选项 */}
              <div className={`space-y-6 ${!localSettings.rotationEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              
              {/* 切换时机选择 */}
              <div className="space-y-3">
                <Label className="text-base font-medium">切换时机</Label>
                <RadioGroup
                  value={localSettings.switchTiming}
                  onValueChange={(value: string) => 
                    setLocalSettings(prev => ({ 
                      ...prev, 
                      switchTiming: value as "every-call" | "threshold" 
                    }))
                  }
                  className="space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="every-call" id="every-call" />
                      <Label htmlFor="every-call" className="font-medium">每次调用都切换</Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      每次API调用都根据策略重新选择密钥
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="threshold" id="threshold" />
                      <Label htmlFor="threshold" className="font-medium">达到阈值后切换</Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      单个密钥使用达到指定次数后切换到下一个
                    </p>
                  </div>
                </RadioGroup>
              </div>

              {/* 阈值设置 */}
              {localSettings.switchTiming === 'threshold' && (
                <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">切换阈值: {localSettings.switchThreshold} 次</Label>
                  </div>
                  <Slider
                    value={[localSettings.switchThreshold]}
                    min={1}
                    max={200}
                    step={1}
                    onValueChange={(values) => 
                      setLocalSettings(prev => ({ ...prev, switchThreshold: values[0] }))
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1次 (极频繁)</span>
                    <span>50次 (推荐)</span>
                    <span>200次 (高用量)</span>
                  </div>
                </div>
              )}
              
              {/* 切换策略选择 */}
              <div className="space-y-3">
                <Label className="text-base font-medium">切换策略</Label>
                <RadioGroup
                  value={localSettings.rotationStrategy}
                  onValueChange={(value: string) => 
                    setLocalSettings(prev => ({ 
                      ...prev, 
                      rotationStrategy: value as "sequential" | "random" | "least-used" 
                    }))
                  }
                  className="space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sequential" id="sequential" />
                      <Label htmlFor="sequential" className="font-medium">顺序轮换</Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      按优先级顺序依次使用密钥（A→B→C→A）
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="random" id="random" />
                      <Label htmlFor="random" className="font-medium">随机选择</Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      随机选择可用密钥，提供最佳隐私保护
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="least-used" id="least-used" />
                      <Label htmlFor="least-used" className="font-medium">智能均衡</Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      优先选择使用次数最少的密钥，自动负载均衡
                    </p>
                  </div>
                </RadioGroup>
              </div>

              {/* 当前配置预览 */}
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="text-sm font-medium text-primary mb-2">当前配置效果</h4>
                <p className="text-xs text-muted-foreground">
                  {!localSettings.rotationEnabled 
                    ? "轮询系统已关闭，将使用手动设置的活动密钥"
                    : localSettings.switchTiming === 'every-call' 
                    ? `每次API调用都会${
                        localSettings.rotationStrategy === 'sequential' ? '按顺序选择下一个密钥' :
                        localSettings.rotationStrategy === 'random' ? '随机选择一个密钥' :
                        '选择使用次数最少的密钥'
                      }`
                    : `每个密钥使用${localSettings.switchThreshold}次后${
                        localSettings.rotationStrategy === 'sequential' ? '按顺序切换到下一个密钥' :
                        localSettings.rotationStrategy === 'random' ? '随机选择下一个不同的密钥' :
                        '切换到使用次数最少的密钥'
                      }`
                  }
                </p>
              </div>
              
              </div> {/* 结束轮询配置选项的div */}
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
              <p className="text-xs text-muted-foreground">
                系统会自动检查密钥是否已存在，并按添加顺序分配优先级
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
      
      {/* 批量导入API密钥对话框 */}
      <Dialog open={isBatchImportDialogOpen} onOpenChange={setIsBatchImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>批量导入API密钥</DialogTitle>
            <DialogDescription>
              支持使用逗号、换行或空格分隔的API密钥列表
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batch-keys">API密钥列表</Label>
              <Textarea
                id="batch-keys"
                placeholder={`支持多种格式：\n\nAPI1,API2,API3\n\nAPI1\nAPI2\nAPI3\n\nAPI1 API2 API3`}
                rows={8}
                value={batchImportText}
                onChange={(e) => handleBatchImportTextChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                系统会自动去重并检查是否与现有密钥重复
              </p>
            </div>
            
            {parsedKeys.length > 0 && (
              <div className="space-y-2">
                <Label>解析结果 ({parsedKeys.length} 个密钥)</Label>
                <div className="max-h-40 overflow-y-auto border rounded-md p-3 bg-muted/50">
                  <div className="space-y-1">
                    {parsedKeys.map((key, index) => {
                      const isExisting = apiKeys.some(existing => existing.key === key);
                      return (
                        <div 
                          key={index} 
                          className={`text-sm flex items-center justify-between ${
                            isExisting ? 'text-muted-foreground line-through' : 'text-foreground'
                          }`}
                        >
                          <span className="font-mono">{key.substring(0, 20)}...</span>
                          {isExisting ? (
                            <Badge variant="secondary">已存在</Badge>
                          ) : (
                            <Badge variant="default">新密钥</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  将导入 {parsedKeys.filter(key => !apiKeys.some(existing => existing.key === key)).length} 个新密钥，
                  跳过 {parsedKeys.filter(key => apiKeys.some(existing => existing.key === key)).length} 个重复密钥
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchImportDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleBatchImport}
              disabled={parsedKeys.length === 0 || parsedKeys.every(key => apiKeys.some(existing => existing.key === key))}
            >
              导入 {parsedKeys.filter(key => !apiKeys.some(existing => existing.key === key)).length} 个密钥
            </Button>
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
      
      {/* 重复密钥提示对话框 */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>密钥已存在</DialogTitle>
            <DialogDescription>
              该API密钥已存在于您的列表中，当前名称为 "<strong>{duplicateKeyInfo?.name}</strong>"。
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-3">
              您可以选择以下操作：
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>更新现有密钥的名称为 "<strong>{newKeyName}</strong>"</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                <span>取消添加，保持现有密钥不变</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDuplicateDialogOpen(false);
                setDuplicateKeyInfo(null);
              }}
            >
              取消
            </Button>
            <Button onClick={handleUpdateDuplicateKey}>
              更新现有密钥名称
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 批量删除确认对话框 */}
      <Dialog open={isBatchDeleteDialogOpen} onOpenChange={setIsBatchDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认批量删除</DialogTitle>
            <DialogDescription>
              确定要删除选中的 {selectedKeys.size} 个API密钥吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-3">
              即将删除的密钥：
            </p>
            <div className="max-h-40 overflow-y-auto border rounded-md p-3 bg-muted/50">
              <div className="space-y-2">
                {Array.from(selectedKeys).map(keyId => {
                  const key = apiKeys.find(k => k.id === keyId);
                  return key ? (
                    <div key={keyId} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{key.name}</span>
                      <span className="font-mono text-muted-foreground">
                        {key.key.substring(0, 8)}...
                      </span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleBatchDelete}>
              确认删除 {selectedKeys.size} 个密钥
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 