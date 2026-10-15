# 智云课堂字幕导出助手

简体中文 | [English](./README.md)

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

一个用于导出浙江大学智云课堂学习资料的 Chrome / Edge 浏览器插件：视频文字稿（中文、英文、双语，可带时间戳或导出为 SRT 字幕）、PPT 截图合并的 PDF，以及老师课件的原始 PPT 文件。

> **声明：本插件仅供学习交流使用，请勿用于商业用途。** 插件只在你已登录、有权限访问的课程页面中读取资料，不会绕过课程访问权限，也不会把任何数据上传到第三方服务器。请遵守浙江大学及课程的相关规定，尊重教师的著作权。

## 功能特点

- 🎯 一键提取智云课堂视频文字稿，支持中文、英文和双语
- 📄 导出为 Word、Markdown、纯文本，或 SRT 字幕文件
- ⏱️ 可在每段前加时间戳；文件名和标题自动带上课程名、教师和上课时间
- 🖼️ 把 PPT 截图合并导出为 PDF，自动合并动画、板书过程产生的重复截图
- 📥 一键下载老师课件的原始 PPT 文件（尚未生成时自动发起生成并等待）
- 📒 生成图文笔记：每页 PPT 下面配上老师讲这一页时说的话，可导出 Word、Markdown（ZIP）或打印为 PDF
- 🏫 支持改版后的回放页，以及旧版东西教/北教页面

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
3. 弹窗顶部会显示当前课程的名称、教师和上课时间

**导出文字稿**

1. 选择语言（中文/英文/双语）和格式（.txt/.docx/.md/.srt），需要时勾选“每段前加时间戳”
2. 点击“提取文字稿”，完成后可以点“预览”查看
3. 点击“导出”

**导出 PPT**

- **导出 PPT 截图 (PDF)**：把智云在课堂上自动截取的 PPT 画面合并成一个 PDF。默认勾选“合并重复截图”，同一页因动画、板书被截了多次时只保留最完整的一张。
- **下载原始课件**：下载老师课件的原始 PPT 文件。课件尚未生成时，插件会像智云网页端的“导出课件”一样发起生成，并每 10 秒查询一次（较长的课可能需要几分钟）。没有原始课件时可以改用截图 PDF。

**图文笔记**

点击“生成图文笔记”，插件会在新标签页中按时间把 PPT 截图和讲解文字对齐：每页 PPT 下面是老师讲这一页时说的话，翻回讲过的页会标注“再次讲到”。在笔记页里可以切换文字语言、时间戳和是否合并重复截图，然后：

- **下载 Word**：图片和文字都在一个 .docx 里，方便继续做笔记
- **下载 Markdown (ZIP)**：.md 文件和 images 文件夹，适合 Obsidian、Typora 等工具
- **打印 / 存为 PDF**：使用浏览器的打印功能，在“目标打印机”中选择“另存为 PDF”

> 导出过程中请保持弹窗打开。刚结束的课程可能还没有完成语音转写或截图，请稍后再试。

## 开发指南

### 环境要求

- Node.js >= 18（仅运行测试需要）
- Chrome 浏览器

### 本地开发

1. 克隆仓库
   ```bash
   git clone https://github.com/lionyu0717/smartcloud.git
   ```

2. 运行单元测试（需要 Node.js 18+）
   ```bash
   cd smartcloud
   npm test
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
│   ├── popup/          # 弹出窗口（format.js 文字稿格式化，slides.js 截图去重，notes.js 图文对齐，media.js 截图下载）
│   ├── notes/          # 图文笔记页
│   ├── content/        # 内容脚本
│   └── background/     # 后台脚本
├── lib/               # 第三方库（docx、jsPDF、JSZip）
├── tests/             # 单元测试
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

- v1.4.0 (2026-10)
  - 📒 新增图文笔记：PPT 截图与讲解文字按时间对齐，支持导出 Word、Markdown (ZIP) 和打印为 PDF

- v1.3.0 (2026-10)
  - 🖼️ 新增 PPT 截图导出为 PDF，自动合并重复截图
  - 📥 新增下载原始课件（PPT 文件）
  - ⏱️ 文字稿支持时间戳和 SRT 字幕导出
  - 🏷️ 显示课程信息，导出文件名和标题带上课程名、教师和上课时间

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
- [jsPDF](https://github.com/parallax/jsPDF) - PDF 生成库
- [JSZip](https://github.com/Stuk/jszip)（按 MIT 许可使用）- ZIP 打包
- [ZYNotes](https://github.com/Auspiow/zhiyun-extension) - “PPT 配讲解字幕”笔记的创意来源（未使用其代码）
- [zju-learning-cli](https://github.com/geniucker-dev/zju-learning-cli)（MIT）- PPT 截图去重算法的思路来源，以及智云接口的参考
- [ZJU-Course-Desktop](https://github.com/huharvey/ZJU-Course-Desktop)、[无际 Edgeless](https://github.com/StephenChen1108/edgeless-zju-transcript-exporter) - 智云课件导出接口的参考
- 浙江大学智云课堂平台

