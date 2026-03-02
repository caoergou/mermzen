import { state } from './modules/store.js';
import { updateEditorStatus, setRenderStatus } from './modules/utils.js';
import { applyUiTheme } from './modules/ui/theme.js';
import { applyI18n } from './modules/i18n.js';
import { DEFAULT_CODE } from './modules/examples.js';
import { createEditor, scheduleLint } from './modules/editor.js';
import { initMermaid, renderDiagram } from './modules/render.js';
import { getQueryCode, getHashCode, updateHash } from './modules/export.js';
import { startTour } from './modules/tour.js';
import { initMenu } from './modules/ui/menu.js';
import { initContextMenu } from './modules/ui/context-menu.js';
import { initLayout } from './modules/ui/layout.js';
import { initMobileUI, switchMobileTab } from './modules/ui/mobile.js';

// ── 初始化 UI 主题 ───────────────────────────────────────────────────
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
applyUiTheme(prefersDark.matches);

// ── 初始化各个 UI 模块 ──────────────────────────────────────────────
initMenu();
initContextMenu();
initLayout();
initMobileUI();

// ── 引导程序 ───────────────────────────────────────────────────────
function bootstrap() {
  if (typeof mermaid === 'undefined') {
    setTimeout(bootstrap, 50);
    return;
  }
  initMermaid();
  applyI18n();

  const savedCode = (() => { try { return localStorage.getItem('mermaid-editor-code'); } catch (e) { return null; } })();
  const initialCode = getQueryCode() || getHashCode() || savedCode || DEFAULT_CODE;

  createEditor(initialCode, doc => {
    updateEditorStatus();
    updateHash(doc);
    scheduleLint();
    setRenderStatus('rendering', '...');
    clearTimeout(state.renderTimeout);
    state.renderTimeout = setTimeout(renderDiagram, 300);
  });

  updateEditorStatus();
  renderDiagram();

  if (window.innerWidth <= 768) switchMobileTab('editor');
  if (!localStorage.getItem('mermaid-editor-tour-seen')) {
    setTimeout(startTour, 500);
  }
}

bootstrap();
