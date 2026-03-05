# AGENTS.md

This file provides guidance to AI agents (Claude, Cursor, etc.) when working with code in this repository.

## 项目概述

纯客户端的 Mermaid 图表编辑器，支持实时预览。使用 Vite 7 + TypeScript 构建，通过 `.github/workflows/deploy.yml` 在推送到 `main` 分支时自动部署到 GitHub Pages（自定义域名：https://eric.run.place/MermZen/）。

## 架构

应用由 `index.html`、`embed.html` 和 TypeScript 源代码组成，使用 Vite 进行构建和打包。

### 入口文件

- `index.html` — 主页面布局、工具栏、编辑器/预览面板、帮助弹窗、引导遮罩层。
- `src/app.ts` — 主入口，负责启动引导（bootstrap）和全局快捷键绑定。
- `embed.html` — 嵌入模式页面，仅显示图表预览，不含编辑器。
- `src/embed.ts` — embed.html 对应的入口文件。

### 目录结构

```
mermzen/
├── src/
│   ├── app.ts              ← 主入口（已完全 TypeScript）
│   ├── embed.ts            ← embed.html 对应入口（已完全 TypeScript）
│   ├── env.d.ts            ← Vite 类型声明
│   ├── styles/
│   │   └── fonts.css       ← 本地字体 @import
│   └── modules/            ← 所有模块（已完全 TypeScript）
│       ├── store.ts        ← 应用状态 + AppState 类型
│       ├── render.ts       ← mermaid ES import
│       ├── export.ts       ← pako ES import + SVGO
│       ├── export-utils.ts ← SVG/PNG 导出工具（含 TypeScript 注释）
│       ├── svgo-optimize.ts← SVGO v4 封装（browser 入口 + preset-default 配置）
│       ├── editor.ts       ← CodeMirror 编辑器（已完全 TypeScript）
│       ├── dom.ts          ← DOM 元素选择器模块
│       ├── utils.ts        ← 通用工具函数
│       ├── command-palette.ts
│       ├── i18n.ts         ← 国际化模块
│       ├── formatter.ts    ← 代码格式化
│       ├── examples.ts     ← 示例代码
│       ├── mermaid-highlight-ext.ts
│       ├── tour.ts         ← 引导功能
│       └── ui/             ← UI 模块（已完全 TypeScript）
│           ├── context-menu.ts
│           ├── layout.ts
│           ├── menu.ts
│           ├── mobile.ts
│           ├── theme.ts
│           └── zoom.ts
├── scripts/                ← 全 TypeScript 脚本
│   ├── build-blog.ts       ← 构建博客（markdown 转 HTML，带 iFrame 预览）
│   ├── generate-preview-pngs.ts
│   ├── generate-preview-svgs.ts
│   └── generate-sitemap.sh
├── public/
│   ├── fonts/
│   │   └── Virgil.woff2    ← 本地托管
│   ├── logo.svg
│   └── robots.txt
├── modules/                ← 保留原始文件（旧版兼容）
├── vite.config.ts          ← 构建配置（base: '/MermZen/'）
├── tsconfig.json           ← 宽松的 TypeScript 配置
├── tsconfig.node.json      ← Node.js 脚本的 TypeScript 配置（NodeNext）
├── package.json
├── index.html
└── embed.html
```

### 模块 (`src/modules/`)

| 文件 | 职责 |
|------|------|
| `store.ts` | 全局状态（`state`）、平移缩放状态（`pz`）、手绘字体配置（`HAND_FONTS`）、常量（`MIN_SCALE`、`MAX_SCALE`）、手绘偏好读写（`saveHandDrawnPrefs`）、字体辅助函数 |
| `dom.ts` | 集中管理所有 DOM 元素引用（`dom` 对象） |
| `utils.ts` | 通用工具函数：`showToast`、`updateEditorStatus`、`setRenderStatus`、`btnSuccess`、`downloadFile`、`openHelp`、`closeHelp`、`escapeHtml` |
| `i18n.ts` | 国际化字符串（`STRINGS`）、`applyI18n()` |
| `examples.ts` | 示例图表数据（`EXAMPLES_ZH`、`EXAMPLES_EN`）、默认代码（`DEFAULT_CODE`） |
| `editor.ts` | CodeMirror 6 编辑器初始化、`getCode()`、`formatCode()`、`scheduleLint()` |
| `formatter.ts` | Mermaid 代码格式化器（`formatMermaidCode`），支持多种图表类型 |
| `render.ts` | Mermaid 初始化/渲染（`initMermaid`、`renderDiagram`） |
| `export-utils.ts` | 字体内联（`inlineFontsIntoSvg`）、SVG→PNG 转换（`svgToPngBlob`） |
| `export.ts` | 复制/下载 SVG/PNG（`copyPng`、`downloadSvg`、`downloadPng`）、URL 编码/解码（pako 压缩）、分享链接（`copyShareLink`）、嵌入代码（`copyEmbedCode`） |
| `tour.ts` | 交互式引导教程（`startTour`） |
| `command-palette.ts` | 命令面板（`Ctrl+K` / `openCmdPalette`） |
| `svgo-optimize.ts` | SVGO v4 封装，用于 SVG 优化 |
| `mermaid-highlight-ext.ts` | Mermaid 语法高亮扩展 |

### 子目录 `src/modules/ui/`

| 文件 | 职责 |
|------|------|
| `theme.ts` | UI 主题切换（`applyUiTheme`、`toggleUiTheme`）、手绘模式切换（`toggleHandDrawn`）、Mermaid 主题切换（`switchTheme`）、预览背景切换（`switchPreviewBg`） |
| `layout.ts` | 可拖动分割线初始化（`initLayout`），支持水平/垂直自适应布局 |
| `menu.ts` | 菜单栏交互（`initMenu`）：示例下拉、主题/背景/手绘菜单项、分享嵌入、帮助、命令面板、格式化等所有菜单动作 |
| `zoom.ts` | 预览区缩放与平移（`initZoom`、`zoomTo`、`resetView`、`applyTransform`） |
| `mobile.ts` | 移动端标签页切换（`switchMobileTab`）、移动端溢出菜单（`initMobileUI`） |
| `context-menu.ts` | 预览区右键菜单（`initContextMenu`）：下载 PNG/SVG、复制 PNG |

## 依赖

- **Mermaid 11** — 图表渲染（ES 模块 import）
- **CodeMirror 6** — 编辑器，配合 `codemirror-lang-mermaid` 和 `@codemirror/theme-one-dark`
- **pako** — URL 分享时的代码压缩（ES 模块 import）
- **SVGO v4** — SVG 优化（ES 模块 import）
- **@fontsource** — 本地化字体库：Outfit、JetBrains Mono、Kalam、Caveat（支持中文字体）
- **Xiaolai SC** — 中文手绘字体（CDN 加载）

## 关键行为

- 输入后 300ms 防抖渲染，也可通过 `Ctrl+Enter` 手动触发
- PNG 导出默认 4 倍分辨率缩放（canvas），SVG 导出含字体内联
- 手绘模式支持三种字体（Kalam、Virgil、Caveat）、三种字号（小/中/大）、固定/随机种子
- 导出文件名格式：`{图表类型}-{YYYYMMDD-HHmmss}.{ext}`
- URL 分享：使用 pako 压缩后 base64url 编码，存于 `location.hash`；同时 localStorage 持久化（key: `mermzen-code`）
- 主题/手绘偏好持久化到 localStorage（key: `mermzen-handdrawn`、`mermzen-lang`）
- 引导教程仅在首次访问时自动启动（标记 key: `mermzen-tour-seen`）
- 响应式：`≤768px` 时切换为移动端标签页模式（编辑器/预览二选一）

## 博客 (`blog/`)

静态博客，提供中英文 Mermaid 教程文章：

```
blog/
  blog.css               — 博客样式
  _template-zh.html      — 中文文章模板
  _template-en.html      — 英文文章模板
  zh/index.html          — 中文博客列表页
  en/index.html          — 英文博客列表页
  zh/posts/              — 中文 Markdown 文章（flowchart、sequence、class、gantt、pie）
  en/posts/              — 英文 Markdown 文章
```

## 测试

项目使用 Playwright 进行端到端测试：

```bash
# 安装依赖
npm install

# 安装 Playwright 浏览器
npx playwright install chromium --with-deps

# 运行测试
npx playwright test test-tour.spec.js
```

- `playwright.config.js` — Playwright 配置，仅测试 `test-tour.spec.js`，使用 Chromium headless 模式
- `test-tour.spec.js` — 引导教程 E2E 测试

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器（端口 5173）
npm run dev

# 构建生产版本（输出到 dist/）
npm run build

# 类型检查
npm run type-check
```

## 其他文件

- `llms.txt` — 供 LLM 爬虫读取的项目概览（遵循 llms.txt 规范）
- `robots.txt` — 搜索引擎爬虫规则
- `sitemap.xml` — 站点地图
- `scripts/generate-sitemap.sh` — 自动生成 sitemap 的脚本
- `logo.svg` — 项目 Logo
