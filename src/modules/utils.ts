import { dom } from './dom';
import { state } from './store';

// ── 通用工具函数 ───────────────────────────────────────────────

/**
 * 转义 HTML 字符串以防止 XSS
 */
export function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/**
 * 显示 Toast 提示消息
 */
export function showToast(message: string): void {
  dom.toast.textContent = message;
  dom.toast.classList.add('show');
  clearTimeout(state.toastTimeout);
  state.toastTimeout = setTimeout(() => { dom.toast.classList.remove('show'); }, 2200);
}

/**
 * 更新编辑器状态栏（行数和字符数）
 */
export function updateEditorStatus(): void {
  const val = state.editorView ? state.editorView.state.doc.toString() : '';
  const lines = val ? val.split('\n').length : 0;
  dom.editorStatus.textContent = state.currentLang === 'zh'
    ? lines + ' 行 · ' + val.length + ' 字符'
    : lines + ' lines · ' + val.length + ' chars';
}

/**
 * 设置渲染状态指示器
 * @param {string} s - 状态类名 (rendering, ok, error)
 * @param {string} text - 显示的文本
 */
export function setRenderStatus(s: string, text: string): void {
  dom.renderStatus.textContent = text || '';
  dom.renderStatus.className = 'render-status' + (s ? ' visible ' + s : '');
}

/**
 * 按钮点击成功反馈动画
 */
export function btnSuccess(btn: HTMLElement): void {
  btn.classList.add('success');
  setTimeout(() => { btn.classList.remove('success'); }, 1200);
}

/**
 * 触发文件下载
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 打开帮助模态框
 */
export function openHelp(): void {
  if (dom.helpModal) dom.helpModal.classList.add('open');
}

/**
 * 关闭帮助模态框
 */
export function closeHelp(): void {
  if (dom.helpModal) dom.helpModal.classList.remove('open');
}
