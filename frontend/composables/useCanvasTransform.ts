import { computed, ref } from "vue";
import type { StudioCanvasItem } from "~/types/canvas";

/**
 * 自由キャンバスのパン / ズーム状態。
 *
 * 座標はすべてワールド座標（キャンバス内の絶対座標）で扱う。
 * transform は `translate3d(pan) scale(zoom)` / origin 0 0 の 1 枚だけで、
 * 要素側はワールド座標をそのまま left/top に持つ。これにより
 * ズーム中も線幅やテキストが再レイアウトされず、描画が破綻しない。
 */
export function useCanvasTransform(options?: { minZoom?: number; maxZoom?: number }) {
  const minZoom = options?.minZoom ?? 0.1;
  const maxZoom = options?.maxZoom ?? 6;

  const panX = ref(0);
  const panY = ref(0);
  const zoom = ref(1);

  const transformStyle = computed(() => ({
    transform: `translate3d(${panX.value}px, ${panY.value}px, 0) scale(${zoom.value})`,
    transformOrigin: "0 0",
  }));

  /** 画面座標 → ワールド座標。rect はキャンバスコンテナの getBoundingClientRect()。 */
  function screenToWorld(clientX: number, clientY: number, rect: DOMRect) {
    return {
      x: (clientX - rect.left - panX.value) / zoom.value,
      y: (clientY - rect.top - panY.value) / zoom.value,
    };
  }

  /** ポインタ位置を固定したまま拡大縮小する。 */
  function zoomAt(clientX: number, clientY: number, rect: DOMRect, factor: number) {
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const prev = zoom.value;
    const next = Math.min(maxZoom, Math.max(minZoom, prev * factor));
    if (next === prev) return;
    // ポインタ下のワールド座標が同じ画面位置に留まるように pan を逆算する。
    const worldX = (mouseX - panX.value) / prev;
    const worldY = (mouseY - panY.value) / prev;
    panX.value = mouseX - worldX * next;
    panY.value = mouseY - worldY * next;
    zoom.value = next;
  }

  /** 画面中央を基準にした相対ズーム（ツールバーの + / - 用）。 */
  function zoomBy(factor: number, rect?: DOMRect) {
    if (!rect) {
      zoom.value = Math.min(maxZoom, Math.max(minZoom, zoom.value * factor));
      return;
    }
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, rect, factor);
  }

  function panBy(dx: number, dy: number) {
    panX.value += dx;
    panY.value += dy;
  }

  /** 全要素が画面に収まるビューポートへ移動する。 */
  function fitToItems(items: StudioCanvasItem[], rect: DOMRect, padding = 72) {
    if (!items.length || !rect.width || !rect.height) {
      resetView(rect);
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const item of items) {
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + item.width);
      maxY = Math.max(maxY, item.y + item.height);
    }
    const boxW = Math.max(1, maxX - minX);
    const boxH = Math.max(1, maxY - minY);
    const pad = Math.min(padding, Math.min(rect.width, rect.height) * 0.15);
    const availW = Math.max(1, rect.width - pad * 2);
    const availH = Math.max(1, rect.height - pad * 2);
    const next = Math.min(2, Math.max(minZoom, Math.min(availW / boxW, availH / boxH)));
    zoom.value = next;
    panX.value = rect.width / 2 - (minX + boxW / 2) * next;
    panY.value = rect.height / 2 - (minY + boxH / 2) * next;
  }

  /** 100% に戻し、ワールド原点を画面の 1/4 位置へ置く。 */
  function resetView(rect?: DOMRect) {
    zoom.value = 1;
    panX.value = rect ? rect.width / 4 : 120;
    panY.value = rect ? rect.height / 6 : 80;
  }

  function setViewport(next: { panX: number; panY: number; zoom: number }) {
    panX.value = Number.isFinite(next.panX) ? next.panX : 0;
    panY.value = Number.isFinite(next.panY) ? next.panY : 0;
    zoom.value = Math.min(maxZoom, Math.max(minZoom, Number.isFinite(next.zoom) ? next.zoom : 1));
  }

  return {
    panX,
    panY,
    zoom,
    minZoom,
    maxZoom,
    transformStyle,
    screenToWorld,
    zoomAt,
    zoomBy,
    panBy,
    fitToItems,
    resetView,
    setViewport,
  };
}
