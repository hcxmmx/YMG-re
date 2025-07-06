# AI角色扮演平台

这是一款基于Gemini API的AI对话平台，提供高度自定义的角色扮演功能。用户可以创建和管理自己的AI角色，定制提示词和回复风格，支持导入导出主流角色卡格式。

## 特点

- ✨ 完全可定制的AI角色
- 🖼️ 支持图文混合对话
- 💬 流式响应，实时显示AI回复
- 📱 响应式设计，完美适配移动端和桌面端
- 🔄 支持导入导出主流JSON和PNG格式角色卡
- 🔒 本地存储对话历史，保护隐私
- 🌙 支持亮色/暗色主题
- 📦 支持PWA，可一键安装到设备

## 快速开始

### 在线使用

访问[在线演示](https://your-deployment-url.vercel.app)即可开始使用。

### 本地开发

1. 克隆仓库
   ```bash
   git clone https://github.com/yourusername/ai-roleplay-platform.git
   cd ai-roleplay-platform
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 运行开发服务器
   ```bash
   npm run dev
   ```

4. 在浏览器中访问 `http://localhost:3000`

## 使用方法

1. 首次使用需要在设置页面配置Gemini API密钥
2. 创建一个AI角色，设置角色名称、描述和系统提示词
3. 选择角色开始对话
4. 可以随时切换角色或调整设置

## 技术栈

- Next.js 14 (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui 组件库
- Zustand 状态管理
- PWA 支持

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可

MIT

---

使用 [Claude](https://www.anthropic.com/claude) 和 [Gemini](https://ai.google.dev/) 提供支持。 