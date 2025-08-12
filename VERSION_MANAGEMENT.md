# 版本管理和更新提醒系统

## 概述

这个系统为应用提供了自动的版本检测和更新提醒功能，包括：

- 自动检测应用版本更新
- 友好的更新通知（Toast + 详细对话框）
- 完整的更新日志展示
- 版本历史记录管理

## 如何发布新版本

### 1. 更新版本号
编辑 `package.json`：
```json
{
  "version": "1.2.0"
}
```

### 2. 添加更新日志
编辑 `lib/version.ts` 中的 `CHANGELOG` 数组，在**最前面**添加新版本信息：

```typescript
export const CHANGELOG: VersionInfo[] = [
  {
    version: "1.2.0",  // 新版本
    releaseDate: "2024-01-20",
    title: "功能增强版本", 
    features: [
      "新增自动更新通知功能",
      "添加完整的版本管理系统"
    ],
    fixes: [
      "修复某个具体问题"
    ],
    improvements: [
      "优化用户体验"
    ]
  },
  // ... 旧版本记录保持不变
];
```

### 3. 构建和部署
```bash
npm run build
npm run start
```

版本号会自动从 `package.json` 注入到应用中。

## 系统工作原理

### 版本检测
- 应用启动时，比较当前版本与本地存储的版本
- 如果检测到新版本，显示更新通知

### 通知流程
1. **Toast通知**：简短提示有新版本
2. **详细对话框**：3秒后自动弹出（或用户点击Toast查看）
3. **更新日志页面**：用户可通过导航栏访问完整历史

### 本地存储
- `app_version`：存储用户当前使用的版本
- `changelog_read_${version}`：标记特定版本的更新日志是否已读

## 文件结构

```
├── lib/version.ts                           # 版本管理核心逻辑
├── components/ui/version-update-notification.tsx  # 更新通知组件
├── app/changelog/page.tsx                   # 更新日志页面
├── app/layout.tsx                          # 集成更新通知组件
├── components/header.tsx                    # 添加"更新"导航链接
├── next.config.js                          # 构建时注入版本号
└── package.json                            # 版本号源文件
```

## 自定义配置

### 修改通知行为
在 `components/ui/version-update-notification.tsx` 中：

- 调整Toast显示时长
- 修改自动弹窗延迟时间
- 自定义通知样式

### 修改版本比较逻辑
在 `lib/version.ts` 的 `compareVersions` 函数中：

- 目前支持 `x.y.z` 格式
- 可扩展支持更复杂的版本格式（如 alpha、beta 等）

### 修改更新日志展示
在 `app/changelog/page.tsx` 中：

- 自定义页面布局
- 添加筛选功能
- 集成搜索功能

## 最佳实践

1. **版本号规范**：遵循语义化版本（Semantic Versioning）
   - `major.minor.patch` (例: 1.2.3)
   - 主要更新：major +1
   - 功能添加：minor +1
   - 问题修复：patch +1

2. **更新日志编写**：
   - 功能描述要具体明确
   - 按影响程度排序
   - 使用用户友好的语言

3. **发布时机**：
   - 重大功能更新：独立发布
   - 问题修复：可以批量发布
   - 定期发布：避免版本碎片化

## 故障排除

### 更新通知不显示
- 检查版本号是否正确更新
- 清除浏览器本地存储测试
- 查看控制台是否有错误

### 版本比较异常
- 确保版本号格式正确（x.y.z）
- 检查 `CHANGELOG` 中版本号拼写

### 构建时版本注入失败
- 确保 `next.config.js` 配置正确
- 验证 `package.json` 格式

## 测试

### 本地测试更新通知
```javascript
// 在浏览器控制台中执行
localStorage.setItem('app_version', '1.0.0');
location.reload(); // 如果当前版本 > 1.0.0，将显示更新通知
```

### 清除测试数据
```javascript
localStorage.removeItem('app_version');
localStorage.removeItem('changelog_read_1.1.0');
```

这个系统提供了完整的版本管理体验，用户可以及时了解应用更新，开发者可以方便地发布新版本。
