<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useCanvasTransform } from "~/composables/useCanvasTransform";
import { useStudioCanvas } from "~/composables/useStudioCanvas";
import { useWardrobe } from "~/composables/useWardrobe";
import { catalogArtworkUrl } from "~/utils/catalogArtwork";
import { GARMENT_MIME } from "~/utils/canvasDnd";
import { cloudCanvasRevision } from "~/utils/cloudStorage";
import type { StudioCanvasItem } from "~/types/canvas";
import type { Garment } from "~/types/wardrobe";
import type { MannequinGender } from "~/types/avatar";
import type { PoseRender } from "~/types/poseRender";
import CanvasItem from "~/components/canvas/CanvasItem.vue";
import MannequinPreview from "~/components/MannequinPreview.vue";

/**
 * tryon の自由キャンバス本体。
 *
 * 操作系（RefLens の無限キャンバスと同じ作法）
 *   パン       : 空白ドラッグ / 中ボタン / Space + ドラッグ / 2本指
 *   ズーム     : Ctrl(Cmd) + ホイール / ピンチ / トラックパッドはホイール=ズーム
 *   範囲選択   : Shift + 空白ドラッグ
 *   要素移動   : 要素をドラッグ（複数選択時はまとめて移動）
 *   リサイズ   : 選択中の四隅ハンドル（衣装・素体は縦横比を維持）
 *   回転       : 選択中の上のハンドル
 *   追加       : 左の衣装棚からドラッグ＆ドロップ
 *   ショートカット: Delete / Ctrl+Z / Ctrl+Shift+Z / Ctrl+D / 矢印キー
 *
 * 座標はワールド座標で store に持ち、表示だけが scale(zoom) される。
 */
defineProps<{
  /** 素体の頭身（5 / 6 / 7） */
  heads: number;
  gender: MannequinGender;
  pose?: string;
  generatedOutfit?: PoseRender | null;
  /** 衣装を着せて描くか */
  dressed: boolean;
  /** 頭身ガイドを表示するか */
  guides: boolean;
}>();

const emit = defineEmits<{ "viewport-change": [] }>();

const canvas = useStudioCanvas();
const wardrobe = useWardrobe();
const containerRef = ref<HTMLDivElement | null>(null);
const mannequinPreview = ref<{ svg: SVGSVGElement | null }[]>([]);

const {
  panX,
  panY,
  zoom,
  transformStyle,
  screenToWorld,
  zoomAt,
  panBy,
  fitToItems,
  resetView,
  setViewport,
} = useCanvasTransform({ minZoom: 0.15, maxZoom: 6 });

// ------------------------------------------------------------------
// インタラクション状態
// ------------------------------------------------------------------
type DragMode = "none" | "pan" | "move" | "resize" | "rotate" | "box";
const mode = ref<DragMode>("none");
const spaceDown = ref(false);
const isTouchGesture = ref(false);
const boxStart = ref({ x: 0, y: 0 });
const boxCurrent = ref({ x: 0, y: 0 });

const pointers = new Map<number, { x: number; y: number }>();
let pinchDistance = 0;
let pinchZoom = 1;
let pinchAnchor = { x: 0, y: 0 };
let pinchWorld = { x: 0, y: 0 };
let lastPointer = { x: 0, y: 0 };
let dragMoved = false;

/** ドラッグ開始時のワールド座標と、対象要素のスナップショット。 */
let moveOrigin = { x: 0, y: 0 };
let moveSnapshot: { id: string; x: number; y: number }[] = [];
let resizeSnapshot: StudioCanvasItem | null = null;
let resizeCorner = "se";
let rotateCenter = { x: 0, y: 0 };
let rotateStartAngle = 0;
let rotateItemAngle = 0;
let rotateItemId = "";

/** タッチ端末ではホイール=ズーム、PC ではホイール=パン（Ctrl でズーム）。 */
const wheelZooms = ref(
  typeof window !== "undefined" && "ontouchstart" in window,
);

const cursorClass = computed(() => {
  if (mode.value === "pan" || isTouchGesture.value) return "is-grabbing";
  if (spaceDown.value) return "is-grab";
  return "";
});

const backdropClass = computed(() => `bg-canvas-${canvas.backdrop}`);

/**
 * キャンバス地のドット / グリッドはパンとズームに追従させる。
 * 固定の背景だと「無限に続く机」の感覚が出ないため、
 * background-size にズーム倍率、background-position にパン量を渡す。
 */
const backdropStyle = computed(() => {
  const cell = canvas.backdrop === "grid" ? 48 : 24;
  const size = cell * zoom.value;
  return {
    ["--grid-size" as string]: `${size}px`,
    ["--grid-x" as string]: `${panX.value % size}px`,
    ["--grid-y" as string]: `${panY.value % size}px`,
    ["--grid-dot" as string]: canvas.backdrop === "grid" ? "1px" : `${Math.max(1, zoom.value)}px`,
  };
});

const boxStyle = computed(() => {
  const left = Math.min(boxStart.value.x, boxCurrent.value.x);
  const top = Math.min(boxStart.value.y, boxCurrent.value.y);
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${Math.abs(boxCurrent.value.x - boxStart.value.x)}px`,
    height: `${Math.abs(boxCurrent.value.y - boxStart.value.y)}px`,
  };
});

function rect() {
  return containerRef.value?.getBoundingClientRect() || null;
}

function garmentOf(item: StudioCanvasItem): Garment | null {
  if (item.kind !== "garment" || !item.itemId) return null;
  return wardrobe.catalog.items.find((entry) => entry.id === item.itemId) || null;
}

/** 衣装カードの画像。コーデ配色を反映する設定は outfit と共有する。 */
function artworkOf(item: StudioCanvasItem) {
  const garment = garmentOf(item);
  if (!garment) return "";
  if (garment.imageUrl) return garment.imageUrl;
  return wardrobe.previewImage(garment);
}

// ------------------------------------------------------------------
// ホイール / ピンチ
// ------------------------------------------------------------------
function onWheel(event: WheelEvent) {
  const box = rect();
  if (!box) return;
  event.preventDefault();
  if (event.ctrlKey || event.metaKey || wheelZooms.value) {
    // トラックパッドの慣性で飛びすぎないよう係数を抑える。
    zoomAt(event.clientX, event.clientY, box, event.deltaY < 0 ? 1.08 : 1 / 1.08);
    schedulePersist();
    return;
  }
  panBy(event.shiftKey ? -event.deltaY : -event.deltaX, event.shiftKey ? 0 : -event.deltaY);
  schedulePersist();
}

function beginPinch() {
  const [a, b] = [...pointers.values()];
  if (!a || !b) return;
  pinchDistance = Math.hypot(b.x - a.x, b.y - a.y);
  pinchZoom = zoom.value;
  pinchAnchor = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const box = rect();
  if (box) pinchWorld = screenToWorld(pinchAnchor.x, pinchAnchor.y, box);
  isTouchGesture.value = true;
  mode.value = "none";
}

// ------------------------------------------------------------------
// ポインタ
// ------------------------------------------------------------------
function isBackground(target: EventTarget | null) {
  const node = target as HTMLElement | null;
  return Boolean(
    node && (node === containerRef.value || node.dataset.canvasWorld === "true"),
  );
}

function onPointerDown(event: PointerEvent) {
  const box = rect();
  if (!box) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2) {
    beginPinch();
    return;
  }
  if (pointers.size > 2) return;

  lastPointer = { x: event.clientX, y: event.clientY };
  dragMoved = false;

  const middle = event.button === 1;
  const onEmpty = event.button === 0 && isBackground(event.target);
  if (!middle && !onEmpty && !spaceDown.value) return;
  event.preventDefault();

  if (onEmpty && event.shiftKey && !spaceDown.value) {
    // Shift + 空白ドラッグ = 範囲選択
    const world = screenToWorld(event.clientX, event.clientY, box);
    boxStart.value = world;
    boxCurrent.value = world;
    mode.value = "box";
    return;
  }
  // 空白ドラッグは選択を解除してからパンに入る。
  if (onEmpty && !spaceDown.value) canvas.clearSelection();
  mode.value = "pan";
}

function onItemSelect(event: PointerEvent, item: StudioCanvasItem) {
  if (spaceDown.value || event.button === 1) return;
  if (event.button !== 0) return;
  const additive = event.shiftKey || event.metaKey || event.ctrlKey;
  if (additive || !canvas.selectedIds.includes(item.id)) canvas.select(item.id, additive);
}

function onItemDragStart(event: PointerEvent, item: StudioCanvasItem) {
  if (spaceDown.value || event.button !== 0) return;
  if (!canvas.selectedIds.includes(item.id)) return;
  const box = rect();
  if (!box) return;
  const world = screenToWorld(event.clientX, event.clientY, box);
  moveOrigin = world;
  moveSnapshot = canvas.selectedItems.map((entry) => ({
    id: entry.id,
    x: entry.x,
    y: entry.y,
  }));
  mode.value = "move";
  dragMoved = false;
}

function onItemResizeStart(event: PointerEvent, item: StudioCanvasItem, corner: string) {
  resizeSnapshot = { ...item };
  resizeCorner = corner;
  mode.value = "resize";
  dragMoved = false;
  event.preventDefault();
}

function onItemRotateStart(event: PointerEvent, item: StudioCanvasItem) {
  const box = rect();
  if (!box) return;
  rotateCenter = { x: item.x + item.width / 2, y: item.y + item.height / 2 };
  rotateItemId = item.id;
  const world = screenToWorld(event.clientX, event.clientY, box);
  rotateStartAngle =
    (Math.atan2(world.y - rotateCenter.y, world.x - rotateCenter.x) * 180) / Math.PI;
  rotateItemAngle = item.rotation;
  mode.value = "rotate";
  dragMoved = false;
  event.preventDefault();
}

function onPointerMove(event: PointerEvent) {
  if (pointers.has(event.pointerId)) {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }
  const box = rect();
  if (!box) return;

  // 2本指: ピンチズームと 2 本指パン
  if (pointers.size >= 2 && isTouchGesture.value) {
    const [a, b] = [...pointers.values()];
    if (!a || !b) return;
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    const anchor = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (pinchDistance > 0) {
      const next = Math.min(6, Math.max(0.15, pinchZoom * (distance / pinchDistance)));
      zoom.value = next;
      panX.value = anchor.x - box.left - pinchWorld.x * next;
      panY.value = anchor.y - box.top - pinchWorld.y * next;
    }
    schedulePersist();
    return;
  }

  if (mode.value === "none") return;
  const dx = event.clientX - lastPointer.x;
  const dy = event.clientY - lastPointer.y;
  if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;

  if (mode.value === "pan") {
    panBy(dx, dy);
    lastPointer = { x: event.clientX, y: event.clientY };
    schedulePersist();
    return;
  }

  const world = screenToWorld(event.clientX, event.clientY, box);

  if (mode.value === "box") {
    boxCurrent.value = world;
    return;
  }

  if (mode.value === "move") {
    const offsetX = world.x - moveOrigin.x;
    const offsetY = world.y - moveOrigin.y;
    const patches: Record<string, Partial<StudioCanvasItem>> = {};
    for (const entry of moveSnapshot) {
      patches[entry.id] = { x: entry.x + offsetX, y: entry.y + offsetY };
    }
    canvas.updateMany(patches);
    return;
  }

  if (mode.value === "resize" && resizeSnapshot) {
    const item = resizeSnapshot;
    const fromLeft = resizeCorner.includes("w");
    const fromTop = resizeCorner.includes("n");
    const anchorX = fromLeft ? item.x + item.width : item.x;
    const anchorY = fromTop ? item.y + item.height : item.y;
    const ratio = item.width / Math.max(1, item.height);
    let width = Math.max(48, Math.abs(world.x - anchorX));
    // 衣装と素体は図柄の比率そのものが意味を持つので縦横比を固定する。メモは自由。
    let height = item.kind === "note" ? Math.max(48, Math.abs(world.y - anchorY)) : width / ratio;
    canvas.update(
      item.id,
      {
        width,
        height,
        x: fromLeft ? anchorX - width : anchorX,
        y: fromTop ? anchorY - height : anchorY,
      },
      false,
    );
    return;
  }

  if (mode.value === "rotate" && rotateItemId) {
    const angle =
      (Math.atan2(world.y - rotateCenter.y, world.x - rotateCenter.x) * 180) / Math.PI;
    canvas.update(
      rotateItemId,
      { rotation: Math.round((rotateItemAngle + angle - rotateStartAngle) * 10) / 10 },
      false,
    );
  }
}

function onPointerUp(event: PointerEvent) {
  pointers.delete(event.pointerId);
  if (pointers.size < 2) {
    isTouchGesture.value = false;
    pinchDistance = 0;
  }

  if (mode.value === "box") {
    const left = Math.min(boxStart.value.x, boxCurrent.value.x);
    const top = Math.min(boxStart.value.y, boxCurrent.value.y);
    const right = Math.max(boxStart.value.x, boxCurrent.value.x);
    const bottom = Math.max(boxStart.value.y, boxCurrent.value.y);
    const hit = canvas.items
      .filter(
        (item) =>
          item.x < right &&
          item.x + item.width > left &&
          item.y < bottom &&
          item.y + item.height > top,
      )
      .map((item) => item.id);
    canvas.selectMany(hit, event.shiftKey);
  }

  if (dragMoved && (mode.value === "move" || mode.value === "resize" || mode.value === "rotate")) {
    canvas.commit();
  }
  resizeSnapshot = null;
  rotateItemId = "";
  mode.value = "none";
  dragMoved = false;
  schedulePersist();
}


// ------------------------------------------------------------------
// キーボード
// ------------------------------------------------------------------
function isTypingTarget(target: EventTarget | null) {
  const node = target as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable;
}

function onKeyDown(event: KeyboardEvent) {
  if (event.isComposing) return;
  if (event.key === " " && !isTypingTarget(event.target)) {
    spaceDown.value = true;
    event.preventDefault();
    return;
  }
  if (isTypingTarget(event.target)) return;
  if (!containerRef.value?.contains(event.target as Node)) return;

  const box = rect();
  const step = event.shiftKey ? 16 : 4;
  const nudge = (dx: number, dy: number) => {
    if (!canvas.selectedIds.length) return;
    event.preventDefault();
    const patches: Record<string, Partial<StudioCanvasItem>> = {};
    for (const item of canvas.selectedItems) patches[item.id] = { x: item.x + dx, y: item.y + dy };
    canvas.updateMany(patches);
    canvas.commit();
    schedulePersist();
  };

  if (event.key === "Delete" || event.key === "Backspace") {
    if (!canvas.selectedIds.length) return;
    event.preventDefault();
    canvas.remove();
    schedulePersist();
    return;
  }
  if (event.key === "Escape") {
    canvas.clearSelection();
    return;
  }
  if (event.key === "ArrowLeft") return nudge(-step, 0);
  if (event.key === "ArrowRight") return nudge(step, 0);
  if (event.key === "ArrowUp") return nudge(0, -step);
  if (event.key === "ArrowDown") return nudge(0, step);

  const modifier = event.metaKey || event.ctrlKey;
  if (!modifier) {
    if (event.key === "0" && box) {
      event.preventDefault();
      fitView();
    }
    if (event.key === "1" && box) {
      event.preventDefault();
      resetTo100();
    }
    return;
  }
  const key = event.key.toLowerCase();
  if (key === "z") {
    event.preventDefault();
    if (event.shiftKey) canvas.redo();
    else canvas.undo();
    schedulePersist();
    return;
  }
  if (key === "y") {
    event.preventDefault();
    canvas.redo();
    schedulePersist();
    return;
  }
  if (key === "d") {
    event.preventDefault();
    canvas.duplicate();
    schedulePersist();
    return;
  }
  if (key === "a") {
    event.preventDefault();
    canvas.selectMany(canvas.items.map((item) => item.id));
  }
}

function onKeyUp(event: KeyboardEvent) {
  if (event.key === " ") spaceDown.value = false;
}

// ------------------------------------------------------------------
// 衣装棚からのドラッグ＆ドロップ
// ------------------------------------------------------------------
function onDragOver(event: DragEvent) {
  if (!event.dataTransfer) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
}

function onDrop(event: DragEvent) {
  const box = rect();
  const transfer = event.dataTransfer;
  if (!box || !transfer) return;
  event.preventDefault();

  const raw = transfer.getData(GARMENT_MIME) || transfer.getData("text/plain");
  const id = raw.trim();
  if (!id) return;
  const garment = wardrobe.catalog.items.find((item) => item.id === id);
  if (!garment) return;
  const world = screenToWorld(event.clientX, event.clientY, box);
  containerRef.value?.focus({ preventScroll: true });
  canvas.placeGarment(garment, {
    x: world.x - 180 / 2,
    y: world.y - 195 / 2,
  });
  schedulePersist();
}

// ------------------------------------------------------------------
// ビューポート / 永続化
// ------------------------------------------------------------------
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let resizeObserver: ResizeObserver | null = null;
let hydratingCanvas = false;
let initialSeeded = false;
let userModifiedCanvas = false;
function persistViewport() {
  const box = rect();
  if (!box?.width || !box.height) return;
  canvas.persist(panX.value, panY.value, zoom.value, undefined, { width: box.width, height: box.height });
}
function schedulePersist() {
  if (hydratingCanvas) return;
  userModifiedCanvas = true;
  emit("viewport-change");
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistViewport();
  }, 600);
}

function flushPersist() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (initialSeeded && !userModifiedCanvas) return;
  persistViewport();
}

function fitView() {
  const box = rect();
  if (!box) return;
  fitToItems(canvas.items, box);
  schedulePersist();
}

function centerCharacter(atActualSize = false) {
  const box = rect();
  const character = canvas.mannequin;
  if (!box || !character) return;
  if (atActualSize) {
    setViewport({ panX: box.width / 2 - (character.x + character.width / 2), panY: box.height / 2 - (character.y + character.height / 2), zoom: 1 });
  } else fitToItems([character], box);
  schedulePersist();
}

function resetTo100() {
  if (canvas.mannequin) centerCharacter(true);
  else { resetView(rect() || undefined); schedulePersist(); }
}

function zoomByStep(factor: number) {
  const box = rect();
  if (!box) {
    zoom.value = Math.min(6, Math.max(0.15, zoom.value * factor));
  } else {
    zoomAt(box.left + box.width / 2, box.top + box.height / 2, box, factor);
  }
  schedulePersist();
}

/** 素体を中央に置いて初期ビューを作る。 */
function seedIfNeeded() {
  const box = rect();
  if (!box) return;
  canvas.ensureMannequin({
    x: -160,
    y: -240,
  });
  canvas.clearSelection();
}

async function hydrateCanvas() {
  hydratingCanvas = true;
  try {
    const saved = canvas.hydrate();
    const box = rect();
    if (saved) {
      initialSeeded = false;
      setViewport(saved.viewport);
      if (box && (!saved.viewportSize || Math.abs(saved.viewportSize.width - box.width) > 2 || Math.abs(saved.viewportSize.height - box.height) > 2)) centerCharacter();
    } else {
      resetView(box || undefined);
    }
    if (!saved && !canvas.items.length) {
      seedIfNeeded();
      initialSeeded = true;
      if (box) centerCharacter();
    } else if (!saved && box) fitToItems(canvas.items, box);
  } finally {
    await nextTick();
    hydratingCanvas = false;
  }
}

watch(cloudCanvasRevision, () => {
  if (!userModifiedCanvas) void hydrateCanvas();
});

onMounted(async () => {
  await nextTick();
  await hydrateCanvas();
  let previous = rect();
  if (typeof ResizeObserver !== "undefined" && containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      const box = rect();
      if (!box?.width || !box.height) return;
      if (previous && (Math.abs(previous.width - box.width) > 40 || Math.abs(previous.height - box.height) > 100)) fitView();
      previous = box;
    });
    resizeObserver.observe(containerRef.value);
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("resize", schedulePersist);
});

watch(() => canvas.items, schedulePersist, { deep: true });
watch(() => canvas.backdrop, schedulePersist);

async function addNote() {
  const character = canvas.mannequin;
  const at = canvas.nextPlacement(220, 132, character
    ? { x: character.x + character.width + 32, y: character.y + 235 }
    : { x: 0, y: 0 });
  const note = canvas.placeNote("", at);
  await nextTick();
  fitView();
  if (note) containerRef.value?.querySelector<HTMLTextAreaElement>(`[data-item-id="${note.id}"] textarea`)?.focus({ preventScroll: true });
}

function addGarment(garment: Garment) {
  const character = canvas.mannequin;
  const at = canvas.nextPlacement(180, 195, character
    ? { x: character.x + character.width + 32, y: character.y }
    : { x: 0, y: 0 });
  canvas.placeGarment(garment, at);
  fitView();
}

onBeforeUnmount(() => {
  flushPersist();
  resizeObserver?.disconnect();
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("pointercancel", onPointerUp);
  window.removeEventListener("resize", schedulePersist);
  if (persistTimer) clearTimeout(persistTimer);
});

defineExpose({
  fitView,
  centerCharacter,
  addNote,
  addGarment,
  resetTo100,
  zoomIn: () => zoomByStep(1.2),
  zoomOut: () => zoomByStep(1 / 1.2),
  panX,
  panY,
  zoom,
  /** PNG 書き出し用に素体の SVG 要素を返す。 */
  mannequinSvg: () => mannequinPreview.value[0]?.svg || null,
});
</script>

<template>
  <div
    ref="containerRef"
    class="studio-canvas"
    :class="[backdropClass, cursorClass]"
    :style="backdropStyle"
    tabindex="0"
    role="region"
    aria-label="自由キャンバス"
    @wheel="onWheel"
    @pointerdown="containerRef?.focus({ preventScroll: true }); onPointerDown($event)"
    @dragover="onDragOver"
    @drop="onDrop"
    @contextmenu.prevent
  >
    <!-- ワールドレイヤー。ここだけが scale(zoom) される -->
    <div class="canvas-world" data-canvas-world="true" :style="transformStyle">
      <CanvasItem
        v-for="item in canvas.items"
        :key="item.id"
        :item="item"
        :selected="canvas.selectedIds.includes(item.id)"
        :zoom="zoom"
        :image-url="artworkOf(item)"
        @edit-note="(text, record) => canvas.update(item.id, { text }, record)"
        @select="onItemSelect($event, item)"
        @drag-start="onItemDragStart($event, item)"
        @resize-start="(event, corner) => onItemResizeStart(event, item, corner)"
        @rotate-start="onItemRotateStart($event, item)"
        @remove="canvas.remove([item.id]); schedulePersist()"
        @flip="canvas.toggleFlip(item.id); schedulePersist()"
        @rotate90="canvas.setRotation(item.id, item.rotation + 90); schedulePersist()"
      >
        <MannequinPreview
          v-if="item.kind === 'mannequin'"
          ref="mannequinPreview"
          class="canvas-mannequin"
          :heads="heads"
          :gender="gender"
          :pose="pose"
          :generated-outfit="generatedOutfit"
          :selected="wardrobe.selectedItems"
          :palette="wardrobe.palette"
          :dressed="dressed"
          :guides="guides"
          :palette-colors="wardrobe.previewPaletteColors"
        />
      </CanvasItem>

      <!-- Shift + ドラッグの範囲選択ラバーバンド -->
      <div v-if="mode === 'box'" class="canvas-select-box" :style="boxStyle" />
    </div>

    <!-- 空のときのガイド -->
    <div v-if="!canvas.items.length" class="canvas-empty">
      <p class="canvas-empty-title">キャンバスは空です</p>
      <p class="canvas-empty-body">
        衣装棚からカードをドラッグして置けます。<br />
        空白ドラッグでパン、Ctrl / ⌘ + ホイールでズームします。
      </p>
      <button type="button" class="button secondary" @click="seedIfNeeded(); fitView()">
        キャラクターを置く
      </button>
    </div>

    <!-- 操作ヒント（ズーム中は消さない。常時右下の控えめな表示） -->
    <div class="canvas-hint" aria-hidden="true">
      <span>{{ Math.round(zoom * 100) }}%</span>
      <span>{{ canvas.items.length }} items</span>
      <span v-if="canvas.selectedIds.length">{{ canvas.selectedIds.length }} 選択中</span>
    </div>
  </div>
</template>


