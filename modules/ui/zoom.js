import { dom } from '../dom.js';
import { pz, MIN_SCALE, MAX_SCALE } from '../store.js';

// ── 缩放和平移逻辑 ──────────────────────────────────────────────────────

/**
 * 应用当前的变换（缩放和平移）到预览元素
 */
export function applyTransform() {
  dom.preview.style.transform = 'translate(' + pz.tx + 'px,' + pz.ty + 'px) scale(' + pz.scale + ')';
  dom.zoomLabel.textContent = Math.round(pz.scale * 100) + '%';
}

/**
 * 缩放到指定比例，并以指定点为中心（默认为视口中心）
 * @param {number} newScale - 新的缩放比例
 * @param {number} [cx] - 中心点 X 坐标
 * @param {number} [cy] - 中心点 Y 坐标
 */
export function zoomTo(newScale, cx, cy) {
  newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
  if (cx === undefined) {
    cx = dom.previewViewport.clientWidth / 2;
    cy = dom.previewViewport.clientHeight / 2;
  }
  pz.tx = cx - (cx - pz.tx) * (newScale / pz.scale);
  pz.ty = cy - (cy - pz.ty) * (newScale / pz.scale);
  pz.scale = newScale;
  applyTransform();
}

/**
 * 重置视图到初始状态
 */
export function resetView() {
  pz.scale = 1; pz.tx = 0; pz.ty = 0;
  applyTransform();
}
