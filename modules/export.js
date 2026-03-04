import { state } from './store.js';
import { dom } from './dom.js';
import { showToast, btnSuccess, downloadFile } from './utils.js';
import { STRINGS } from './i18n.js';
import { getCode } from './editor.js';
import { inlineFontsIntoSvg, svgToPngBlob } from './export-utils.js';

// ── 图表类型 → 中/英显示名（用于导出文件名）────────────────────────
const DIAGRAM_TYPE_NAMES = {
  flowchart: { zh: '流程图', en: 'Flowchart' },
  graph: { zh: '流程图', en: 'Flowchart' },
  sequenceDiagram: { zh: '时序图', en: 'Sequence Diagram' },
  classDiagram: { zh: '类图', en: 'Class Diagram' },
  stateDiagram: { zh: '状态图', en: 'State Diagram' },
  'stateDiagram-v2': { zh: '状态图', en: 'State Diagram' },
  erDiagram: { zh: 'ER图', en: 'ER Diagram' },
  gantt: { zh: '甘特图', en: 'Gantt' },
  pie: { zh: '饼图', en: 'Pie Chart' },
  journey: { zh: '用户旅程图', en: 'User Journey' },
  gitGraph: { zh: 'Git图', en: 'Git Graph' },
  mindmap: { zh: '思维导图', en: 'Mindmap' },
  timeline: { zh: '时间线', en: 'Timeline' },
  blockBeta: { zh: '块图', en: 'Block Diagram' },
  'block-beta': { zh: '块图', en: 'Block Diagram' },
  architectureBeta: { zh: '架构图', en: 'Architecture' },
  'architecture-beta': { zh: '架构图', en: 'Architecture' },
  quadrantChart: { zh: '象限图', en: 'Quadrant Chart' },
  'quadrant-chart': { zh: '象限图', en: 'Quadrant Chart' },
  xyChart: { zh: 'XY图', en: 'XY Chart' },
  'xy-chart': { zh: 'XY图', en: 'XY Chart' },
  requirementDiagram: { zh: '需求图', en: 'Requirement Diagram' },
  'requirement-diagram': { zh: '需求图', en: 'Requirement Diagram' },
  diagram: { zh: '图表', en: 'Diagram' },
};

/** 从代码首行取第一个词（跳过空行与 %% 注释） */
function getFirstWordFromCode(code) {
  if (!code || typeof code !== 'string') return '';
  const line = code.split('\n').find(l => {
    const t = l.trim();
    return t && !t.startsWith('%%');
  });
  return line ? line.trim().split(/\s+/)[0] || '' : '';
}

/**
 * 从 Mermaid 代码首行解析图表类型 key；未识别时返回 'diagram'
 */
function getDiagramTypeKey(code) {
  const first = getFirstWordFromCode(code);
  if (!first) return 'diagram';
  const key = first.toLowerCase();
  if (DIAGRAM_TYPE_NAMES[key]) return key;
  const keyAlt = key.replace(/-/g, '');
  for (const k of Object.keys(DIAGRAM_TYPE_NAMES)) {
    if (k.replace(/-/g, '') === keyAlt) return k;
  }
  return 'diagram';
}

/**
 * 生成导出文件名：类型名-日期时间.扩展名（紧凑无多余空格）
 */
function getExportFilename(ext) {
  const code = getCode();
  const key = getDiagramTypeKey(code);
  const names = DIAGRAM_TYPE_NAMES[key];
  const lang = state.currentLang === 'zh' ? 'zh' : 'en';
  let typeName = names ? (names[lang] || names.en) : '';
  if (!typeName) typeName = getFirstWordFromCode(code) || (lang === 'zh' ? '图表' : 'Diagram');
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const safe = (typeName.replace(/[/\\:*?"<>|\s]+/g, '-').replace(/-+/g, '-') || 'diagram').replace(/^-|-$/g, '');
  return `${safe}-${dateStr}.${ext.replace(/^\./, '')}`;
}

// ── 复制 / 下载 ─────────────────────────────────────────────────

/**
 * 复制 PNG 图片到剪贴板
 */
export async function copyPng() {
  const svgEl = dom.preview.querySelector('svg');
  if (!svgEl) { showToast(STRINGS[state.currentLang].toastNoDiagram); return; }
  const blob = await svgToPngBlob(svgEl);
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  showToast(STRINGS[state.currentLang].toastCopiedPng);
  btnSuccess(dom.btnCopyPng);
}

/**
 * 下载 SVG 文件
 */
export async function downloadSvg() {
  const svgEl = dom.preview.querySelector('svg');
  if (!svgEl) { showToast(STRINGS[state.currentLang].toastNoDiagram); return; }
  const cloned = await inlineFontsIntoSvg(svgEl);
  const blob = new Blob([new XMLSerializer().serializeToString(cloned)], { type: 'image/svg+xml' });
  downloadFile(blob, getExportFilename('svg'));
  showToast(STRINGS[state.currentLang].toastDownloadSvg);
}

/**
 * 下载 PNG 文件
 */
export async function downloadPng() {
  const svgEl = dom.preview.querySelector('svg');
  if (!svgEl) { showToast(STRINGS[state.currentLang].toastNoDiagram); return; }
  downloadFile(await svgToPngBlob(svgEl), getExportFilename('png'));
  showToast(STRINGS[state.currentLang].toastDownloadPng);
}

// ── URL 编码 (pako 压缩 + base64) ────────────────────────

/**
 * 编码代码字符串
 */
export function encodeCode(code) {
  const bytes = new TextEncoder().encode(code);
  const compressed = pako.deflate(bytes);
  let binary = '';
  for (let i = 0; i < compressed.length; i++) binary += String.fromCharCode(compressed[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * 解码代码字符串
 */
export function decodeCode(encoded) {
  encoded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (encoded.length % 4 !== 0) encoded += '=';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  try {
    return new TextDecoder().decode(pako.inflate(bytes));
  } catch (e1) {
    try {
      return new TextDecoder().decode(pako.inflateRaw(bytes));
    } catch (e2) {
      return new TextDecoder().decode(bytes);
    }
  }
}

/**
 * 获取 URL 查询参数中的代码
 */
export function getQueryCode() {
  try {
    const param = new URLSearchParams(location.search).get('code');
    if (!param) return null;
    return decodeCode(param);
  } catch (e) { return null; }
}

/**
 * 获取 URL Hash 中的代码
 */
export function getHashCode() {
  try {
    const hash = location.hash.slice(1);
    if (!hash) return null;
    return decodeCode(hash);
  } catch (e) { return null; }
}

/**
 * 更新 URL Hash
 */
export function updateHash(code) {
  const encoded = encodeCode(code);
  window.history.replaceState(null, '', '#' + encoded);
  try { localStorage.setItem('mermzen-code', code); } catch (e) {}
}

/**
 * 复制分享链接
 */
export async function copyShareLink() {
  updateHash(getCode());
  await navigator.clipboard.writeText(location.href);
  showToast(STRINGS[state.currentLang].toastLinkCopied);
  btnSuccess(dom.btnShare);
}

/**
 * 复制嵌入代码
 */
export async function copyEmbedCode() {
  const encoded = encodeCode(getCode());
  const embedUrl = location.origin + location.pathname.replace(/[^/]*$/, '') + 'embed.html#' + encoded;
  const embedCode = '<iframe src="' + embedUrl + '" width="100%" height="600" frameborder="0" style="border: none;" title="Mermaid Diagram"></iframe>';
  await navigator.clipboard.writeText(embedCode);
  showToast(STRINGS[state.currentLang].toastEmbedCopied);
  btnSuccess(dom.btnShare);
}
