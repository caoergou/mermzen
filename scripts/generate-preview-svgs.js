/**
 * 使用 Playwright 渲染 Mermaid 手绘风格图表，导出 SVG 文件到 assets/
 * 用法：node scripts/generate-preview-svgs.js
 * 依赖：本地 http-server 需在项目根目录以 8766 端口运行
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// 使用与 embed.html 一致的编码方式（v2 JSON + deflate + base64url）
function encodeForEmbed(code) {
  const payload = JSON.stringify({ v: 2, c: code });
  const compressed = zlib.deflateSync(Buffer.from(payload, 'utf-8'));
  return compressed.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

const BASE_URL = 'http://localhost:8766';

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

const diagrams = [
  {
    name: 'preview-flowchart',
    code: `graph TD
    A([开始]) --> B[用户输入账号 / 密码]
    B --> C{账号是否存在?}
    C -->|否| D[提示账号不存在]
    D --> B
    C -->|是| E{密码是否正确?}
    E -->|否| F[记录失败次数]
    F --> G{失败次数 ≥ 3?}
    G -->|是| H[锁定账号 30 分钟]
    G -->|否| B
    E -->|是| I[生成 Session Token]
    I --> J[跳转首页]
    J --> K([结束])`,
  },
  {
    name: 'preview-sequence',
    code: `sequenceDiagram
    participant User as 用户
    participant Browser as 浏览器
    participant API as API服务器
    participant Redis
    participant MySQL

    User->>Browser: 填写账号密码并登录
    Browser->>API: POST /api/login

    API->>Redis: GET login_fail:username
    Redis-->>API: 失败次数 (0)

    API->>MySQL: SELECT user WHERE username=?
    MySQL-->>API: 用户记录

    alt 密码验证通过
        API->>Redis: SET session:token 7d
        API-->>Browser: 200 OK + Token
        Browser-->>User: 跳转首页
    else 密码错误
        API->>Redis: INCR login_fail:username
        API-->>Browser: 401 Unauthorized
        Browser-->>User: 显示错误提示
    end`,
  },
  {
    name: 'preview-class',
    code: `classDiagram
    class User {
        +int id
        +String name
        +String email
        +placeOrder() Order
    }
    class Order {
        +int id
        +Date createdAt
        +String status
        +calcTotal() float
    }
    class OrderItem {
        +int quantity
        +float unitPrice
        +getSubtotal() float
    }
    class Product {
        +int id
        +String name
        +float price
        +int stock
    }
    User "1" --> "0..*" Order : 下单
    Order "1" *-- "1..*" OrderItem : 包含
    OrderItem "*..*" --> "1" Product : 引用`,
  },
];

async function generateSVGs() {
  if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  for (const { name, code } of diagrams) {
    console.log(`Rendering ${name}...`);

    const encoded = encodeForEmbed(code);
    const url = `${BASE_URL}/embed.html#${encoded}`;

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    try {
      // embed.html 渲染完成后 SVG 会出现
      await page.waitForSelector('#diagram svg', { timeout: 30000 });
      // 额外等待 roughjs 动画/路径计算完成
      await page.waitForTimeout(800);
    } catch {
      console.error(`  ✗ Timeout waiting for SVG: ${name}`);
      continue;
    }

    const svgContent = await page.evaluate(() => {
      const svgEl = document.querySelector('#diagram svg');
      if (!svgEl) return null;
      svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svgEl.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      return svgEl.outerHTML;
    });

    if (svgContent) {
      const outPath = path.join(ASSETS_DIR, `${name}.svg`);
      fs.writeFileSync(outPath, svgContent, 'utf-8');
      console.log(`  ✓ Saved ${name}.svg`);
    } else {
      console.error(`  ✗ No SVG found for ${name}`);
    }
  }

  await browser.close();
  console.log('\nDone! SVGs saved to assets/');
}

generateSVGs().catch(e => {
  console.error(e);
  process.exit(1);
});
