# Mermaid Editor 项目记忆

## 项目概述
纯客户端 Mermaid 图表编辑器，静态文件直接运行，无构建步骤。

## 关键文件
- `index.html` — 页面布局，CDN 引入 Mermaid、pako、CodeMirror、字体
- `app.js` — 主入口
- `modules/core.js` — 共享状态 `state`、DOM 引用 `dom`、工具函数、`HAND_FONTS`
- `modules/render.js` — Mermaid 渲染、字体内联、SVG→PNG 转换
- `modules/export.js` — 下载/复制 SVG/PNG

## 字体架构（手绘模式）

### 手绘字体配置（core.js HAND_FONTS）
- Virgil: 直接有 CDN woff2 URL
- Caveat/Kalam: `url: null`，用 `cssUrl` 指向 Google Fonts CSS，运行时动态解析实际 woff2 URL

### 字体内联导出流程（render.js）
`inlineFontsIntoSvg(svgEl)` 在手绘模式下：
1. `buildInlineFontCss()` — 嵌入手绘英文字体（Virgil/Caveat/Kalam）
2. `buildXiaolaiCssForSvg(svgEl)` — 智能嵌入小赖字体（中文），仅嵌入图中实际用到的字符所对应的字体子集

### 小赖字体嵌入原理
- 拉取 `@chinese-fonts/xiaolai@3.0.0` 的 result.css（包含 unicode-range + woff2 URL）
- 从 SVG `<text>/<tspan>/<foreignObject>` 提取所有文本字符
- 只下载覆盖这些字符的字体分包（每包约 100-200KB）
- 以 data URI 形式嵌入，保留 unicode-range 让浏览器正确使用各分包

### PNG 导出尺寸
`svgToPngBlob` 优先使用 SVG 的 `viewBox` 取真实尺寸，不受页面 zoom/pan 影响。

## 已修复的问题
- Caveat/Kalam 曾错误嵌入 Virgil 的字体数据 → 用 Google Fonts CSS 动态解析修复
- 手绘模式中文字体（小赖）未嵌入导致 PNG/SVG 导出中文用系统字体，尺寸不一致导致文字截断 → 智能子集嵌入修复
- PNG 导出用 getBoundingClientRect 受缩放影响尺寸不准 → 改用 viewBox
