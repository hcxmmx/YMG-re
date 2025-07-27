# 正则表达式管理系统规划文档

## 背景与目标

正则表达式功能是本系统的重要组成部分，目前需要对其进行扩展和优化，以支持更复杂的使用场景和提高用户体验。主要目标包括：

1. 区分全局正则和局部正则，实现更精细的应用范围控制
2. 支持预设绑定机制，简化预设切换时的正则管理
3. 通过文件夹组织提高正则脚本的可管理性
4. 优化角色卡导入流程，自动关联角色特定的正则表达式

## 核心概念

### 全局正则与局部正则

- **全局正则**：适用于所有对话的正则表达式，主要用于通用文本处理（如删除思维链等）
- **局部正则**：仅适用于特定角色的正则表达式，用于处理特定角色的格式要求

### 预设与正则关联

- 每个预设可以关联一组正则表达式
- 切换预设时，系统自动启用关联的正则，并禁用其他全局正则
- 用户可以在预设详情页面直接管理关联的正则

### 文件夹组织

- 支持创建简单的文件夹来组织全局正则
- 预设可以关联整个文件夹的正则
- 使用"未分类"文件夹作为默认分类，存放新导入或未分类的正则
- 支持启用/禁用（隔离）整个文件夹，不改变其中正则脚本的启用状态
  - 禁用文件夹时，其中的正则不参与处理，但保持原有启用/禁用状态
  - 启用文件夹时，其中的正则根据各自的启用/禁用状态参与处理

### 角色与正则关联

- 角色卡导入时自动识别并关联包含的正则表达式
- 在角色详情页面可直接查看和管理该角色关联的所有正则

## 数据结构扩展

### RegexScript 接口扩展

```typescript
export interface RegexScript {
  // 现有字段
  id: string;
  scriptName: string;
  findRegex: string;
  replaceString: string;
  // ... 其他现有字段 ...

  // 新增字段
  scope: 'global' | 'character'; // 作用域：全局或角色特定
  characterIds?: string[];       // 关联的角色ID列表（当scope为'character'时）
  folderId?: string;            // 所属文件夹ID
  presetIds?: string[];         // 关联的预设ID列表
}
```

### Character 接口扩展

```typescript
export interface Character {
  // 现有字段
  id: string;
  name: string;
  // ... 其他现有字段 ...

  // 新增字段
  regexScriptIds?: string[];    // 关联的正则表达式脚本ID列表
}
```

### Preset 接口扩展

```typescript
export interface Preset {
  // 现有字段
  id: string;
  name: string;
  // ... 其他现有字段 ...

  // 新增字段
  regexScriptIds?: string[];    // 关联的正则表达式脚本ID列表
}
```

### RegexFolder 接口（新增）

```typescript
export interface RegexFolder {
  id: string;                   // 文件夹ID
  name: string;                 // 文件夹名称
  description?: string;         // 描述（可选）
  parentId?: string;            // 父文件夹ID（可选，支持嵌套）
  disabled: boolean;            // 是否禁用（隔离）文件夹
}
```

## 存储层扩展

### 数据库扩展

```typescript
interface AppDB extends DBSchema {
  // 现有表
  characters: {
    key: string;
    value: {
      // ... 现有字段 ...
      regexScriptIds?: string[];    // 新增：关联的正则表达式脚本ID列表
    };
    indexes: { 'by-name': string };
  };
  regex: {
    key: string;
    value: {
      // ... 现有字段 ...
      scope: 'global' | 'character'; // 新增：作用域
      characterIds?: string[];       // 新增：关联的角色ID列表
      folderId?: string;            // 新增：所属文件夹ID
      presetIds?: string[];         // 新增：关联的预设ID列表
    };
  };
  presets: {
    key: string;
    value: {
      // ... 现有字段 ...
      regexScriptIds?: string[];    // 新增：关联的正则表达式脚本ID列表
    };
    indexes: { 'by-name': string };
  };
  // 新增表
  regexFolders: {
    key: string;
    value: RegexFolder;
    indexes: { 'by-name': string };
  };
}
```

### 存储方法扩展

```typescript
// 正则文件夹相关
createRegexFolder(folderData: Partial<RegexFolder>): Promise<RegexFolder>;
updateRegexFolder(id: string, updates: Partial<RegexFolder>): Promise<RegexFolder>;
deleteRegexFolder(id: string): Promise<void>;
listRegexFolders(): Promise<RegexFolder[]>;
getRegexFolder(id: string): Promise<RegexFolder>;

// 正则与预设关联
linkRegexToPreset(regexId: string, presetId: string): Promise<void>;
unlinkRegexFromPreset(regexId: string, presetId: string): Promise<void>;
getRegexScriptsForPreset(presetId: string): Promise<RegexScript[]>;

// 正则与角色关联
// (已实现) linkToCharacter, unlinkFromCharacter, getRegexScriptsForCharacter

// 正则与文件夹关联
moveRegexToFolder(regexId: string, folderId: string): Promise<void>;
getRegexScriptsInFolder(folderId: string): Promise<RegexScript[]>;
enableFolder(folderId: string): Promise<void>;
disableFolder(folderId: string): Promise<void>;
getActiveRegexScripts(): Promise<RegexScript[]>; // 获取所有应该参与处理的正则（考虑文件夹禁用状态）
```

## UI 扩展

### 正则列表页面改进

- 升级现有脚本列表为分类视图（非新增视图）：
  - 全局正则
    - 按预设分组
    - 按文件夹分组
    - 未分类正则
  - 局部正则
    - 按角色分组
    - 未关联角色的正则
- 保留并适配现有功能：
  - 拖拽排序功能
  - 网格视图/列表视图切换
  - 响应式默认设置
- 新增文件夹管理功能
- 新增预设关联管理功能

### 正则编辑页面改进

- 增加作用域选择（全局/局部）
- 局部作用域时显示角色选择器
- 增加文件夹选择器
- 增加预设关联选择器

### 预设详情页面扩展

- 新增"关联的正则表达式"管理模块
- 支持添加/移除关联正则
- 支持关联整个文件夹的正则

### 角色详情页面扩展

- 新增"关联的正则表达式"管理模块
- 支持查看/禁用角色关联的正则

## 功能实现步骤

### 第一阶段：数据结构与存储层扩展

1. 更新 `lib/types.ts` 中的数据接口定义
2. 更新 `lib/storage.ts` 中的数据库结构
3. 实现新增的存储方法
4. 处理数据迁移，确保向后兼容性

### 第二阶段：正则应用逻辑升级

1. 更新 `lib/regexUtils.ts` 中的处理逻辑，支持全局/局部正则区分
2. 实现预设切换时的正则自动启用/禁用逻辑
3. 实现文件夹隔离机制，确保禁用文件夹中的正则不参与处理
4. 确保正则处理的正确应用顺序和优先级

### 第三阶段：UI 实现

1. 升级现有正则列表页面，实现分类视图（保留拖拽排序、视图切换等现有功能）
2. 实现文件夹管理界面
3. 改进正则编辑页面，支持新增的作用域和关联功能
4. 在预设详情页面添加正则管理模块
5. 在角色详情页面添加正则管理模块

### 第四阶段：测试与优化

1. 进行功能测试，确保各项功能正常工作
2. 进行性能测试，确保数据量增大时仍能保持良好性能
3. 进行用户体验测试，收集反馈并进行优化
4. 更新文档和帮助信息

## 未来扩展方向

1. 批量操作功能：支持同时启用/禁用/删除多个正则表达式
2. 正则冲突检测：自动检测并提示可能冲突的正则表达式
3. 正则测试工具：提供更强大的实时测试功能，支持显示替换过程
4. 导入/导出功能：支持将正则组导出为文件，便于分享和备份
5. 正则模板库：预设一些常用的正则表达式模板，方便用户快速创建 