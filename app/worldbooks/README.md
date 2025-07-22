# 世界书模块开发文档

## 背景与目标

世界书模块（World Info）是一个用于动态插入上下文信息到AI聊天的工具。它通过识别对话中的关键词，将相关背景信息注入到提示词中，从而增强AI对虚构世界详情的理解。本模块参考了SillyTavern的世界书功能，旨在提供灵活且强大的上下文管理能力。

## 开发方案

### 一、现存问题修复

#### 1. 世界书启用状态管理
- 在WorldBook类型中添加`enabled`字段，默认为true
- 在世界书卡片中添加启用/禁用开关
- 在世界书列表页面清晰显示启用状态
- 确保只有启用的世界书会参与提示词构建

#### 2. 世界书-角色关联功能
- 在世界书详情页添加"关联角色"按钮和角色选择器
- 显示已关联角色的信息和头像
- 允许一键解除关联
- 一个世界书可以关联多个角色（修改现有的一对一关系）

#### 3. 条目显示优化
- 简化条目卡片，只显示：
  - 条目名称
  - 策略指示器（蓝灯/绿灯/链接图标）
  - 启用/禁用开关
  - 编辑、删除按钮
- 移除卡片中的条目内容预览和关键词显示
- 添加排序功能，按order值排序

### 二、功能完善

#### 1. 条目编辑页面实现
- 创建路径: `/worldbooks/[id]/entries/[entryId]`
- 分区域设计表单：
  - 基本信息（标题、内容、启用状态、插入位置）
  - 激活策略（常量/选择性/向量化）
  - 关键字管理（主要关键字、次要关键字、关键字逻辑）
  - 递归设置（排除递归、防止递归、延迟递归等）
  - 时效性设置（概率、黏性、冷却、延迟）
- 提供关键字测试功能

#### 2. 世界书全局设置界面
- 在世界书详情页的"设置"选项卡中实现：
  - 扫描深度设置
  - 包含角色名称选项
  - 最大递归步骤
  - 最小激活数量
  - 最大深度
  - 大小写敏感
  - 全词匹配

#### 3. 条目激活测试功能
- 添加测试页面或模态框
- 允许输入测试文本
- 显示哪些条目会被激活及激活原因
- 显示递归激活过程
- 预览生成的最终提示词内容

#### 4. 导入/导出增强
- 支持批量导入条目
- 提供导出选项（整个世界书/单个条目）
- 添加导入验证和错误提示
- 支持从Silly Tavern兼容格式导入

### 三、实现计划

#### 阶段一：核心问题修复
1. 添加世界书启用/禁用功能
2. 实现世界书-角色关联功能
3. 优化条目显示

#### 阶段二：条目编辑功能
1. 设计并实现条目编辑页面
2. 添加关键字管理界面
3. 实现递归和时效性设置

#### 阶段三：测试与高级功能
1. 实现世界书全局设置
2. 添加条目激活测试功能
3. 增强导入/导出功能

#### 阶段四：优化与性能提升
1. 优化大量条目时的性能
2. 添加条目搜索和过滤功能
3. 实现条目分类和标签功能

## 数据结构设计

### 世界书（WorldBook）

```typescript
interface WorldBook {
  id: string;                 // 唯一ID
  name: string;               // 世界书名称
  description?: string;       // 世界书描述
  entries: WorldBookEntry[];  // 世界书条目
  settings: WorldBookSettings; // 世界书全局设置
  createdAt: number;          // 创建时间
  updatedAt: number;          // 更新时间
  characterIds: string[];     // 关联的角色ID列表（修改为多对多关系）
  enabled: boolean;           // 是否启用
}
```

### 世界书条目（WorldBookEntry）

```typescript
interface WorldBookEntry {
  id: string;                 // 条目ID
  title: string;              // 条目标题/备注
  content: string;            // 条目内容（将插入提示词）
  
  // 激活设置
  strategy: 'constant' | 'selective' | 'vectorized';  // 激活策略（常量/选择性/向量化）
  enabled: boolean;           // 是否启用
  order: number;              // 插入顺序（优先级）
  position: 'before' | 'after'; // 插入位置（角色描述前/后）
  
  // 选择性激活的关键字
  primaryKeys: string[];      // 主要关键字
  secondaryKeys: string[];    // 次要关键字（可选过滤器）
  selectiveLogic: 'andAny' | 'andAll' | 'notAny' | 'notAll';  // 选择逻辑
  
  // 正则选项
  caseSensitive?: boolean;    // 区分大小写
  matchWholeWords?: boolean;  // 全词匹配
  
  // 递归设置
  excludeRecursion: boolean;  // 不可递归（不被其他条目激活）
  preventRecursion: boolean;  // 防止进一步递归
  delayUntilRecursion: boolean; // 延迟到递归
  recursionLevel: number;     // 递归等级
  
  // 时效功能
  probability: number;        // 激活概率（0-100）
  sticky: number;             // 黏性（保持激活的消息数）
  cooldown: number;           // 冷却（不能激活的消息数）
  delay: number;              // 延迟（要求最少消息数才能激活）
  
  // 扫描设置
  scanDepth?: number;         // 条目级扫描深度（覆盖全局设置）

  // 状态追踪（不存储，运行时使用）
  _activated?: boolean;       // 是否被激活
  _stickyRemaining?: number;  // 剩余黏性时间
  _cooldownRemaining?: number; // 剩余冷却时间
}
```

### 世界书全局设置（WorldBookSettings）

```typescript
interface WorldBookSettings {
  scanDepth: number;          // 默认扫描深度
  includeNames: boolean;      // 是否包含角色名称
  maxRecursionSteps: number;  // 最大递归步骤
  minActivations: number;     // 最小激活数量
  maxDepth: number;           // 最大深度
  caseSensitive: boolean;     // 默认区分大小写
  matchWholeWords: boolean;   // 默认全词匹配
}
```

## 实现注意事项

1. 不要使用localStorage存储数据，所有数据应使用IndexedDB存储
2. 目前处于开发阶段，不需要考虑数据迁移问题
3. 将激活逻辑与UI分离，便于后续优化和测试
4. 提供清晰的用户引导，帮助理解复杂的激活规则 