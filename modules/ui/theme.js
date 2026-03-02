import { dom } from '../dom.js';
import { state } from '../store.js';
import { initMermaid, renderDiagram } from '../render.js';
import { openHelp as openHelpUtil } from '../utils.js';

// ── UI 主题管理 ───────────────────────────────────────────────

/**
 * 应用 UI 主题（深色/浅色模式）
 * @param {boolean} dark - 是否为深色模式
 */
export function applyUiTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  dom.iconSun.style.display = dark ? 'none' : '';
  dom.iconMoon.style.display = dark ? '' : 'none';
  if (dom.iconSunQuick) dom.iconSunQuick.style.display = dark ? 'none' : '';
  if (dom.iconMoonQuick) dom.iconMoonQuick.style.display = dark ? '' : 'none';
  dom.uiThemeToggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
  if (dom.uiThemeToggleQuick) dom.uiThemeToggleQuick.setAttribute('aria-pressed', dark ? 'true' : 'false');
}

/**
 * 切换 Mermaid 图表主题
 * @param {string} t - 主题名称 (default, forest, dark, neutral)
 */
export function switchTheme(t) {
  state.currentTheme = t;
  document.querySelectorAll('.theme-pill').forEach(p => {
    p.classList.remove('active');
    p.setAttribute('aria-checked', 'false');
  });
  const pill = document.querySelector('.theme-pill[data-theme="' + t + '"]');
  if (pill) { pill.classList.add('active'); pill.setAttribute('aria-checked', 'true'); }
  dom.themeSelect.value = t;
  dom.menubar.querySelectorAll('[data-theme-pick]').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-theme-pick') === t);
  });
}

/**
 * 切换预览区域背景
 * @param {string} value - 背景类型 (white, black, checker, grid)
 */
export function switchPreviewBg(value) {
  state.previewBg = value;
  dom.previewViewport.classList.remove('bg-white', 'bg-black', 'bg-checker', 'bg-grid');
  dom.previewViewport.classList.add('bg-' + value);
  document.querySelectorAll('.bg-pill').forEach(b => {
    const v = b.getAttribute('data-bg');
    b.classList.toggle('active', v === value);
    b.setAttribute('aria-checked', v === value ? 'true' : 'false');
  });
  dom.menubar.querySelectorAll('[data-bg-menu]').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-bg-menu') === value);
  });
}

/**
 * 获取导出时的背景颜色
 */
export function getExportBgColor() {
  switch (state.previewBg) {
    case 'black': return '#1a1a1a';
    case 'checker': return 'transparent';
    case 'grid': return '#ffffff';
    default: return '#ffffff';
  }
}

/**
 * 打开帮助模态框
 */
export function openHelp() {
  openHelpUtil();
}
