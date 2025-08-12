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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { usePromptPresetStore } from "@/lib/store";
import { ArrowLeft, Edit, Trash2, Plus, GripVertical, Info, List, LayoutGrid, MoreHorizontal, Settings } from "lucide-react";
import { PromptPresetItem } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useResponsiveView } from "@/lib/useResponsiveView";
import { ViewToggle } from "@/components/ui/view-toggle";
import { PresetRegexManager } from "@/components/extensions/preset-regex-manager";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// 可排序的提示词项组件（完整视图）
interface SortablePromptItemProps {
  prompt: PromptPresetItem;
  index: number;
  togglePromptEnabled: (index: number) => void;
  startEditPrompt: (index: number) => void;
  deletePrompt: (index: number) => void;
}

function SortablePromptItem({ prompt, index, togglePromptEnabled, startEditPrompt, deletePrompt }: SortablePromptItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: prompt.identifier,
    transition: {
      duration: 150,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center p-4 hover:bg-muted/30 transition-colors border-b last:border-b-0 select-none",
        !prompt.enabled && "opacity-60",
        isDragging && "bg-accent shadow-lg rounded-md opacity-90"
      )}
    >
      {/* 拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-9 h-9 mr-3 flex-shrink-0 text-muted-foreground hover:text-foreground active:text-primary rounded-full hover:bg-muted/50 active:bg-muted cursor-grab active:cursor-grabbing touch-manipulation"
        data-drag-handle
      >
        <GripVertical className="h-5 w-5" />
      </div>
      
      {/* 提示词内容 */}
      <div className="flex-grow mr-4 select-none">
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
      
      {/* 控制按钮组 */}
      <div className="flex items-center gap-2 shrink-0">
        {/* 编辑按钮 */}
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
        
        {/* 删除按钮 */}
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
        
        {/* 启用开关 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <Switch
                  checked={prompt.enabled}
                  onCheckedChange={() => togglePromptEnabled(index)}
                  className="data-[state=unchecked]:bg-muted"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {prompt.enabled ? "禁用" : "启用"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

// 可排序的简化提示词项（移动端视图）
interface SimplifiedPromptItemProps {
  prompt: PromptPresetItem;
  index: number;
  togglePromptEnabled: (index: number) => void;
  startEditPrompt: (index: number) => void;
  deletePrompt: (index: number) => void;
}

function SimplifiedPromptItem({ prompt, index, togglePromptEnabled, startEditPrompt, deletePrompt }: SimplifiedPromptItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // 关闭菜单的点击外部处理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: prompt.identifier,
    // 禁用自动滚动，在移动端体验更好
    transition: {
      duration: 150,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center py-2 px-2 hover:bg-muted/30 transition-colors border-b last:border-b-0 min-w-max select-none touch-manipulation",
        !prompt.enabled && "opacity-60",
        isDragging && "bg-accent shadow-lg rounded-md opacity-90"
      )}
    >
      {/* 拖拽手柄 - 固定宽度，增强移动端拖拽体验 */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-10 h-10 mr-1 flex-shrink-0 text-muted-foreground hover:text-foreground active:text-primary rounded-full hover:bg-muted/50 active:bg-muted cursor-grab active:cursor-grabbing touch-manipulation"
        data-drag-handle
      >
        <GripVertical className="h-5 w-5" />
      </div>
      
      {/* 提示词名称 - 可伸缩并截断，禁止文本选择 */}
      <div 
        className="w-0 flex-1 min-w-0 overflow-hidden py-1 mr-1 select-none" 
        onClick={() => startEditPrompt(index)}
      >
        <div className="font-medium flex items-center flex-wrap">
          <span className="truncate max-w-full block">{prompt.name}</span>
          {prompt.isPlaceholder && (
            <Badge variant="outline" className="mt-0.5 bg-primary/10 text-xs flex-shrink-0">
              {prompt.placeholderType}
              {!prompt.implemented && " ⚠️"}
            </Badge>
          )}
        </div>
      </div>
      
      {/* 功能按钮组 - 不可收缩 */}
      <div className="flex items-center gap-1 flex-shrink-0" style={{ width: "85px" }}>
        <Switch
          checked={prompt.enabled}
          onCheckedChange={() => togglePromptEnabled(index)}
          className="data-[state=unchecked]:bg-muted flex-shrink-0"
          aria-label={prompt.enabled ? "禁用" : "启用"}
        />
        
        {/* 更多操作按钮 - 下拉菜单 */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 rounded-full flex-shrink-0 p-0"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          
          {showMenu && (
            <div className="absolute right-0 z-10 mt-1 w-36 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                <button 
                  className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted/50 text-foreground"
                  onClick={() => {
                    startEditPrompt(index);
                    setShowMenu(false);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  编辑
                </button>
                <button 
                  className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted/50 text-destructive"
                  onClick={() => {
                    deletePrompt(index);
                    setShowMenu(false);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 移动端拖拽优化的全局样式
const GlobalDragStyles = () => {
  return (
    <style jsx global>{`
      /* 防止长按文本选择 */
      * {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }
      
      /* 输入框和文本域允许选择文本 */
      input, textarea {
        -webkit-user-select: text;
        user-select: text;
      }
      
      /* 增强移动端拖拽手感 */
      [data-drag-handle] {
        touch-action: none;
      }
      
      /* 提高拖拽时的视觉层级 */
      .sortable-item-dragging {
        z-index: 999 !important;
      }
    `}</style>
  );
};

interface EditPresetPageProps {
  params: {
    id: string;
  };
}

export default function EditPresetPage({ params }: EditPresetPageProps) {
  const router = useRouter();
  const { id } = params;
  
  const { presets, getPreset, savePreset, loadPresets } = usePromptPresetStore();
  
  // 添加视图模式状态，使用useResponsiveView钩子
  const [viewMode, setViewMode] = useResponsiveView('preset-prompts-view-mode');
  
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
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  // 修改拖拽传感器设置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // 优化指针传感器，减少长按触发选择的可能
      activationConstraint: {
        // 设置延迟确保用户是有意拖动而非滚动
        delay: 100,
        // 容忍一定的移动距离，避免轻微触摸被误认为拖拽
        tolerance: 5,
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
  
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
    const newPrompt: PromptPresetItem = {
      identifier: `prompt_${Date.now()}`,
      name: `提示词 ${prompts.length + 1}`,
      content: "",
      enabled: true,
      isPlaceholder: false,
      
      // 🆕 SillyTavern V3 深度注入参数（默认值）
      injection_depth: 0,          // 注入深度：0=最前面
      injection_order: 100,        // 注入优先级：数值越小优先级越高
      injection_position: 0,       // 注入位置：0=relative, 1=before, 2=after
      role: 'system',              // 消息角色：system/user/assistant
      forbid_overrides: false,     // 禁止覆盖：false=允许覆盖
      marker: false,               // 占位标记：false=静态内容
      system_prompt: true          // 系统提示词：true=作为系统消息
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
  
  // 处理拖拽结束事件
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setPrompts((items) => {
        // 查找原始索引和目标索引
        const oldIndex = items.findIndex(item => item.identifier === active.id);
        const newIndex = items.findIndex(item => item.identifier === over.id);
        
        // 返回重新排序的数组
        return arrayMove(items, oldIndex, newIndex);
      });
    }
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
      {/* 添加全局拖拽优化样式 */}
      <GlobalDragStyles />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/presets">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">编辑预设</h1>
          {id === 'default' && (
            <Badge variant="secondary" className="ml-3">
              默认预设
            </Badge>
          )}
        </div>
        
        <Button onClick={handleSave}>保存预设</Button>
      </div>
      
      {/* 默认预设提示 */}
      {id === 'default' && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            ℹ️ 关于默认预设
          </h4>
          <p className="text-xs text-blue-800 dark:text-blue-200">
            默认预设是系统的基础预设，适用于一般对话场景。你可以修改其内容来自定义默认行为，但不能删除此预设。
          </p>
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="prompts">提示词管理</TabsTrigger>
          <TabsTrigger value="regex">正则关联</TabsTrigger>
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
            <div className="flex space-x-2 items-center">
              {/* 视图切换组件 */}
              <div className="mr-2">
                <ViewToggle viewMode={viewMode} onChange={setViewMode} />
              </div>
              <Button onClick={addPrompt}>
                <Plus className="h-4 w-4 mr-1" />
                添加提示词
              </Button>
            </div>
          </div>
          
          <Card>
            {prompts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                没有提示词条目。点击"添加提示词"按钮创建一个。
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto overflow-x-visible">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  onDragStart={() => {
                    // 触发触觉反馈（如果浏览器支持）
                    if ('navigator' in window && 'vibrate' in navigator) {
                      navigator.vibrate(50);
                    }
                  }}
                  modifiers={[
                    // 将拖拽项限制在垂直方向上移动
                    restrictToVerticalAxis,
                  ]}
                >
                  <SortableContext
                    items={prompts.map(p => p.identifier)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="divide-y">
                      {prompts.map((prompt, index) => (
                        viewMode === 'list' ? (
                          <SimplifiedPromptItem
                            key={prompt.identifier}
                            prompt={prompt}
                            index={index}
                            togglePromptEnabled={togglePromptEnabled}
                            startEditPrompt={startEditPrompt}
                            deletePrompt={deletePrompt}
                          />
                        ) : (
                          <SortablePromptItem
                            key={prompt.identifier}
                            prompt={prompt}
                            index={index}
                            togglePromptEnabled={togglePromptEnabled}
                            startEditPrompt={startEditPrompt}
                            deletePrompt={deletePrompt}
                          />
                        )
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="regex" className="space-y-4">
          <PresetRegexManager presetId={id} onUpdate={() => loadPresets()} />
        </TabsContent>
      </Tabs>
      
      {/* 提示词编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={(open) => !open && setShowDialog(false)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editPromptIndex !== null && editPromptIndex < prompts.length && prompts[editPromptIndex].isPlaceholder
                ? "编辑占位条目"
                : "编辑提示词"}
            </DialogTitle>
            <DialogDescription>
              {editPromptIndex !== null && editPromptIndex < prompts.length && prompts[editPromptIndex].isPlaceholder
                ? "编辑一个动态占位条目，它将在运行时被实际内容替换。"
                : "编辑一个提示词条目，它将用于生成AI回复。"}
            </DialogDescription>
          </DialogHeader>
          
          {editPrompt && (
            <div className="space-y-4 py-4">
              {/* 基础设置 */}
              <div className="space-y-4">
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

              {/* 高级设置 - SillyTavern V3 深度注入参数 */}
              <div className="border-t pt-4">
                <div 
                  className="flex items-center gap-2 cursor-pointer" 
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                >
                  <Settings className="h-4 w-4" />
                  <Label className="cursor-pointer">高级设置 (SillyTavern深度注入)</Label>
                  <Badge variant="outline" className="text-xs">
                    {showAdvancedSettings ? '收起' : '展开'}
                  </Badge>
                </div>
                
                {showAdvancedSettings && (
                  <div className="mt-4 space-y-4 bg-muted/20 p-4 rounded-md">
                    <p className="text-sm text-muted-foreground mb-4">
                      这些参数控制提示词在消息中的注入方式，主要供预设作者使用。普通用户通常不需要修改这些设置。
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 注入深度 */}
                      <div className="space-y-2">
                        <Label htmlFor="injection-depth">
                          注入深度
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 ml-1 inline" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>控制提示词在消息历史中的注入位置。<br/>0=最前面，数值越大越靠后</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Input
                          id="injection-depth"
                          type="number"
                          min="0"
                          max="100"
                          value={editPrompt.injection_depth ?? 0}
                          onChange={(e) => setEditPrompt({
                            ...editPrompt, 
                            injection_depth: parseInt(e.target.value) || 0
                          })}
                        />
                      </div>

                      {/* 注入优先级 */}
                      <div className="space-y-2">
                        <Label htmlFor="injection-order">
                          注入优先级
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 ml-1 inline" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>同一深度内的排序优先级。<br/>数值越小优先级越高</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Input
                          id="injection-order"
                          type="number"
                          min="0"
                          max="1000"
                          value={editPrompt.injection_order ?? 100}
                          onChange={(e) => setEditPrompt({
                            ...editPrompt, 
                            injection_order: parseInt(e.target.value) || 100
                          })}
                        />
                      </div>

                      {/* 消息角色 */}
                      <div className="space-y-2">
                        <Label>
                          消息角色
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 ml-1 inline" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>指定这条提示词作为什么角色的消息</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Select
                          value={editPrompt.role || 'system'}
                          onValueChange={(value) => setEditPrompt({
                            ...editPrompt, 
                            role: value as 'system' | 'user' | 'assistant'
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="system">System (系统)</SelectItem>
                            <SelectItem value="user">User (用户)</SelectItem>
                            <SelectItem value="assistant">Assistant (助手)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 注入位置 */}
                      <div className="space-y-2">
                        <Label>
                          注入位置
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 ml-1 inline" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>相对于其他消息的注入位置</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <Select
                          value={(editPrompt.injection_position ?? 0).toString()}
                          onValueChange={(value) => setEditPrompt({
                            ...editPrompt, 
                            injection_position: parseInt(value)
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Relative (相对)</SelectItem>
                            <SelectItem value="1">Before (之前)</SelectItem>
                            <SelectItem value="2">After (之后)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* 高级选项 */}
                    <div className="space-y-3 border-t pt-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="forbid-overrides"
                          checked={editPrompt.forbid_overrides ?? false}
                          onCheckedChange={(checked) => setEditPrompt({
                            ...editPrompt, 
                            forbid_overrides: checked
                          })}
                        />
                        <Label htmlFor="forbid-overrides">
                          禁止覆盖
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 ml-1 inline" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>防止其他提示词覆盖这个条目</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="system-prompt"
                          checked={editPrompt.system_prompt ?? true}
                          onCheckedChange={(checked) => setEditPrompt({
                            ...editPrompt, 
                            system_prompt: checked
                          })}
                        />
                        <Label htmlFor="system-prompt">
                          作为系统提示词
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 ml-1 inline" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>将此条目作为系统级提示词处理</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                      </div>

                      {editPrompt.isPlaceholder && (
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="marker"
                            checked={editPrompt.marker ?? false}
                            onCheckedChange={(checked) => setEditPrompt({
                              ...editPrompt, 
                              marker: checked
                            })}
                          />
                          <Label htmlFor="marker">
                            占位标记
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 ml-1 inline" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>标记为动态占位符（自动从占位符状态推断）</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
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