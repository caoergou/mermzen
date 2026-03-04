/**
 * 生成 PNG 预览图用于 README
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function encodeForEmbed(code) {
  const payload = JSON.stringify({ v: 2, c: code });
  const compressed = zlib.deflateSync(Buffer.from(payload, 'utf-8'));
  return compressed.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

const BASE_URL = 'http://localhost:8766';
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

const DIAGRAMS = [
  {
    name: 'preview-flowchart',
    width: 700,
    height: 600,
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
    J --> K([结束])`
  },
  {
    name: 'preview-flowchart-en',
    width: 700,
    height: 600,
    code: `graph TD
    A([Start]) --> B[User enters credentials]
    B --> C{Account exists?}
    C -->|No| D[Show error]
    D --> B
    C -->|Yes| E{Password valid?}
    E -->|No| F[Increment fail count]
    F --> G{Fails ≥ 3?}
    G -->|Yes| H[Lock account 30 min]
    G -->|No| B
    E -->|Yes| I[Generate Session Token]
    I --> J[Redirect to dashboard]
    J --> K([End])`
  },
  {
    name: 'preview-class',
    width: 700,
    height: 500,
    code: `classDiagram
    class User {
        +int id
        +string username
        +string email
        +login() bool
    }

    class Order {
        +int id
        +datetime createdAt
        +decimal total
        +submit() void
    }

    class OrderItem {
        +int quantity
        +decimal price
    }

    class Product {
        +int id
        +string name
        +decimal price
    }

    User "1" --> "0..*" Order : 下单
    Order "1" *-- "1..*" OrderItem : 包含
    OrderItem "*..*" --> "1" Product : 引用`
  },
  {
    name: 'preview-class-en',
    width: 700,
    height: 500,
    code: `classDiagram
    class User {
        +int id
        +string username
        +string email
        +login() bool
    }

    class Order {
        +int id
        +datetime createdAt
        +decimal total
        +submit() void
    }

    class OrderItem {
        +int quantity
        +decimal price
    }

    class Product {
        +int id
        +string name
        +decimal price
    }

    User "1" --> "0..*" Order : places
    Order "1" *-- "1..*" OrderItem : contains
    OrderItem "*..*" --> "1" Product : references`
  },
  {
    name: 'preview-sequence',
    width: 1000,
    height: 600,
    code: `sequenceDiagram
    actor 用户
    participant 浏览器
    participant API服务器
    participant Redis缓存
    participant MySQL

    用户->>浏览器: 填写账号密码并点击登录
    浏览器->>API服务器: POST /api/login {username, password}

    API服务器->>Redis缓存: GET login_fail:{username}
    Redis缓存-->>API服务器: 失败次数 (0)

    API服务器->>MySQL: SELECT * FROM users WHERE username=?
    MySQL-->>API服务器: 用户记录

    alt 密码验证通过
        API服务器->>API服务器: 生成 JWT Token (HS256)
        API服务器->>Redis缓存: SET session:{token} 7d
        API服务器-->>浏览器: 200 OK {token, user}
        浏览器->>浏览器: 存入 localStorage
        浏览器-->>用户: 跳转首页
    else 密码错误
        API服务器->>Redis缓存: INCR login_fail:{username}
        API服务器-->>浏览器: 401 {error: "密码错误"}
        浏览器-->>用户: 显示错误提示
    end`
  },
  {
    name: 'preview-sequence-en',
    width: 1000,
    height: 600,
    code: `sequenceDiagram
    actor User
    participant Browser
    participant API
    participant Redis
    participant MySQL

    User->>Browser: Enter credentials and click login
    Browser->>API: POST /api/login {username, password}

    API->>Redis: GET login_fail:{username}
    Redis-->>API: Fail count (0)

    API->>MySQL: SELECT * FROM users WHERE username=?
    MySQL-->>API: User record

    alt Password valid
        API->>API: Generate JWT Token (HS256)
        API->>Redis: SET session:{token} 7d
        API-->>Browser: 200 OK {token, user}
        Browser->>Browser: Store in localStorage
        Browser-->>User: Redirect to dashboard
    else Password invalid
        API->>Redis: INCR login_fail:{username}
        API-->>Browser: 401 {error: "Invalid password"}
        Browser-->>User: Show error message
    end`
  }
];

async function generatePNGs() {
  if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

  const browser = await chromium.launch();

  for (const { name, code, width, height } of DIAGRAMS) {
    console.log(`\nRendering ${name}.png...`);

    const page = await browser.newPage();
    await page.setViewportSize({ width: width + 100, height: height + 100 });

    const encoded = encodeForEmbed(code);
    const url = `${BASE_URL}/embed.html#${encoded}`;

    await page.goto(url);

    try {
      await page.waitForSelector('#diagram svg', { timeout: 10000 });
      await page.waitForTimeout(1000);
    } catch {
      console.error(`  ✗ Timeout waiting for SVG: ${name}`);
      await page.close();
      continue;
    }

    const svgElement = await page.$('#diagram svg');
    if (!svgElement) {
      console.error(`  ✗ No SVG found for ${name}`);
      await page.close();
      continue;
    }

    const outPath = path.join(ASSETS_DIR, `${name}.png`);
    await svgElement.screenshot({ path: outPath, scale: 'device' });
    console.log(`  ✓ Saved ${name}.png`);
    await page.close();
  }

  await browser.close();
  console.log('\n✓ All PNG previews generated');
}

generatePNGs().catch(console.error);
