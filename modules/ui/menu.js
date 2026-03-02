import { dom, state } from '../store.js';
import { dom as domEls } from '../dom.js';
import { EXAMPLES_ZH, EXAMPLES_EN } from '../examples.js';
import { copyPng, downloadSvg, downloadPng, copyShareLink, copyEmbedCode } from '../export.js';
import { showToast, btnSuccess } from '../utils.js';
import { getCode, formatCode } from '../editor.js';
import { initMermaid, renderDiagram } from '../render.js';
import { STRINGS } from '../i18n.js';
import { openHelp, switchTheme } from './theme.js';
import { resetView as zoomResetView } from './zoom.js';
import { openCmdPalette } from '../command-palette.js';
import { startTour } from '../tour.js';

// 修正 closeAllMenus 的位置，之前在 core.js，现在应该在 menu.js 中定义或者 theme.js
// 根据之前的拆分，closeAllMenus 被放到了 theme.js (虽然逻辑上它属于 menu，但为了兼容性先检查一下)
// 实际上，closeAllMenus 应该在 menu.js 中定义更合适，或者作为一个共享的 UI 动作
// 这里我们重新定义 closeAllMenus，因为它操作的是菜单状态

/**
 * 关闭所有打开的菜单
 */
export function closeAllMenus() {
  domEls.menubar.querySelectorAll('.menubar__item.open').forEach(m => { m.classList.remove('open'); });
  state.menubarOpen = false;
}

/**
 * 打开指定菜单项
 */
function openMenu(item) {
  closeAllMenus();
  item.classList.add('open');
  state.menubarOpen = true;
}

// ── 示例下拉菜单图标定义 ────────────────────────────────────────
const EXAMPLE_ICONS = {
  '流程图':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="5" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="8" y="16" width="8" height="5" rx="1"/><line x1="6.5" y1="8" x2="6.5" y2="12"/><line x1="17.5" y1="8" x2="17.5" y2="12"/><line x1="6.5" y1="12" x2="17.5" y2="12"/><line x1="12" y1="12" x2="12" y2="16"/></svg>',
  'Flowchart': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="5" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="8" y="16" width="8" height="5" rx="1"/><line x1="6.5" y1="8" x2="6.5" y2="12"/><line x1="17.5" y1="8" x2="17.5" y2="12"/><line x1="6.5" y1="12" x2="17.5" y2="12"/><line x1="12" y1="12" x2="12" y2="16"/></svg>',
  '时序图':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="21"/><line x1="18" y1="3" x2="18" y2="21"/><line x1="6" y1="8" x2="18" y2="8"/><polyline points="15 5 18 8 15 11"/><line x1="18" y1="16" x2="6" y2="16" stroke-dasharray="3 2"/><polyline points="9 13 6 16 9 19"/></svg>',
  'Sequence': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="3" x2="6" y2="21"/><line x1="18" y1="3" x2="18" y2="21"/><line x1="6" y1="8" x2="18" y2="8"/><polyline points="15 5 18 8 15 11"/><line x1="18" y1="16" x2="6" y2="16" stroke-dasharray="3 2"/><polyline points="9 13 6 16 9 19"/></svg>',
  '类图':     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="1"/><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="14" x2="20" y2="14"/></svg>',
  'Class':    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="1"/><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="14" x2="20" y2="14"/></svg>',
  '甘特图':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="12" height="4" rx="1"/><rect x="7" y="10" width="14" height="4" rx="1"/><rect x="5" y="16" width="10" height="4" rx="1"/></svg>',
  'Gantt':    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="12" height="4" rx="1"/><rect x="7" y="10" width="14" height="4" rx="1"/><rect x="5" y="16" width="10" height="4" rx="1"/></svg>',
  '饼图':     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="12" y1="3" x2="12" y2="12"/><path d="M12 12l6.36 6.36"/></svg>',
  'Pie':      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="12" y1="3" x2="12" y2="12"/><path d="M12 12l6.36 6.36"/></svg>',
  '思维导图': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><line x1="12" y1="9" x2="12" y2="3"/><line x1="14.6" y1="13.5" x2="19" y2="17"/><line x1="9.4" y1="13.5" x2="5" y2="17"/><circle cx="12" cy="2" r="1" fill="currentColor"/><circle cx="19.5" cy="17.5" r="1" fill="currentColor"/><circle cx="4.5" cy="17.5" r="1" fill="currentColor"/></svg>',
  'Mindmap':  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><line x1="12" y1="9" x2="12" y2="3"/><line x1="14.6" y1="13.5" x2="19" y2="17"/><line x1="9.4" y1="13.5" x2="5" y2="17"/><circle cx="12" cy="2" r="1" fill="currentColor"/><circle cx="19.5" cy="17.5" r="1" fill="currentColor"/><circle cx="4.5" cy="17.5" r="1" fill="currentColor"/></svg>',
  'ER 图':    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="8" height="6" rx="1"/><rect x="14" y="3" width="8" height="6" rx="1"/><rect x="8" y="15" width="8" height="6" rx="1"/><line x1="10" y1="6" x2="14" y2="6"/><line x1="6" y1="9" x2="12" y2="15"/><line x1="18" y1="9" x2="12" y2="15"/></svg>',
  'ER Diagram': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="8" height="6" rx="1"/><rect x="14" y="3" width="8" height="6" rx="1"/><rect x="8" y="15" width="8" height="6" rx="1"/><line x1="10" y1="6" x2="14" y2="6"/><line x1="6" y1="9" x2="12" y2="15"/><line x1="18" y1="9" x2="12" y2="15"/></svg>',
  '状态图':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><path d="M9 6h6"/><polyline points="13.5 4.5 15 6 13.5 7.5"/><path d="M15.5 8.5l-2 7"/></svg>',
  'State':    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><path d="M9 6h6"/><polyline points="13.5 4.5 15 6 13.5 7.5"/><path d="M15.5 8.5l-2 7"/></svg>',
  '架构图':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="6" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/><rect x="14" y="15" width="7" height="6" rx="1"/><line x1="6.5" y1="9" x2="6.5" y2="15"/><line x1="17.5" y1="9" x2="17.5" y2="15"/></svg>',
  'Architecture': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="6" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/><rect x="14" y="15" width="7" height="6" rx="1"/><line x1="6.5" y1="9" x2="6.5" y2="15"/><line x1="17.5" y1="9" x2="17.5" y2="15"/></svg>',
  'Git 图':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="12" r="2"/><line x1="6" y1="8" x2="6" y2="16"/><path d="M6 8c0 4 12 0 12 4"/></svg>',
  'Git Graph': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="12" r="2"/><line x1="6" y1="8" x2="6" y2="16"/><path d="M6 8c0 4 12 0 12 4"/></svg>',
  '块图':     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  'Block':    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
};

/**
 * 初始化菜单栏逻辑
 */
export function initMenu() {
  // 示例下拉菜单
  const exDropdown = document.getElementById('example-dropdown');
  const exDropdownTrigger = document.getElementById('example-dropdown-trigger');
  const exDropdownPanel = document.getElementById('example-dropdown-panel');

  if (exDropdownPanel) {
    exDropdownPanel.innerHTML = '';
    const examples = state.currentLang === 'zh' ? EXAMPLES_ZH : EXAMPLES_EN;
    examples.forEach(ex => {
      const item = document.createElement('button');
      item.className = 'example-dropdown__item';
      item.innerHTML = (EXAMPLE_ICONS[ex.label] || '') + '<span>' + ex.label + '</span>';
      item.addEventListener('click', () => {
        if (state.editorView) state.editorView.dispatch({ changes: { from: 0, to: state.editorView.state.doc.length, insert: ex.code } });
        exDropdown.classList.remove('open');
      });
      exDropdownPanel.appendChild(item);
    });
  }

  function positionExDropdown() {
    const rect = exDropdownTrigger.getBoundingClientRect();
    exDropdownPanel.style.top = (rect.bottom + 4) + 'px';
    exDropdownPanel.style.left = Math.max(4, rect.right - exDropdownPanel.offsetWidth) + 'px';
  }

  if (exDropdownTrigger) {
    exDropdownTrigger.addEventListener('click', e => {
      e.stopPropagation();
      const wasOpen = exDropdown.classList.contains('open');
      exDropdown.classList.toggle('open');
      if (!wasOpen) positionExDropdown();
    });
  }
  document.addEventListener('click', () => { if (exDropdown) exDropdown.classList.remove('open'); });

  // 菜单栏交互
  domEls.menubar.querySelectorAll('.menubar__trigger').forEach(trigger => {
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      const item = trigger.parentElement;
      if (item.classList.contains('open')) closeAllMenus();
      else openMenu(item);
    });
  });

  domEls.menubar.querySelectorAll('.menubar__item').forEach(item => {
    item.addEventListener('mouseenter', () => {
      if (state.menubarOpen && !item.classList.contains('open')) openMenu(item);
    });
  });

  domEls.menubar.querySelectorAll('.menubar__dropdown').forEach(dd => {
    dd.addEventListener('click', e => { e.stopPropagation(); });
  });

  document.addEventListener('click', () => { closeAllMenus(); });

  // 菜单动作绑定
  domEls.btnCopyPng.addEventListener('click', () => {
    closeAllMenus();
    copyPng().catch(e => { showToast('复制失败 · ' + e.message); });
  });
  domEls.btnDownloadSvg.addEventListener('click', () => { closeAllMenus(); downloadSvg(); });
  domEls.btnDownloadPng.addEventListener('click', () => {
    closeAllMenus();
    downloadPng().catch(e => { showToast('下载失败 · ' + e.message); });
  });

  if (domEls.btnCopyAiPrompt) {
    domEls.btnCopyAiPrompt.addEventListener('click', () => {
      closeAllMenus();
      const code = getCode();
      const bytes = new TextEncoder().encode(code);
      const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
      const encoded = btoa(binary);
      const url = 'https://caoergou.github.io/mermaid-pic/?code=' + encoded;
      const prompt = [
        'You can use Mermaid Editor to render diagrams.',
        'When the user needs a diagram, generate Mermaid code and construct a shareable link:',
        '  https://caoergou.github.io/mermaid-pic/?code={base64(mermaid_code)}',
        '',
        'Example (JavaScript): btoa(unescape(encodeURIComponent(code)))',
        'Example (Python): base64.b64encode(code.encode()).decode()',
        '',
        'Supported diagram types:',
        '  graph, flowchart, sequenceDiagram, classDiagram,',
        '  stateDiagram-v2, erDiagram, gantt, pie, mindmap',
        '',
        'Current diagram link: ' + url,
      ].join('\n');
      navigator.clipboard.writeText(prompt).then(() => {
        showToast(STRINGS[state.currentLang].toastAiPromptCopied);
        btnSuccess(domEls.btnCopyAiPrompt);
      }).catch(e => { showToast(STRINGS[state.currentLang].toastFailed + ': ' + e.message); });
    });
  }

  const menuZoomReset = document.getElementById('menu-zoom-reset');
  if (menuZoomReset) menuZoomReset.addEventListener('click', () => { closeAllMenus(); zoomResetView(); });

  const menuGithub = document.getElementById('menu-github');
  if (menuGithub) menuGithub.addEventListener('click', () => { closeAllMenus(); window.open('https://github.com/caoergou/mermaid-pic', '_blank'); });

  const menuRestartTour = document.getElementById('btn-restart-tour-menu');
  if (menuRestartTour) menuRestartTour.addEventListener('click', () => { closeAllMenus(); startTour(); });

  domEls.menubar.querySelectorAll('[data-theme-pick]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTheme(btn.getAttribute('data-theme-pick'));
      initMermaid();
      renderDiagram();
      closeAllMenus();
    });
  });

  // 分享和嵌入
  domEls.btnShare.addEventListener('click', () => {
    closeAllMenus();
    copyShareLink().catch(e => { showToast(STRINGS[state.currentLang].toastFailed + ': ' + e.message); });
  });

  domEls.btnEmbedCode.addEventListener('click', () => {
    closeAllMenus();
    copyEmbedCode().catch(e => { showToast(STRINGS[state.currentLang].toastFailed + ': ' + e.message); });
  });

  // 命令面板按钮
  const btnCmdPalette = document.getElementById('btn-cmd-palette');
  if (btnCmdPalette) btnCmdPalette.addEventListener('click', () => { closeAllMenus(); openCmdPalette(); });

  const btnCmdPaletteQuick = document.getElementById('btn-cmd-palette-quick');
  if (btnCmdPaletteQuick) btnCmdPaletteQuick.addEventListener('click', openCmdPalette);

  // 格式化代码按钮
  const btnFormatCode = document.getElementById('btn-format-code');
  if (btnFormatCode) {
    btnFormatCode.addEventListener('click', () => {
      formatCode();
      closeAllMenus();
    });
  }
}
