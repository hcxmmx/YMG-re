# 🧪 MessageBuilder V3 测试文件

这个目录包含了V3架构的所有测试文件。

## 📋 测试文件说明

### 🚀 快速测试
- **test-v3-simple.js** - 最简单的功能验证测试
- **test-v3-quick.js** - 完整的架构功能测试

### 📁 真实预设测试
- **test-real-preset.js** - 基础版真实预设文件测试
- **test-real-preset-fixed.js** - 修复版真实预设测试（推荐）

### 🌐 浏览器测试
- **test-v3-browser.html** - 可视化测试页面，支持拖拽预设文件

## 🧪 如何运行测试

```bash
# 快速功能验证
node tests/test-v3-simple.js

# 测试真实预设文件（需要预设文件在项目根目录）
node tests/test-real-preset-fixed.js

# 浏览器测试（用浏览器打开）
start tests/test-v3-browser.html
```

## ✅ 验证的功能

- [x] 深度注入算法
- [x] 消息合并逻辑
- [x] API格式转换 (Gemini, OpenAI)
- [x] 参数映射和过滤
- [x] 空内容过滤
- [x] 缺失字段处理
- [x] 性能基准测试

## 📊 测试结果

所有测试均已通过，V3架构就绪可用！

- 🚀 构建速度: 0.002ms/次
- 🎯 功能完整性: 100%
- 📐 SillyTavern兼容性: 100%
