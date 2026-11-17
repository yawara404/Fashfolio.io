import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import type {
  CanvasBackdrop,
  StudioCanvasItem,
  StudioCanvasSnapshot,
} from "~/types/canvas";
import type { Garment } from "~/types/wardrobe";
import { scheduleCloudSync } from "~/utils/cloudStorage";

const STORAGE_KEY = "fashfolio-tryon-canvas-v1";
const SNAPSHOT_VERSION = 1;
/** 履歴はメモリ内だけで持つ。ページを離れたら undo 履歴は破棄する。 */
const HISTORY_LIMIT = 60;

/** 素体のワールドサイズ。head 数を変えても枠は動かさない。 */
export const MANNEQUIN_SIZE = { width: 320, height: 480 } as const;
/** 衣装カードのワールドサイズ。catalog SVG と同じ 240:260 比率に揃える。 */
export const GARMENT_SIZE = { width: 180, height: 195 } as const;
export const NOTE_SIZE = { width: 220, height: 132 } as const;
/** 整列・自動配置のときの要素間隔。 */
export const CANVAS_GAP = 32;

let sequence = 0;
function nextId(prefix: string) {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence}`;
}

function isFiniteBox(item: Partial<StudioCanvasItem>) {
  return (["x", "y", "width", "height", "rotation", "z"] as const).every((key) =>
    typeof item[key] === "number" && Number.isFinite(item[key]),
  ) && Number(item.width) > 0 && Number(item.height) > 0;
}

/**
 * tryon の自由キャンバスの状態。
 *
 * 衣装棚からドラッグして置いたカード・素体・メモをワールド座標で保持し、
 * 位置 / サイズ / 回転 / 重なり順の操作と undo・redo、localStorage への復元を担う。
 * コーデそのもの（selections / palette）は useWardrobe が持ち、
 * ここは「キャンバスに何をどう並べたか」だけを持つ。
 */
export const useStudioCanvas = defineStore("studio-canvas", () => {
  const items = ref<StudioCanvasItem[]>([]);
  const selectedIds = ref<string[]>([]);
  const backdrop = ref<CanvasBackdrop>("dots");

  const history = ref<StudioCanvasItem[][]>([[]]);
  const historyIndex = ref(0);
  const hasUnsavedChanges = ref(false);

  const selectedItems = computed(() =>
    items.value.filter((item) => selectedIds.value.includes(item.id)),
  );
  const topZ = computed(() =>
    items.value.reduce((max, item) => Math.max(max, item.z), 0),
  );
  const mannequin = computed(
    () => items.value.find((item) => item.kind === "mannequin") || null,
  );
  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(() => historyIndex.value < history.value.length - 1);

  function snapshot() {
    return items.value.map((item) => ({ ...item }));
  }

  function pruneSelection() {
    selectedIds.value = selectedIds.value.filter((id) =>
      items.value.some((item) => item.id === id),
    );
  }

  /** 操作の区切りで履歴を積む。同じ状態が続く場合は積まない。 */
  function commit() {
    const next = snapshot();
    const current = history.value[historyIndex.value];
    if (current && JSON.stringify(current) === JSON.stringify(next)) return;
    history.value = history.value.slice(0, historyIndex.value + 1);
    history.value.push(next);
    if (history.value.length > HISTORY_LIMIT) history.value.shift();
    historyIndex.value = history.value.length - 1;
    hasUnsavedChanges.value = true;
  }

  function replace(next: StudioCanvasItem[], record = true) {
    items.value = next.map((item) => ({ ...item }));
    pruneSelection();
    if (record) commit();
  }

  function step(index: number) {
    historyIndex.value = index;
    items.value = (history.value[index] || []).map((item) => ({ ...item }));
    pruneSelection();
    hasUnsavedChanges.value = true;
  }

  function undo() {
    if (!canUndo.value) return false;
    step(historyIndex.value - 1);
    return true;
  }

  function redo() {
    if (!canRedo.value) return false;
    step(historyIndex.value + 1);
    return true;
  }

  // ------------------------------------------------------------------
  // 選択・重なり順
  // ------------------------------------------------------------------
  function select(id: string | null, additive = false) {
    if (!id) {
      selectedIds.value = [];
      return;
    }
    if (additive) {
      selectedIds.value = selectedIds.value.includes(id)
        ? selectedIds.value.filter((value) => value !== id)
        : [...selectedIds.value, id];
      return;
    }
    selectedIds.value = [id];
  }

  function selectMany(ids: string[], additive = false) {
    selectedIds.value = additive
      ? [...new Set([...selectedIds.value, ...ids])]
      : [...ids];
  }

  function clearSelection() {
    selectedIds.value = [];
  }

  /** 最前面へ。選択が複数あっても z の相対順は崩さない。 */
  function bringToFront(ids: string[] = selectedIds.value) {
    if (!ids.length) return;
    const chosen = items.value
      .filter((item) => ids.includes(item.id))
      .sort((a, b) => a.z - b.z);
    const zIndexes = new Map(chosen.map((item, index) => [item.id, topZ.value + index + 1]));
    replace(
      items.value.map((item) =>
        zIndexes.has(item.id) ? { ...item, z: zIndexes.get(item.id)! } : item,
      ),
    );
  }

  function sendToBack(ids: string[] = selectedIds.value) {
    if (!ids.length) return;
    const chosen = items.value
      .filter((item) => ids.includes(item.id))
      .sort((a, b) => a.z - b.z);
    const floor = items.value
      .filter((item) => !ids.includes(item.id))
      .reduce((min, item) => Math.min(min, item.z), 1);
    const zIndexes = new Map(
      chosen.map((item, index) => [item.id, floor - chosen.length + index]),
    );
    replace(
      items.value.map((item) =>
        zIndexes.has(item.id) ? { ...item, z: zIndexes.get(item.id)! } : item,
      ),
    );
  }

  // ------------------------------------------------------------------
  // 追加
  // ------------------------------------------------------------------
  /** 既存要素と重ならないよう右下へずらして次の配置位置を決める。 */
  function nextPlacement(width: number, height: number, origin = { x: 0, y: 0 }) {
    let { x, y } = origin;
    for (let guard = 0; guard < 80; guard += 1) {
      const collides = items.value.some(
        (item) =>
          x < item.x + item.width &&
          x + width > item.x &&
          y < item.y + item.height &&
          y + height > item.y,
      );
      if (!collides) break;
      x += CANVAS_GAP;
      y += CANVAS_GAP;
    }
    return { x, y };
  }

  function addItem(
    partial: Partial<StudioCanvasItem> & { kind: StudioCanvasItem["kind"] },
  ) {
    const item: StudioCanvasItem = {
      id: partial.id || nextId(partial.kind),
      kind: partial.kind,
      x: partial.x ?? 0,
      y: partial.y ?? 0,
      width: partial.width ?? GARMENT_SIZE.width,
      height: partial.height ?? GARMENT_SIZE.height,
      rotation: partial.rotation ?? 0,
      z: partial.z ?? topZ.value + 1,
      label: partial.label ?? "",
      itemId: partial.itemId,
      text: partial.text,
      flipped: partial.flipped ?? false,
    };
    if (!isFiniteBox(item)) return null;
    replace([...items.value, item]);
    selectedIds.value = [item.id];
    return item;
  }

  /** 素体は 1 つだけ。既にあれば選択して返す。 */
  function ensureMannequin(origin = { x: 0, y: 0 }) {
    const existing = mannequin.value;
    if (existing) {
      selectedIds.value = [existing.id];
      return existing;
    }
    return addItem({
      kind: "mannequin",
      label: "キャラクター",
      width: MANNEQUIN_SIZE.width,
      height: MANNEQUIN_SIZE.height,
      ...origin,
    });
  }

  /** 衣装棚からドロップされたカード。同じ衣装は 1 枚に集約して前面へ出す。 */
  function placeGarment(garment: Garment, at?: { x: number; y: number }) {
    const existing = items.value.find(
      (item) => item.kind === "garment" && item.itemId === garment.id,
    );
    if (existing) {
      selectedIds.value = [existing.id];
      bringToFront([existing.id]);
      return existing;
    }
    const origin = at || nextPlacement(GARMENT_SIZE.width, GARMENT_SIZE.height);
    return addItem({
      kind: "garment",
      itemId: garment.id,
      label: garment.name,
      width: GARMENT_SIZE.width,
      height: GARMENT_SIZE.height,
      ...origin,
    });
  }

  function placeNote(text = "", at?: { x: number; y: number }) {
    const origin = at || nextPlacement(NOTE_SIZE.width, NOTE_SIZE.height);
    return addItem({
      kind: "note",
      label: "メモ",
      text,
      width: NOTE_SIZE.width,
      height: NOTE_SIZE.height,
      ...origin,
    });
  }

  function remove(ids: string[] = selectedIds.value) {
    if (!ids.length) return;
    replace(items.value.filter((item) => !ids.includes(item.id)));
    selectedIds.value = [];
  }


  // ------------------------------------------------------------------
  // 変形
  // ------------------------------------------------------------------
  function update(id: string, patch: Partial<StudioCanvasItem>, record = true) {
    const next = items.value.map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    );
    if (!next.every(isFiniteBox)) return;
    if (record) replace(next);
    else items.value = next;
  }

  /**
   * ドラッグ中は履歴を積まずに動かす。
   * ポインタを離したときに呼び出し側が commit() を 1 回だけ実行する。
   */
  function updateMany(patches: Record<string, Partial<StudioCanvasItem>>) {
    const next = items.value.map((item) =>
      patches[item.id] ? { ...item, ...patches[item.id] } : item,
    );
    if (!next.every(isFiniteBox)) return;
    items.value = next;
  }

  function setRotation(id: string, rotation: number) {
    const value = Number.isFinite(rotation) ? rotation : 0;
    // 0 / 90 / 180 / 270 附近はスナップして、きっちり水平を出しやすくする。
    const snapped = [0, 90, 180, 270, -90, -180, -270, 360].find(
      (angle) => Math.abs(angle - value) < 2.5,
    );
    update(id, { rotation: Math.round((snapped ?? value) * 10) / 10 });
  }

  function toggleFlip(id: string) {
    const item = items.value.find((value) => value.id === id);
    if (item) update(id, { flipped: !item.flipped });
  }

  function duplicate(ids: string[] = selectedIds.value) {
    if (!ids.length) return;
    const copies: StudioCanvasItem[] = [];
    for (const item of items.value) {
      if (!ids.includes(item.id) || item.kind === "mannequin") continue;
      copies.push({
        ...item,
        id: nextId(item.kind),
        x: item.x + 24,
        y: item.y + 24,
        z: topZ.value + copies.length + 1,
      });
    }
    if (!copies.length) return;
    replace([...items.value, ...copies]);
    selectedIds.value = copies.map((item) => item.id);
  }

  // ------------------------------------------------------------------
  // 整列
  // ------------------------------------------------------------------
  function orderedItems() {
    return [...items.value].sort(
      (a, b) => a.z - b.z || a.y - b.y || a.x - b.x,
    );
  }

  function boundsOf(list: StudioCanvasItem[]) {
    return list.reduce(
      (box, item) => ({
        left: Math.min(box.left, item.x),
        top: Math.min(box.top, item.y),
        right: Math.max(box.right, item.x + item.width),
        bottom: Math.max(box.bottom, item.y + item.height),
      }),
      { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
    );
  }

  /** 自動整列。RefLens と同じ grid / horizontal / vertical の 3 種類。 */
  function arrange(mode: "grid" | "horizontal" | "vertical") {
    const list = orderedItems();
    if (!list.length) return;
    const { left, top } = boundsOf(list);
    const placed: StudioCanvasItem[] = [];

    if (mode === "horizontal") {
      let cursor = left;
      for (const item of list) {
        placed.push({ ...item, x: cursor, y: top });
        cursor += item.width + CANVAS_GAP;
      }
    } else if (mode === "vertical") {
      let cursor = top;
      for (const item of list) {
        placed.push({ ...item, x: left, y: cursor });
        cursor += item.height + CANVAS_GAP;
      }
    } else {
      // グリッド: 列ごとに最大の幅、行ごとに最大の高さを測って詰める。
      const columns = Math.max(1, Math.ceil(Math.sqrt(list.length)));
      const rows = Math.ceil(list.length / columns);
      const columnWidth = Array.from({ length: columns }, (_, column) =>
        list
          .filter((_, index) => index % columns === column)
          .reduce((max, item) => Math.max(max, item.width), 0),
      );
      const rowHeight = Array.from({ length: rows }, (_, row) =>
        list
          .slice(row * columns, row * columns + columns)
          .reduce((max, item) => Math.max(max, item.height), 0),
      );
      list.forEach((item, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const offsetX = columnWidth
          .slice(0, column)
          .reduce((sum, width) => sum + width + CANVAS_GAP, 0);
        const offsetY = rowHeight
          .slice(0, row)
          .reduce((sum, height) => sum + height + CANVAS_GAP, 0);
        placed.push({ ...item, x: left + offsetX, y: top + offsetY });
      });
    }
    replace(placed);
  }

  /** 選択中の要素を揃える（2 件以上選択時のみ）。 */
  function align(mode: "left" | "center-x" | "right" | "top" | "center-y" | "bottom") {
    const list = selectedItems.value;
    if (list.length < 2) return;
    const { left, top, right, bottom } = boundsOf(list);
    const midX = (left + right) / 2;
    const midY = (top + bottom) / 2;
    replace(
      items.value.map((item) => {
        if (!selectedIds.value.includes(item.id)) return item;
        switch (mode) {
          case "left":
            return { ...item, x: left };
          case "right":
            return { ...item, x: right - item.width };
          case "center-x":
            return { ...item, x: midX - item.width / 2 };
          case "top":
            return { ...item, y: top };
          case "bottom":
            return { ...item, y: bottom - item.height };
          default:
            return { ...item, y: midY - item.height / 2 };
        }
      }),
    );
  }


  // ------------------------------------------------------------------
  // 永続化（このブラウザ内だけ。サーバーへは送らない）
  // ------------------------------------------------------------------
  function serialize(panX = 0, panY = 0, zoom = 1, viewportSize?: { width: number; height: number }): StudioCanvasSnapshot {
    return {
      version: SNAPSHOT_VERSION,
      items: snapshot(),
      viewport: { panX, panY, zoom },
      backdrop: backdrop.value,
      ...(viewportSize ? { viewportSize } : {}),
    };
  }

  function restore(raw: unknown) {
    try {
      const parsed = raw as StudioCanvasSnapshot | null;
      if (!parsed || parsed.version !== SNAPSHOT_VERSION || !Array.isArray(parsed.items)) return null;
      const seen = new Set<string>();
      items.value = parsed.items
        .slice(0, 300)
        .filter((item) => {
          if (!item || typeof item.id !== "string" || seen.has(item.id) ||
            !["mannequin", "garment", "note"].includes(item.kind) || !isFiniteBox(item)) return false;
          if (item.kind === "mannequin" && seen.has("__mannequin")) return false;
          if (item.kind === "mannequin") seen.add("__mannequin");
          seen.add(item.id);
          return true;
        })
        .map((item) => ({
          ...item,
          rotation: Number.isFinite(item.rotation) ? item.rotation : 0,
          flipped: Boolean(item.flipped),
        }));
      if (
        parsed.backdrop === "dots" ||
        parsed.backdrop === "grid" ||
        parsed.backdrop === "plain"
      ) {
        backdrop.value = parsed.backdrop;
      }
      selectedIds.value = [];
      history.value = [snapshot()];
      historyIndex.value = 0;
      hasUnsavedChanges.value = false;
      const viewport = parsed.viewport;
      return {
        viewportSize: parsed.viewportSize,
        viewport: {
          panX: Number(viewport?.panX) || 0,
          panY: Number(viewport?.panY) || 0,
          zoom: Number(viewport?.zoom) || 1,
        },
      };
    } catch {
      return null;
    }
  }

  function hydrate(storage?: Pick<Storage, "getItem">) {
    if (typeof window === "undefined") return null;
    const store = storage || window.localStorage;
    try {
      const raw = store.getItem(STORAGE_KEY);
      return raw ? restore(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  }

  function persist(panX = 0, panY = 0, zoom = 1, storage?: Pick<Storage, "setItem">, viewportSize?: { width: number; height: number }) {
    if (typeof window === "undefined") return;
    const store = storage || window.localStorage;
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(serialize(panX, panY, zoom, viewportSize)));
      scheduleCloudSync();
      hasUnsavedChanges.value = false;
    } catch {
      /* 保存できなくてもキャンバスはそのまま使える。 */
    }
  }

  function clear() {
    replace([]);
    selectedIds.value = [];
  }

  // 背景の切り替えも保存対象。要素は各操作で commit 済みなのでここでは触らない。
  watch(backdrop, () => {
    hasUnsavedChanges.value = true;
  });

  return {
    items,
    selectedIds,
    selectedItems,
    backdrop,
    mannequin,
    canUndo,
    canRedo,
    hasUnsavedChanges,
    topZ,
    select,
    selectMany,
    clearSelection,
    bringToFront,
    sendToBack,
    nextPlacement,
    addItem,
    ensureMannequin,
    placeGarment,
    placeNote,
    remove,
    update,
    updateMany,
    setRotation,
    toggleFlip,
    duplicate,
    arrange,
    align,
    commit,
    undo,
    redo,
    serialize,
    restore,
    hydrate,
    persist,
    clear,
  };
});

