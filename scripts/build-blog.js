/**
 * Blog 构建脚本：将 blog/zh/posts/*.md 和 blog/en/posts/*.md
 * 转换为 HTML，注入模板，并在每个代码示例后嵌入 iframe 预览。
 * 用法：node scripts/build-blog.js
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT = path.join(__dirname, '..');
const MERMZEN_BASE = 'https://eric.run.place/MermZen/';

// 解析 frontmatter（--- key: value --- 格式）
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { meta: {}, body: content };
  const meta = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key) meta[key.trim()] = rest.join(':').trim();
  });
  return { meta, body: content.slice(match[0].length) };
}

// 将 marked 生成的 HTML 里的 "try-in-editor" 链接前插入 iframe 预览
// 匹配 <a href="https://eric.run.place/MermZen/#HASH" ... class="try-in-editor">
function injectIframePreviews(html, lang) {
  // embed.html 相对于 blog/zh/ 或 blog/en/ 的路径
  const embedPath = '../../embed.html';
  const MERMZEN_HASH_RE = /href="https:\/\/eric\.run\.place\/MermZen\/#([^"]+)"/;

  return html.replace(
    /<a\s[^>]*class="try-in-editor"[^>]*>[\s\S]*?<\/a>/g,
    match => {
      const hashMatch = match.match(MERMZEN_HASH_RE);
      if (!hashMatch) return match;
      const hash = hashMatch[1];
      const iframeLabel = lang === 'zh' ? '图表预览（手绘风格）' : 'Diagram preview (hand-drawn)';
      const iframe = `<div class="diagram-preview">\n  <iframe\n    src="${embedPath}#${hash}"\n    title="${iframeLabel}"\n    loading="lazy"\n    scrolling="no"\n  ></iframe>\n</div>\n`;
      return iframe + match;
    }
  );
}

// 将模板中的占位符替换为实际内容
function applyTemplate(template, vars) {
  return template.replace(/\$(\w+)\$/g, (_, key) => vars[key] ?? '');
}

// 构建单个语言的所有文章
function buildLang(lang) {
  const postsDir = path.join(ROOT, 'blog', lang, 'posts');
  const outDir = path.join(ROOT, 'blog', lang);
  const templateFile = path.join(ROOT, 'blog', `_template-${lang}.html`);

  if (!fs.existsSync(postsDir)) {
    console.warn(`  ⚠ posts dir not found: ${postsDir}`);
    return;
  }
  if (!fs.existsSync(templateFile)) {
    console.warn(`  ⚠ template not found: ${templateFile}`);
    return;
  }

  const template = fs.readFileSync(templateFile, 'utf-8');
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const slug = file.replace('.md', '');
    const source = fs.readFileSync(path.join(postsDir, file), 'utf-8');
    const { meta, body } = parseFrontmatter(source);

    // 转换 Markdown → HTML（marked 默认会直接透传原始 HTML 标签）
    let bodyHTML = marked.parse(body, { gfm: true, breaks: false });

    // 在每个示例后注入 iframe 预览
    bodyHTML = injectIframePreviews(bodyHTML, lang);

    const outHTML = applyTemplate(template, {
      title: meta.title || slug,
      description: meta.description || '',
      date: meta.date || '',
      slug,
      body: bodyHTML,
    });

    const outPath = path.join(outDir, `${slug}.html`);
    fs.writeFileSync(outPath, outHTML, 'utf-8');
    console.log(`  ✓ [${lang}] ${slug}.html`);
  }
}

console.log('Building blog posts...');
buildLang('zh');
buildLang('en');
console.log('\nDone! Blog HTML files generated.');
