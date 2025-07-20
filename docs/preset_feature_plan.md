# 预设功能开发计划

## 功能概述

预设功能允许用户管理和应用一组系统提示词和模型参数，用于控制AI生成的回复内容和风格。预设可以从外部JSON文件导入，也可以在应用内创建和编辑。

## 数据模型

### 基本数据结构

```typescript
// 预设提示词条目
export interface PresetPrompt {
  identifier: string;    // 唯一标识符
  name: string;          // 名称
  content: string;       // 内容
  enabled: boolean;      // 是否启用
  isPlaceholder?: boolean;  // 是否为动态占位条目
  placeholderType?: string;  // 占位类型
  implemented?: boolean;     // 占位类型是否已实现
}

// 预设
export interface Preset {
  id: string;           // 唯一ID
  name: string;         // 预设名称
  description: string;  // 预设描述
  // Gemini模型参数
  temperature?: number;
  maxTokens?: number;
  topK?: number;
  topP?: number;
  // 提示词数组
  prompts: PresetPrompt[];
}

// 占位条目类型信息
interface PlaceholderInfo {
  type: string;
  implemented: boolean;
  description: string;
}
```

### 占位条目类型

```typescript
const PLACEHOLDERS: Record<string, PlaceholderInfo> = {
  'charDescription': {
    type: 'charDescription',
    implemented: true,
    description: '角色描述'
  },
  'chatHistory': {
    type: 'chatHistory',
    implemented: true,
    description: '对话历史'
  },
  'worldInfoBefore': {
    type: 'worldInfo',
    implemented: false,
    description: '世界书信息'
  },
  'worldInfoAfter': {
    type: 'worldInfo',
    implemented: false,
    description: '世界书信息'
  },
  'personaDescription': {
    type: 'persona',
    implemented: false,
    description: '玩家角色信息'
  },
  // 其他占位类型...
};
```

## 开发阶段

### 第一阶段（优先实现）

1. 基础预设管理功能：
   - 预设列表页面
   - 预设创建/编辑功能
   - 预设导入/导出功能
   - 预设应用功能（更新系统提示词和模型参数）

2. 支持已实现功能的动态占位条目：
   - 角色描述（charDescription）
   - 聊天历史（chatHistory）

3. 与现有系统集成：
   - 在聊天设置中添加预设选择下拉框
   - 实现预设应用后的系统提示词和模型参数更新

### 第二阶段（后续实现）

1. 支持更多动态占位条目：
   - 世界书信息（worldInfoBefore/After）
   - 玩家角色信息（personaDescription）
   - 其他占位条目类型

2. 高级功能：
   - 预设组织与分类
   - 预设分享功能
   - 预设预览功能

## 实现细节

### 存储设计

使用IndexedDB存储预设数据，并通过zustand持久化状态管理：

```typescript
// 预设存储
export const presetStorage = {
  async savePreset(preset: Preset): Promise<void> {
    const db = await openDB();
    await db.put('presets', preset);
  },
  
  async getPreset(id: string): Promise<Preset | undefined> {
    const db = await openDB();
    return db.get('presets', id);
  },
  
  async listPresets(): Promise<Preset[]> {
    const db = await openDB();
    return db.getAll('presets');
  },
  
  async deletePreset(id: string): Promise<void> {
    const db = await openDB();
    await db.delete('presets', id);
  },
  
  // 导入预设JSON文件
  async importPresetFromJSON(json: any): Promise<Preset> {
    // 处理导入逻辑...
  }
};
```

### 预设导入处理

从外部JSON文件导入预设时，需要处理不同格式的预设文件：

```typescript
function extractAndProcessPrompts(json: any): PresetPrompt[] {
  const prompts: PresetPrompt[] = [];
  
  // 如果有prompt_order数组，按照其顺序处理
  if (json.prompt_order && Array.isArray(json.prompt_order)) {
    // 找到characterId为100001的部分
    const characterOrder = json.prompt_order.find(
      (po: any) => po.character_id === 100001
    );
    
    if (characterOrder?.order && Array.isArray(characterOrder.order)) {
      // 遍历order数组
      characterOrder.order.forEach((orderItem: any) => {
        // 在prompts数组中查找对应的提示词
        if (json.prompts && Array.isArray(json.prompts)) {
          const matchingPrompt = json.prompts.find(
            (p: any) => p.identifier === orderItem.identifier
          );
          
          if (matchingPrompt) {
            const promptItem: PresetPrompt = {
              identifier: orderItem.identifier,
              name: matchingPrompt.name || "未命名提示词",
              content: matchingPrompt.content || "",
              enabled: orderItem.enabled || false
            };
            
            // 检查是否为占位条目
            if (matchingPrompt.marker === true) {
              promptItem.isPlaceholder = true;
              promptItem.placeholderType = orderItem.identifier;
              
              // 检查是否已实现
              const placeholderInfo = PLACEHOLDERS[orderItem.identifier];
              if (placeholderInfo) {
                promptItem.implemented = placeholderInfo.implemented;
              } else {
                promptItem.implemented = false;
              }
            }
            
            prompts.push(promptItem);
          }
        }
      });
    }
  }
  
  return prompts;
}

function extractModelParameters(json: any) {
  return {
    temperature: json.temperature !== undefined ? Number(json.temperature) : undefined,
    maxTokens: json.openai_max_tokens !== undefined ? Number(json.openai_max_tokens) : undefined,
    topK: json.top_k !== undefined ? Number(json.top_k) : undefined,
    topP: json.top_p !== undefined ? Number(json.top_p) : undefined,
  };
}
```

### 应用预设逻辑

应用预设时，需要处理静态提示词和动态占位条目，并更新相关设置：

```typescript
// 应用预设 - 更新系统提示词和模型参数
applyPreset: async (id) => {
  const preset = await presetStorage.getPreset(id);
  if (!preset) return;
  
  // 构建系统提示词
  let systemPromptParts = [];
  
  for (const promptItem of preset.prompts) {
    if (!promptItem.enabled) continue;
    
    if (promptItem.isPlaceholder) {
      const placeholderInfo = PLACEHOLDERS[promptItem.placeholderType];
      
      // 只处理已实现的占位类型
      if (placeholderInfo && placeholderInfo.implemented) {
        const dynamicContent = await getDynamicContent(promptItem.placeholderType);
        if (dynamicContent) {
          systemPromptParts.push(dynamicContent);
        }
      }
    } else {
      // 普通静态内容
      systemPromptParts.push(promptItem.content);
    }
  }
  
  const systemPrompt = systemPromptParts.join('\n\n');
  
  // 更新聊天状态中的系统提示词
  const chatStore = useChatStore.getState();
  chatStore.setSystemPrompt(systemPrompt);
  
  // 更新模型参数
  const settingsStore = useSettingsStore.getState();
  settingsStore.updateSettings({
    temperature: preset.temperature ?? 0.7,
    maxTokens: preset.maxTokens ?? 1024,
    topK: preset.topK ?? 40,
    topP: preset.topP ?? 0.95,
  });
  
  // 设置当前预设
  set({ currentPresetId: id });
}

// 获取动态内容的辅助函数
async function getDynamicContent(placeholderType: string): Promise<string | null> {
  const chatStore = useChatStore.getState();
  
  switch (placeholderType) {
    case 'chatHistory':
      // 格式化对话历史
      return formatChatHistory(chatStore.currentMessages);
      
    case 'charDescription':
      // 获取角色描述
      return chatStore.currentCharacter?.description || null;
      
    // 其他类型...
      
    default:
      return null;
  }
}
```

## UI 组件

### 预设列表页面

```tsx
// app/presets/page.tsx
export default function PresetsPage() {
  const { presets, loadPresets, deletePreset, exportPresetToFile } = usePresetStore();
  
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">预设管理</h1>
        <Button asChild>
          <Link href="/presets/new">创建预设</Link>
        </Button>
      </div>
      
      <div className="grid gap-4">
        {presets.map((preset) => (
          <div key={preset.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">{preset.name}</h2>
                <p className="text-muted-foreground">{preset.description}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/presets/edit/${preset.id}`}>编辑</Link>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportPresetToFile(preset.id)}
                >
                  导出
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => deletePreset(preset.id)}
                >
                  删除
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 预设编辑页面

创建和编辑预设的表单组件，支持添加、删除、排序提示词条目，以及设置模型参数。

### 聊天设置集成

在聊天设置组件中添加预设选择功能，使用户可以快速切换预设。

```tsx
// components/chat/chat-settings.tsx
import { usePresetStore } from "@/lib/store";

export function ChatSettings() {
  const { settings, uiSettings, updateSettings, updateUISettings } = useSettingsStore();
  const { presets, currentPresetId, applyPreset, loadPresets } = usePresetStore();
  
  // 组件挂载时加载预设
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);
  
  // 处理预设切换
  const handlePresetChange = async (presetId: string) => {
    await applyPreset(presetId);
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        {/* 现有设置内容 */}
        
        {/* 添加预设选择 */}
        <div className="space-y-2 mt-4">
          <label className="text-sm font-medium">预设</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={currentPresetId || ''}
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            <option value="">-- 选择预设 --</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
          <div className="flex justify-end mt-2">
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link href="/presets">管理预设</Link>
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

## 与现有系统集成

1. **系统提示词集成**：预设应用时，将生成的系统提示词通过 `chatStore.setSystemPrompt(systemPrompt)` 设置到聊天系统中。

2. **模型参数集成**：预设应用时，更新设置存储中的模型参数：`settingsStore.updateSettings({...})`。

3. **占位条目处理**：对于已实现的功能（如角色描述、聊天历史），提取当前数据填充；对于未实现功能的占位条目，在UI中标记为"即将支持"，并在应用时暂时忽略。

## 下一步计划

1. 完成基础预设管理界面
2. 实现预设导入/导出功能
3. 在聊天设置中集成预设选择功能
4. 处理角色描述和聊天历史的动态占位条目
5. 随着世界书和玩家角色功能的开发，逐步支持更多占位条目类型 