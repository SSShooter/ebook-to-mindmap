<p align="center">
  <a href="https://ebook2me.mind-elixir.com/" target="_blank" rel="noopener noreferrer">
    <img width="150" src="/public/icon.png" alt="电子书转思维导图 logo">
  </a>
  <h1 align="center">电子书转思维导图</h1>
</p>


[English](README.en.md) | 中文

![电子书转思维导图 截图1](/img/screenshot1.jpg)

一个基于 AI 技术的智能电子书解析工具，支持将 EPUB 和 PDF 格式的电子书转换为结构化的思维导图和文字总结。

立即试用：https://ebook2me.mind-elixir.com/

## ✨ 功能特性

### 📚 多格式支持

- **EPUB 文件**：完整支持 EPUB 格式电子书的解析和处理
- **PDF 文件**：智能解析 PDF 文档，支持基于目录和智能检测的章节提取

### 🤖 AI 驱动的内容处理

- **多种 AI 服务**：支持 Google Gemini 和 OpenAI GPT 模型
- **BYOK 模式**：需要使用您自己的 API Key（Bring Your Own Key），保证数据安全和隐私
- **本地直连**：所有 AI 请求均由浏览器本地直接连接 AI 供应商，绝不经过任何第三方代理或中转服务器
- **三种处理模式**：
  - 📝 **文字总结模式**：生成章节总结、分析章节关联、输出全书总结
  - 🧠 **章节思维导图模式**：为每个章节生成独立的思维导图
  - 🌐 **整书思维导图模式**：将整本书内容整合为一个完整的思维导图

### 🎯 智能章节处理

- **智能章节检测**：自动识别和提取书籍章节结构
- **章节筛选**：支持跳过前言、目录、致谢等非核心内容
- **灵活选择**：用户可自由选择需要处理的章节
- **子章节支持**：可配置子章节提取深度

### 💾 高效缓存机制

- **智能缓存**：自动缓存 AI 处理结果，处理中断后可从上次位置继续
- **缓存管理**：支持按模式清除缓存，节省存储空间
- **离线查看**：已处理的内容可离线查看

### 🎨 现代化界面

- **响应式设计**：适配各种屏幕尺寸
- **实时进度**：处理过程可视化，实时显示当前步骤
- **交互式思维导图**：支持缩放、拖拽、节点展开/折叠
- **内容预览**：支持查看原始章节内容

## 📖 使用指南

### 1. 配置 AI 服务

首次使用需要配置 AI 服务：

> **🔒 隐私保护说明**：本工具采用 BYOK（Bring Your Own Key）模式，您需要使用自己的 API Key。所有 AI 请求均由您的浏览器本地直接连接 AI 供应商（Google 或 OpenAI），绝不经过任何第三方代理或中转服务器，确保您的数据安全和隐私。

1. 点击「配置」按钮
2. 选择 AI 服务提供商：
   - **Google Gemini**（推荐）：需要 Gemini API Key
   - **OpenAI GPT**：需要 OpenAI API Key 和 API 地址
3. 输入相应的 API Key
4. 选择模型（可选，使用默认模型即可）

#### 获取 API Key

**Google Gemini API Key**：

1. 访问 [Google AI Studio](https://aistudio.google.com/)
2. 登录 Google 账号
3. 创建新的 API Key
4. 复制 API Key 到配置中

**OpenAI API Key**：

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 登录并进入 API Keys 页面
3. 创建新的 API Key
4. 复制 API Key 到配置中

这里还有一些[免费方案](https://github.com/SSShooter/Video-Summary/blob/master/guide/index.md)可供参考。

### 2. 上传电子书文件

1. 点击「选择 EPUB 或 PDF 文件」按钮
2. 选择要处理的电子书文件
3. 支持的格式：`.epub`、`.pdf`

### 3. 配置处理选项

在配置对话框中设置处理参数：

#### 处理模式

- **文字总结模式**：适合需要文字总结的场景
- **章节思维导图模式**：为每个章节生成独立思维导图
- **整书思维导图模式**：生成整本书的统一思维导图

#### 书籍类型

- **小说类**：适用于小说、故事类书籍
- **非小说类**：适用于教材、工具书、技术书籍等

#### 高级选项

- **智能章节检测**：启用后会使用 AI 智能识别章节边界
- **跳过无关章节**：自动跳过前言、目录、致谢等内容
- **子章节深度**：设置提取子章节的层级深度（0-3）

### 4. 提取章节

1. 点击「提取章节」按钮
2. 系统会自动解析文件并提取章节结构
3. 提取完成后会显示章节列表
4. 可以选择需要处理的章节（默认全选）

### 5. 开始处理

1. 确认选择的章节
2. 点击「开始处理」按钮
3. 系统会显示处理进度和当前步骤
4. 处理完成后会显示结果

### 6. 查看结果

根据选择的处理模式，可以查看不同类型的结果：

#### 文字总结模式

- **章节总结**：每个章节的详细总结
- **章节关联**：分析章节之间的逻辑关系
- **全书总结**：整本书的核心内容总结

#### 思维导图模式

- **交互式思维导图**：可缩放、拖拽的思维导图
- **节点详情**：点击节点查看详细内容
- **导出功能**：支持导出为图片或其他格式

## 🛠️ 技术架构

### 核心技术栈

- **前端框架**：React 19 + TypeScript
- **构建工具**：Vite
- **样式方案**：Tailwind CSS + shadcn/ui
- **状态管理**：Zustand
- **文件解析**：
  - EPUB：@smoores/epub + epubjs
  - PDF：pdfjs-dist
- **思维导图**：mind-elixir
- **AI 服务**：
  - Google Gemini：@google/generative-ai
  - OpenAI：自定义实现

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

感谢以下开源项目：

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [mind-elixir](https://github.com/ssshooter/mind-elixir-core)
- [PDF.js](https://mozilla.github.io/pdf.js/)
- [epub.js](https://github.com/futurepress/epub.js/)

---

如有问题或建议，欢迎提交 Issue 或联系开发者（微信👇）

<img width="220" alt="WeChat" src="/img/wechat.JPG" />
