<script setup lang="ts">
import { ref } from "vue";
import { onClickOutside } from "@vueuse/core";
import { Download, LayoutGrid, Maximize2, Minus, Plus, Redo2, Settings2, StickyNote, Undo2 } from "lucide-vue-next";
import { useStudioCanvas } from "~/composables/useStudioCanvas";
import type { CanvasBackdrop } from "~/types/canvas";

defineProps<{ zoom: number; exporting: boolean }>();
const emit = defineEmits<{
  "zoom-in": []; "zoom-out": []; "fit-view": []; "reset-view": [];
  export: []; "add-note": [];
}>();
const canvas = useStudioCanvas();
const menu = ref<HTMLElement | null>(null);
const open = ref(false);
onClickOutside(menu, () => { open.value = false; });
const backdrops: { id: CanvasBackdrop; label: string }[] = [
  { id: "dots", label: "ドット" }, { id: "grid", label: "方眼" }, { id: "plain", label: "無地" },
];
</script>

<template>
  <div class="canvas-controls" role="toolbar" aria-label="キャンバス操作" @pointerdown.stop @wheel.stop>
    <div class="canvas-controls-group">
      <button aria-label="元に戻す" title="元に戻す (⌘/Ctrl+Z)" :disabled="!canvas.canUndo" @click="canvas.undo()"><Undo2 :size="16" /></button>
      <button aria-label="やり直す" title="やり直す (⌘/Ctrl+Shift+Z)" :disabled="!canvas.canRedo" @click="canvas.redo()"><Redo2 :size="16" /></button>
    </div>
    <span class="canvas-controls-divider" />
    <div class="canvas-controls-group">
      <button aria-label="縮小" @click="emit('zoom-out')"><Minus :size="16" /></button>
      <button class="canvas-zoom-value" aria-label="倍率を100%に戻す" @click="emit('reset-view')">{{ Math.round(zoom * 100) }}%</button>
      <button aria-label="拡大" @click="emit('zoom-in')"><Plus :size="16" /></button>
      <button aria-label="全体表示" title="全体表示 (0)" @click="emit('fit-view')"><Maximize2 :size="16" /></button>
    </div>
    <span class="canvas-controls-divider" />
    <button aria-label="メモを追加" title="メモを追加" @click="emit('add-note')"><StickyNote :size="16" /></button>
    <div ref="menu" class="canvas-menu-wrap" @keydown.esc.stop="open = false">
      <button aria-label="表示と配置" :aria-expanded="open" aria-controls="canvas-settings" @click="open = !open"><Settings2 :size="16" /></button>
      <div v-if="open" id="canvas-settings" class="canvas-settings">
        <strong>キャンバスの背景</strong>
        <div class="canvas-backdrop-options">
          <button v-for="option in backdrops" :key="option.id" :aria-pressed="canvas.backdrop === option.id" :class="{ active: canvas.backdrop === option.id }" @click="canvas.backdrop = option.id">{{ option.label }}</button>
        </div>
        <strong>カードを並べる</strong>
        <button @click="canvas.arrange('grid'); emit('fit-view'); open = false"><LayoutGrid :size="14" />グリッドに整列</button>
        <button @click="canvas.arrange('horizontal'); emit('fit-view'); open = false">横に並べる</button>
        <button @click="canvas.arrange('vertical'); emit('fit-view'); open = false">縦に並べる</button>
        <p>空白をドラッグで移動<br />⌘ / Ctrl + スクロールで拡大縮小<br />Shift + ドラッグで範囲選択</p>
      </div>
    </div>
    <button class="canvas-export-button" :disabled="exporting || !canvas.mannequin" aria-label="キャラクターをPNGで保存" title="キャラクターをPNGで保存" @click="emit('export')"><Download :size="16" /></button>
  </div>
</template>
