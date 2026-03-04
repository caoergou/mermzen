# Mermaid Editor

[![Deploy to GitHub Pages](https://github.com/caoergou/mermaid-pic/actions/workflows/deploy.yml/badge.svg)](https://github.com/caoergou/mermaid-pic/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/caoergou/mermaid-pic)](https://github.com/caoergou/mermaid-pic/stargazers)

A lightweight, zero-dependency online Mermaid diagram editor with live preview and one-click export.

**Live demo: [caoergou.github.io/mermaid-pic](https://caoergou.github.io/mermaid-pic/)**

[中文文档](README.zh.md)

---

## Features

- Live preview with 300ms debounce
- 11 diagram types: flowchart, sequence, class, Gantt, pie, mindmap, ER, state, architecture, gitGraph, block-beta
- Export SVG / PNG (PNG at 2x resolution)
- Copy PNG image to clipboard
- Shareable URL (diagram encoded in hash)
- Hand-drawn style mode
- 5 Mermaid themes + dark / light UI toggle
- Pan, zoom, and checkerboard background in preview
- Inline syntax error with line number hint
- Built-in example templates and interactive tour
- Right-click context menu on preview: quick download or copy PNG/SVG

---

## Keyboard Shortcuts

| Action | Shortcut |
| --- | --- |
| Save (choose format) | `Ctrl+S` |
| Copy PNG | `Ctrl+Shift+C` |
| Format code | `Ctrl+Shift+F` |
| Command palette | `Ctrl+K` |
| File / Edit / View / Help menu | `Alt+F/E/V/H` |
| Switch preview background | `Alt+1/2/3/4` |

## Run Locally

No build step or package manager needed. Just serve the static files:

```bash
python3 -m http.server
# open http://localhost:8000
```

Or open `index.html` directly in a browser.

## Tech Stack

- [Mermaid 11](https://mermaid.js.org/) — diagram rendering
- [CodeMirror 6](https://codemirror.net/) — code editor
- No build tools, no framework, no package manager — all dependencies loaded via CDN

