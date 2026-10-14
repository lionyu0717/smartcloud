# 智云课堂字幕导出助手

简体中文 | [English](./README.md)

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

一个用于导出浙江大学智云课堂视频字幕的 Chrome 浏览器插件。支持导出中文、英文和双语字幕，并提供多种文件格式选择。支持东西教和北教不同的课程页面。

## 功能特点

- 🎯 一键提取智云课堂视频字幕
- 🌏 支持中文、英文和双语导出
- 📄 支持多种导出格式（Word、Markdown、纯文本）
- 🏫 支持东西教和北教不同的课程页面
- 🎨 简洁直观的用户界面
- ⚡️ 快速响应，实时进度提示

## 安装方法

1. 下载插件
   - 从 [Releases](https://github.com/lionyu0717/smartcloud/releases) 页面下载最新版本
   - 或克隆仓库后手动构建：
     ```bash
     git clone https://github.com/lionyu0717/smartcloud.git
     cd smartcloud
     pnpm install
     ```

2. 安装到 Chrome
   - 打开 Chrome 浏览器，进入扩展程序页面 (`chrome://extensions/`)
   - 开启右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择插件目录

## 使用说明

1. 进入智云课堂课程回放页面（支持改版后的 `interactivemeta.cmc.zju.edu.cn` 回放页，以及旧版东西教/北教页面）
2. 点击浏览器工具栏中的插件图标
3. 选择导出语言（中文/英文/双语）
4. 选择导出格式（.txt/.docx/.md）
5. 点击"提取文字稿"
6. 等待提取完成后，点击"导出文字稿"（也可以先点"预览内容"查看）

> 刚结束的课程可能还没有完成语音转写，请稍后再试。

## 开发指南

### 环境要求

- Node.js >= 14
- Chrome 浏览器

### 本地开发

1. 克隆仓库
   ```bash
   git clone https://github.com/lionyu0717/smartcloud.git
   ```

2. 安装依赖
   ```bash
   cd smartcloud
   pnpm install
   ```

3. 在 Chrome 中加载插件
   - 打开 `chrome://extensions/`
   - 开启开发者模式
   - 点击"加载已解压的扩展程序"
   - 选择项目目录

### 项目结构

```
smartcloud/
├── src/
│   ├── popup/          # 弹出窗口相关文件
│   ├── content/        # 内容脚本
│   └── background/     # 后台脚本
├── lib/               # 第三方库
├── assets/           # 图标等资源
└── manifest.json     # 插件配置文件
```

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 版本历史

- v1.2.0 (2026-10)
  - 🔧 适配智云课堂改版：改为通过智云的语音转写接口获取文字稿，旧版页面 DOM 解析作为兜底（[#2](https://github.com/lionyu0717/smartcloud/issues/2)）
  - 🐛 修复提取后看不到导出选项的问题，新增独立的“导出文字稿”按钮（[#1](https://github.com/lionyu0717/smartcloud/issues/1)）
  - 💾 改用 `chrome.downloads` 下载，文件名带课程标题
  - ♻️ 插件安装前已打开的页面也能直接使用（按需注入 content script）

- v1.1.0 (2024-01)
  - ✨ 新增支持北教课程页面
  - 🔍 自动识别东西教/北教页面
  - 📝 在界面显示当前教学楼位置

- v1.0.0 (2024-01)
  - 支持基础字幕提取和导出功能
  - 支持中英文和双语导出
  - 支持 txt、docx、md 格式

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 致谢

- [docx.js](https://github.com/dolanmiu/docx) - Word 文档生成库
- 浙江大学智云课堂平台

