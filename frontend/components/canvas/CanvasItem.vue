<script setup lang="ts">
import { computed } from "vue";
import { CornerDownLeft, FlipHorizontal2, GripVertical, RotateCw, Trash2 } from "lucide-vue-next";
import type { StudioCanvasItem } from "~/types/canvas";

/**
 * 自由キャンバス上の 1 要素。
 *
 * ワールド座標をそのまま left/top/width/height に持つ。親のワールドレイヤーが
 * scale(zoom) されるので、枠線・ハンドル・ラベルは `--inv` （= 1/zoom）で
 * 逆倍率して、ズームしても画面上の太さ・大きさが変わらないようにする。
 */
const props = defineProps<{
  item: StudioCanvasItem;
  selected: boolean;
  zoom: number;
  /** 素体アイテムの中身（MannequinPreview）を差し込むスロットの有効化 */
  imageUrl?: string;
}>();

const emit = defineEmits<{
  select: [event: PointerEvent];
  "drag-start": [event: PointerEvent];
  "resize-start": [event: PointerEvent, corner: string];
  "rotate-start": [event: PointerEvent];
  "edit-note": [text: string, record: boolean];
  remove: [];
  flip: [];
  rotate90: [];
}>();

const style = computed(() => ({
  left: `${props.item.x}px`,
  top: `${props.item.y}px`,
  width: `${props.item.width}px`,
  height: `${props.item.height}px`,
  zIndex: props.item.z,
  transform: `rotate(${props.item.rotation}deg)`,
  // ズームの逆数を CSS 変数で配り、枠線とハンドルを画面一定サイズに保つ。
  ["--inv" as string]: String(1 / (props.zoom || 1)),
}));

const contentStyle = computed(() => ({
  transform: props.item.flipped ? "scaleX(-1)" : undefined,
}));

const aspect = computed(() => props.item.width / Math.max(1, props.item.height));
</script>

<template>
  <div
    class="canvas-item"
    :class="[`is-${item.kind}`, { 'is-selected': selected }]"
    :style="style"
    :data-item-id="item.id"
    :data-item-kind="item.kind"
    role="group"
    :aria-label="item.label || item.kind"
    @pointerdown="emit('select', $event); emit('drag-start', $event)"
  >
    <div class="canvas-item-content" :style="contentStyle">
      <!-- 素体: 中身は親が slot で描画する（MannequinPreview を差し込む） -->
      <slot />

      <!-- 衣装カード / メモ -->
      <img
        v-if="item.kind === 'garment' && imageUrl"
        class="canvas-item-image"
        :src="imageUrl"
        :alt="item.label"
        draggable="false"
      />
      <div v-else-if="item.kind === 'garment'" class="canvas-item-missing">
        <span>削除された衣装</span>
      </div>
      <textarea v-else-if="item.kind === 'note'" class="canvas-item-note"
        :value="item.text" aria-label="キャンバスのメモ" placeholder="ここに作画メモを書く…"
        maxlength="1000" @pointerdown.stop @keydown.stop
        @input="emit('edit-note', ($event.target as HTMLTextAreaElement).value, false)"
        @change="emit('edit-note', ($event.target as HTMLTextAreaElement).value, true)" />
    </div>

    <footer class="canvas-item-label">
      <GripVertical :size="11" class="canvas-item-grip" />
      <span>{{ item.label }}</span>
    </footer>

    <template v-if="selected">
      <span
        v-for="corner in ['nw', 'ne', 'sw', 'se']"
        :key="corner"
        class="canvas-item-handle"
        :class="`handle-${corner}`"
        :data-resize="corner"
        role="presentation"
        @pointerdown.stop="emit('resize-start', $event, corner)"
      />
      <span
        class="canvas-item-rotator"
        role="presentation"
        title="回転"
        @pointerdown.stop="emit('rotate-start', $event)"
      >
        <RotateCw :size="11" />
      </span>
      <div class="canvas-item-actions" @pointerdown.stop>
        <button type="button" title="左右反転" aria-label="左右反転" @click="emit('flip')">
          <FlipHorizontal2 :size="12" />
        </button>
        <button type="button" title="90°回転" aria-label="90度回転" @click="emit('rotate90')">
          <CornerDownLeft :size="12" />
        </button>
        <button type="button" title="削除" aria-label="キャンバスから削除" @click="emit('remove')">
          <Trash2 :size="12" />
        </button>
      </div>
      <span class="canvas-item-ratio">{{ aspect.toFixed(2) }}</span>
    </template>
  </div>
</template>
