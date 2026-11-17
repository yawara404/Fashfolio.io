<template>
  <section class="garment-color-editor" aria-labelledby="garment-color-heading">
    <div class="section-label"><span id="garment-color-heading"><Palette :size="14" />この服の色</span><button v-if="wardrobe.garmentColors[item.id]" class="text-link" @click="wardrobe.resetGarmentColor(item.id)"><RotateCcw :size="12" />配色に戻す</button></div>
    <p class="garment-color-name">{{ item.name }}</p>
    <template v-if="canPaintGarment(item)">
      <div class="garment-color-slots" role="group" :aria-label="`${item.name}の配色`">
        <label v-for="(color, index) in wardrobe.paintOf(item).slice(0, item.category === 'socks' || item.kind === 'tights' ? 1 : 3)" :key="index">
          <input type="color" :value="color" :aria-label="`${item.name}の${labels[index]}の色`" @input="wardrobe.updateGarmentColor(item, index, ($event.target as HTMLInputElement).value)" />
          <span>{{ labels[index] }}</span><code>{{ color }}</code>
        </label>
      </div>
      <p class="garment-color-hint">線画・陰影を残して変更。ほかの服の色は変わりません。</p>
    </template>
    <p v-else class="garment-color-hint">{{ item.imageUrl ? '生成した衣装の色は、生成時の配色を使用します。' : '素体と一体になったインナーは元の色を使用します。' }}</p>
  </section>
</template>
<script setup lang="ts">
import { Palette, RotateCcw } from "lucide-vue-next";
import { useWardrobe } from "~/composables/useWardrobe";
import { canPaintGarment } from "~/utils/garmentColors";
import type { Garment } from "~/types/wardrobe";
defineProps<{ item: Garment }>();
const wardrobe = useWardrobe();
const labels = ["生地", "襟・切替", "リボン・装飾"];
</script>
