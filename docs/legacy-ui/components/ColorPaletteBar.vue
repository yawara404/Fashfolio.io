<template>
  <section class="palette-panel" aria-label="衣装カラーパレット">
    <div class="palette-heading">
      <div>
        <Palette :size="15" />
        <h2>カラーパレット</h2>
        <span>AUTO PICKED</span>
      </div>
      <button
        class="icon-button"
        :aria-label="copied ? 'コピーしました' : '全色をコピー'"
        :title="copied ? 'コピーしました' : '全色をコピー'"
        @click="copyAll"
      >
        <Check v-if="copied" :size="15" /><Copy v-else :size="15" />
      </button>
    </div>
    <div class="palette-swatches">
      <div
        v-for="(swatch, idx) in board.palette"
        :key="idx"
        class="palette-swatch"
      >
        <label :style="{ background: swatch.hex }"
          ><input
            type="color"
            :aria-label="`${swatch.roleLabel}を変更`"
            :value="swatch.hex"
            @input="onInput(idx, $event)" /></label
        ><button
          :title="`${swatch.roleLabel}をコピー`"
          @click="copyHex(swatch.hex)"
        >
          {{ copiedHex === swatch.hex ? "Copied!" : swatch.hex }}
        </button>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { Palette, Copy, Check } from "lucide-vue-next";
import { useFittingBoard } from "~/composables/useFittingBoard";
const board = useFittingBoard();
const copied = ref(false);
const copiedHex = ref("");
async function copyAll() {
  try {
    await navigator.clipboard.writeText(
      board.palette.map((s) => s.hex).join(", "),
    );
    copied.value = true;
    setTimeout(() => (copied.value = false), 1600);
  } catch {}
}
async function copyHex(hex: string) {
  try {
    await navigator.clipboard.writeText(hex);
    copiedHex.value = hex;
    setTimeout(() => (copiedHex.value = ""), 1600);
  } catch {}
}
function onInput(index: number, event: Event) {
  board.updateSwatchHex(index, (event.target as HTMLInputElement).value);
}
</script>
