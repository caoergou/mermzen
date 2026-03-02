import { state, dom, escapeHtml, setRenderStatus, getHandDrawnFontFamily, getHandDrawnFontSizePx, resolveHandDrawnSeed, HAND_FONTS, getExportBgColor } from './core.js';
import { STRINGS } from './i18n.js';
import { getCode, clearDiagnostics, pushDiagnosticFromError, scrollToLine } from './editor.js';

// ── Mermaid initialization ──────────────────────────────────────────
const NORMAL_FONT = "system-ui, -apple-system, sans-serif";

export function initMermaid() {
  const hdFont = getHandDrawnFontFamily();
  const hdSize = getHandDrawnFontSizePx();
  mermaid.initialize({
    startOnLoad: false,
    theme: state.currentTheme,
    look: state.handDrawn ? 'handDrawn' : 'classic',
    securityLevel: 'loose',
    handDrawnSeed: resolveHandDrawnSeed(),
    themeVariables: {
      fontFamily: state.handDrawn ? hdFont : NORMAL_FONT,
      fontSize: state.handDrawn ? hdSize : '14px',
    },
  });
  dom.preview.style.fontFamily = state.handDrawn ? hdFont : '';
  if (state.handDrawn) {
    document.documentElement.style.setProperty('--mermaid-font', hdFont);
  } else {
    document.documentElement.style.removeProperty('--mermaid-font');
  }
}

export async function renderDiagram() {
  const code = getCode().trim();
  if (!code) {
    dom.preview.innerHTML = '<p class="placeholder">' + STRINGS[state.currentLang].placeholderMain + '</p>';
    setRenderStatus('', '');
    clearDiagnostics();
    return;
  }
  setRenderStatus('rendering', STRINGS[state.currentLang].renderingStatus);

  const noHandDrawn = /^\s*(classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap|timeline|xychart|architecture|block-beta|gitGraph)/i.test(code);
  if (dom.handDrawnBtn) {
    if (state.handDrawn && noHandDrawn) {
      dom.handDrawnBtn.title = '此图类型不支持手绘风格 / Not supported for this diagram type';
      dom.handDrawnBtn.style.opacity = '0.5';
    } else {
      dom.handDrawnBtn.title = '手绘风格 (Hand-drawn style)';
      dom.handDrawnBtn.style.opacity = '';
    }
  }

  const hdFont = getHandDrawnFontFamily();
  const hdSize = getHandDrawnFontSizePx();
  mermaid.initialize({
    startOnLoad: false,
    theme: state.currentTheme,
    look: (state.handDrawn && !noHandDrawn) ? 'handDrawn' : 'classic',
    securityLevel: 'loose',
    handDrawnSeed: resolveHandDrawnSeed(),
    themeVariables: {
      fontFamily: state.handDrawn ? hdFont : NORMAL_FONT,
      fontSize: state.handDrawn ? hdSize : '14px',
    },
  });

  if (state.handDrawn && !noHandDrawn) {
    document.documentElement.style.setProperty('--mermaid-font', hdFont);
    const preset = HAND_FONTS[state.handDrawnFont] || HAND_FONTS.virgil;
    try { await document.fonts.load('16px ' + (preset.label === 'Virgil' ? 'Virgil' : preset.label)); } catch (e) {}
    try { await document.fonts.load('16px "Xiaolai SC"'); } catch (e) {}
  } else {
    document.documentElement.style.removeProperty('--mermaid-font');
  }

  try {
    await mermaid.parse(code);
  } catch (parseErr) {
    handleRenderError(parseErr, code);
    return;
  }

  try {
    state.renderCounter++;
    const id = 'mermaid-diagram-' + state.renderCounter;
    const result = await mermaid.render(id, code);
    dom.preview.innerHTML = result.svg;
    setRenderStatus('ok', STRINGS[state.currentLang].renderOk);
    clearDiagnostics();
    setTimeout(() => { setRenderStatus('', ''); }, 1500);
  } catch (err) {
    handleRenderError(err, code);
  }
}

// ── Error handling ───────────────────────────────────────────────────

function extractErrorLine(err) {
  const msg = err.message || String(err);
  const lineMatch = msg.match(/line\s+(\d+)/i);
  if (lineMatch) return parseInt(lineMatch[1], 10);
  if (err.hash && err.hash.line != null) return err.hash.line + 1;
  return null;
}

function getFriendlyHint(msg, lang) {
  const lower = msg.toLowerCase();
  if (lang === 'zh') {
    if (/expecting/i.test(msg) && /got.*eof/i.test(msg)) return '代码可能不完整，请检查是否有未闭合的括号或缺少 end 关键字';
    if (/unknown diagram type/i.test(msg)) return '未知的图表类型，支持的类型包括：graph, sequenceDiagram, classDiagram, gantt, pie, mindmap 等';
    if (/expecting.*['"](-->|---|===)/i.test(msg) || /invalid arrow/i.test(lower)) return '箭头语法错误，常见格式：-->, ---, ===>, -.->，请检查连接线格式';
    if (/unterminated/i.test(msg) || /unclosed/i.test(lower)) return '存在未闭合的引号、括号或代码块';
    if (/participant/i.test(msg)) return '时序图参与者声明有误，格式：participant 名称';
    if (/subgraph/i.test(msg)) return 'subgraph 块语法有误，确保每个 subgraph 都有对应的 end';
    return '请检查语法是否正确，可参考示例下拉菜单中的模板';
  }
  if (/expecting/i.test(msg) && /got.*eof/i.test(msg)) return 'Code appears incomplete. Check for unclosed brackets or missing "end" keywords.';
  if (/unknown diagram type/i.test(msg)) return 'Unknown diagram type. Supported types: graph, sequenceDiagram, classDiagram, gantt, pie, mindmap, etc.';
  if (/expecting.*['"](-->|---|===)/i.test(msg) || /invalid arrow/i.test(lower)) return 'Arrow syntax error. Common formats: -->, ---, ===>, -.->';
  if (/unterminated/i.test(msg) || /unclosed/i.test(lower)) return 'Unterminated string, bracket, or code block detected.';
  if (/participant/i.test(msg)) return 'Participant declaration error. Format: participant Name';
  if (/subgraph/i.test(msg)) return 'Subgraph syntax error. Each subgraph needs a matching "end".';
  return 'Check your syntax. See Help for example templates.';
}

function handleRenderError(err, code) {
  const msg = err.message || String(err);
  const errLine = extractErrorLine(err);
  const s = STRINGS[state.currentLang];
  const lineHint = errLine
    ? '<button class="error-banner__line error-banner__goto" data-line="' + errLine + '">' + s.errorLine.replace('{n}', errLine) + '</button>'
    : '';
  const friendlyHint = getFriendlyHint(msg, state.currentLang);
  dom.preview.innerHTML =
    '<div class="error-banner">' +
      '<div class="error-banner__header">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
        '<span>' + s.errorSyntax + '</span>' +
        lineHint +
        '<button class="error-banner__close" title="' + s.errorDismiss + '" onclick="this.closest(\'.error-banner\').remove()">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</div>' +
      '<pre class="error-banner__msg">' + escapeHtml(msg) + '</pre>' +
      '<div class="error-banner__hint">' + escapeHtml(friendlyHint) + '</div>' +
      '<div class="error-banner__tip">' + s.errorTip + '</div>' +
    '</div>';

  const gotoBtn = dom.preview.querySelector('.error-banner__goto');
  if (gotoBtn) {
    gotoBtn.addEventListener('click', () => {
      scrollToLine(parseInt(gotoBtn.getAttribute('data-line'), 10));
    });
  }

  setRenderStatus('error', s.renderError);
  pushDiagnosticFromError(msg, err);
}

// ── SVG font inlining ───────────────────────────────────────────────
const fontDataCache = {};

// ── Xiaolai SC (小赖字体) subset embedding ────────────────────────────
const XIAOLAI_CSS_URL = 'https://cdn.jsdelivr.net/npm/@chinese-fonts/xiaolai@3.0.0/dist/Xiaolai/result.css';
let _xiaolaiRules = null;

async function fetchXiaolaiRules() {
  if (_xiaolaiRules !== null) return _xiaolaiRules;
  try {
    const resp = await fetch(XIAOLAI_CSS_URL, { cache: 'force-cache' });
    if (!resp.ok) { _xiaolaiRules = []; return []; }
    const css = await resp.text();
    const rules = [];
    const re = /@font-face\s*\{([^}]+)\}/g;
    let m;
    while ((m = re.exec(css)) !== null) {
      const block = m[1];
      const srcM = block.match(/src:[^;]*url\(['"]?([^'")\s]+)['"]?\)/i);
      const ucrM = block.match(/unicode-range:\s*([^;]+)/i);
      if (srcM && ucrM) {
        const absUrl = new URL(srcM[1], XIAOLAI_CSS_URL).href;
        rules.push({ url: absUrl, unicodeRange: ucrM[1].trim() });
      }
    }
    _xiaolaiRules = rules;
    return rules;
  } catch (e) {
    _xiaolaiRules = [];
    return [];
  }
}

function codePointInUnicodeRange(cp, rangeStr) {
  for (const part of rangeStr.split(',')) {
    const r = part.trim();
    if (!/^[Uu]\+/.test(r)) continue;
    const hex = r.slice(2);
    if (hex.includes('-')) {
      const [lo, hi] = hex.split('-').map(h => parseInt(h, 16));
      if (cp >= lo && cp <= hi) return true;
    } else if (hex.includes('?')) {
      const lo = parseInt(hex.replace(/\?/g, '0'), 16);
      const hi = parseInt(hex.replace(/\?/g, 'F'), 16);
      if (cp >= lo && cp <= hi) return true;
    } else {
      if (cp === parseInt(hex, 16)) return true;
    }
  }
  return false;
}

async function buildXiaolaiCssForSvg(svgEl) {
  // Extract all text from the SVG to find needed characters
  const textContent = Array.from(svgEl.querySelectorAll('text, tspan, foreignObject'))
    .map(el => el.textContent).join('');

  // Collect non-ASCII code points that need the Chinese font
  const neededCps = new Set();
  for (const ch of textContent) {
    const cp = ch.codePointAt(0);
    if (cp > 127) neededCps.add(cp);
  }
  if (!neededCps.size) return '';

  const rules = await fetchXiaolaiRules();
  if (!rules.length) return '';

  // Find which font chunks cover the needed characters
  const neededRules = [];
  for (const rule of rules) {
    for (const cp of neededCps) {
      if (codePointInUnicodeRange(cp, rule.unicodeRange)) {
        neededRules.push(rule);
        break;
      }
    }
  }
  if (!neededRules.length) return '';

  // Fetch and embed only the needed font chunks (with unicode-range so browser uses them correctly)
  let css = '';
  for (const { url, unicodeRange } of neededRules) {
    const dataUri = await fetchFontAsBase64(url);
    if (dataUri) {
      css += "@font-face { font-family: 'Xiaolai SC'; src: url('" + dataUri + "') format('woff2'); unicode-range: " + unicodeRange + "; font-display: swap; }\n";
    }
  }
  return css;
}

async function fetchFontAsBase64(url) {
  if (fontDataCache[url]) return fontDataCache[url];
  try {
    const resp = await fetch(url, { mode: 'cors', cache: 'force-cache' });
    if (!resp.ok) { console.warn('Font fetch failed:', url, resp.status); return null; }
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const b64 = btoa(binary).replace(/\s/g, '');
    const mime = url.endsWith('.woff2') ? 'font/woff2'
      : url.endsWith('.woff') ? 'font/woff'
      : url.endsWith('.ttf') ? 'font/ttf' : 'font/truetype';
    const dataUri = 'data:' + mime + ';base64,' + b64;
    fontDataCache[url] = dataUri;
    return dataUri;
  } catch (e) {
    console.warn('Font fetch error:', url, e.message);
    return null;
  }
}

async function fetchWoff2UrlFromCss(cssUrl) {
  try {
    const resp = await fetch(cssUrl);
    if (!resp.ok) return null;
    const css = await resp.text();
    // Prefer the latin subset; fall back to the first woff2 found
    const latinBlock = css.match(/\/\* latin \*\/[\s\S]*?src:[^;]*url\(['"]?(https?:\/\/[^'"')]+\.woff2)['"]?\)/);
    if (latinBlock) return latinBlock[1];
    const anyBlock = css.match(/src:[^;]*url\(['"]?(https?:\/\/[^'"')]+\.woff2)['"]?\)/);
    return anyBlock ? anyBlock[1] : null;
  } catch (e) { return null; }
}

async function buildInlineFontCss() {
  if (!state.handDrawn) return '';
  const preset = HAND_FONTS[state.handDrawnFont] || HAND_FONTS.virgil;
  let fontUrl = preset.url;
  if (!fontUrl && preset.cssUrl) {
    fontUrl = await fetchWoff2UrlFromCss(preset.cssUrl);
  }
  if (!fontUrl) return '';
  try {
    const dataUri = await fetchFontAsBase64(fontUrl);
    if (!dataUri) return '';
    return "@font-face { font-family: '" + preset.label + "'; src: url('" + dataUri + "') format('woff2'); font-display: swap; }";
  } catch (e) { return ''; }
}

export async function inlineFontsIntoSvg(svgEl) {
  const clone = svgEl.cloneNode(true);
  const images = clone.querySelectorAll('image');
  for (let i = images.length - 1; i >= 0; i--) images[i].parentNode.removeChild(images[i]);

  const styleEls = clone.querySelectorAll('style');
  for (const s of styleEls) {
    s.textContent = s.textContent.replace(/url\(['"]?(https?:\/\/[^'")]+)['"]?\)/g, '');
  }

  if (state.handDrawn) {
    // Embed both the hand-drawn preset font AND Xiaolai SC (Chinese) in parallel
    const [fontCss, xiaolaiCss] = await Promise.all([
      buildInlineFontCss(),
      buildXiaolaiCssForSvg(svgEl),
    ]);
    const combinedCss = [fontCss, xiaolaiCss].filter(Boolean).join('\n');
    if (combinedCss) {
      const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleEl.textContent = combinedCss;
      clone.insertBefore(styleEl, clone.firstChild);
    }
  }
  return clone;
}

// ── SVG to PNG conversion ───────────────────────────────────────────
export function svgToPngBlob(svgEl, scale) {
  scale = scale || 4;
  return new Promise((resolve, reject) => {
    inlineFontsIntoSvg(svgEl).then(cloned => {
      const images = cloned.querySelectorAll('image');
      for (let i = images.length - 1; i >= 0; i--) images[i].parentNode.removeChild(images[i]);

      const styleEls = cloned.querySelectorAll('style');
      styleEls.forEach(el => {
        el.textContent = el.textContent.replace(/url\(['"]?(https?:\/\/[^'")]+)['"]?\)/g, '');
      });

      const svgData = new XMLSerializer().serializeToString(cloned);
      // Use natural SVG dimensions (not affected by zoom/pan transforms on parent)
      let width, height;
      try {
        const vb = svgEl.viewBox.baseVal;
        if (vb && vb.width > 0 && vb.height > 0) { width = vb.width; height = vb.height; }
      } catch (e) {}
      if (!width || !height) {
        width = parseFloat(svgEl.getAttribute('width')) || 0;
        height = parseFloat(svgEl.getAttribute('height')) || 0;
      }
      if (!width || !height) {
        const bbox = svgEl.getBoundingClientRect();
        width = bbox.width || 800;
        height = bbox.height || 600;
      }
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        const bg = getExportBgColor();
        if (bg !== 'transparent') {
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        try {
          canvas.toBlob(blob => {
            blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'));
          }, 'image/png');
        } catch (e) {
          console.warn('Canvas toBlob failed (tainted), using fallback');
          try {
            const dataURL = canvas.toDataURL('image/png');
            const byteString = atob(dataURL.split(',')[1]);
            const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let j = 0; j < byteString.length; j++) ia[j] = byteString.charCodeAt(j);
            resolve(new Blob([ab], { type: mimeString }));
          } catch (fallbackErr) { reject(fallbackErr); }
        }
      };
      img.onerror = e => { URL.revokeObjectURL(url); console.error('Image load error', e); reject(new Error('Failed to load SVG')); };
      img.src = url;
    }).catch(reject);
  });
}
