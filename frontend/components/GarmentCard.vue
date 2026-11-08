<template>
  <div class="garment-tile">
  <button
    class="garment-card"
    :class="{ selected }"
    :aria-pressed="selected"
    @click="$emit('select', item)"
  >
    <span class="garment-image"
      ><img
        :src="wardrobe.previewImage(item)"
        :class="{ 'local-garment-image': item.source }"
        :alt="item.name"
        width="240"
        height="260" /><span class="card-index">{{
        String(index + 1).padStart(2, "0")
      }}</span
      ><span v-if="selected" class="card-check"><Check :size="13" /></span
      ><span v-else class="card-add"><Plus :size="14" /></span
    ></span>
    <span v-if="item.source" class="local-garment-label">LOCAL / 生成した衣装</span>
    <span class="garment-name">{{ item.name }}</span
    ><span class="garment-en">{{ item.name_en }}</span>
    <span class="garment-description">{{ item.description }}</span>
    <span class="garment-meta"
      ><span>{{ item.material }}</span
      ><span class="garment-colors"
        ><i
          v-for="color in item.colors"
          :key="color"
          :style="{ background: color }" /></span
    ></span>
  </button>
  <button v-if="item.source" class="local-garment-delete" :aria-label="`${item.name}を衣装棚から削除`" @click="$emit('delete', item.id)">削除</button>
  </div>
</template>
<script setup lang="ts">
import { Check, Plus } from "lucide-vue-next";
import { useWardrobe } from "~/composables/useWardrobe";
import type { Garment } from "~/types/wardrobe";
defineProps<{ item: Garment; index: number; selected: boolean }>();
defineEmits<{ select: [item: Garment]; delete: [id: string] }>();
const wardrobe = useWardrobe();
</script>
