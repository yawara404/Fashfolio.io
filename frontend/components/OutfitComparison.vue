<template>
  <svg ref="root" class="outfit-comparison" viewBox="0 0 960 760" role="img" aria-label="固定したコーデと編集中のコーデの比較" xmlns="http://www.w3.org/2000/svg">
    <text x="240" y="26" text-anchor="middle" fill="#626977" font-size="14">固定したコーデ · {{ baseline.heads }}頭身</text>
    <text x="720" y="26" text-anchor="middle" fill="#4f46c7" font-size="14">編集中 · {{ current.heads }}頭身</text>
    <line x1="480" y1="42" x2="480" y2="718" stroke="#e0e3e9" />
    <MannequinPreview v-bind="baseline" x="0" y="40" width="480" height="680" :style="previewStyle" :dressed="true" :guides="false" />
    <MannequinPreview ref="currentPreview" v-bind="current" x="480" y="40" width="480" height="680" :style="previewStyle" :dressed="dressed" :guides="guides" />
    <text x="240" y="746" text-anchor="middle" fill="#626977" font-size="12">{{ baseline.title.slice(0,28) }}</text>
    <text x="720" y="746" text-anchor="middle" fill="#626977" font-size="12">{{ current.title.slice(0,28) }}</text>
  </svg>
</template>
<script setup lang="ts">
import { ref } from "vue";
import MannequinPreview from "~/components/MannequinPreview.vue";
import type { Garment } from "~/types/wardrobe";
import type { MannequinGender } from "~/types/avatar";
export interface ComparisonOutfit { selected: Garment[]; palette: string[]; paletteColors: boolean; heads: number; gender: MannequinGender; pose: string; title: string }
defineProps<{ baseline: ComparisonOutfit; current: ComparisonOutfit; dressed: boolean; guides: boolean }>();
const root = ref<SVGSVGElement | null>(null);
const currentPreview = ref<{svg: SVGSVGElement | null} | null>(null);
const previewStyle = { width: "480px", height: "680px", maxWidth: "none", maxHeight: "none" };
defineExpose({ svg: root, reference: () => currentPreview.value?.svg || null });
</script>
