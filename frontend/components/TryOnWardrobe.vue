<template>
  <aside class="tryon-wardrobe">
    <div class="section-heading">
      <div>
        <span class="eyebrow">03 / CHANGE THE LOOK</span>
        <h2>試しながら、選ぶ。</h2>
      </div>
      <Shirt :size="23" :stroke-width="1.3" />
    </div>
    <p class="panel-intro">
      アイテムを選ぶと、キャラクターにすぐ反映。<br />outfitと同じコーデを編集できます。
    </p>
    <button class="button lab-trigger fitting-generate" @click="$emit('generate')"><Sparkles :size="14" />この部位の衣装を生成<Plus :size="13" /></button>
    <label for="fitting-category" class="field-label">着せ替えるパーツ</label>
    <div class="fitting-category-select">
      <select id="fitting-category" v-model="wardrobe.activeCategory">
        <option
          v-for="category in wardrobe.catalog.categories"
          :key="category.id"
          :value="category.id"
        >
          {{ category.name }}
        </option></select
      ><ChevronDown :size="13" />
    </div>
    <div class="fitting-items">
      <button
        class="fitting-item fitting-none"
        :class="{ selected: !wardrobe.selections[wardrobe.activeCategory] }"
        :disabled="wardrobe.locks.includes(wardrobe.activeCategory)"
        @click="wardrobe.remove(wardrobe.activeCategory)"
      >
        <span><CircleSlash :size="24" :stroke-width="1" /></span
        ><strong>なし</strong><small>このパーツを外す</small></button
      ><button
        v-for="item in categoryItems"
        :key="item.id"
        class="fitting-item"
        :class="{ selected: wardrobe.selections[item.category] === item.id }"
        :aria-pressed="wardrobe.selections[item.category] === item.id"
        @click="wardrobe.choose(item)"
      >
        <span
          ><img :src="wardrobe.previewImage(item)" :alt="item.name" :class="{ 'local-garment-image': item.source }" /><i
            v-if="wardrobe.selections[item.category] === item.id"
            ><Check :size="11" /></i></span
        ><strong>{{ item.name }}</strong
        ><small>{{ item.material }}</small>
      </button>
    </div>
    <p v-if="categoryItems.some(i => i.source)" class="field-help">生成した衣装は、このブラウザに保存されています。画像の配色は生成時のものを使用します。</p>
    <div
      v-if="wardrobe.locks.includes(wardrobe.activeCategory)"
      class="fitting-lock-note"
    >
      <LockKeyhole :size="12" />ロック中も、アイテムを選んで変更できます。
    </div>
    <NuxtLink to="/" class="button secondary return-to-outfit"
      ><FileText :size="14" />outfitでプロンプトを作る<ArrowUpRight :size="13"
    /></NuxtLink>
  </aside>
</template>
<script setup lang="ts">
import { computed } from "vue";
import {
  Shirt,
  ChevronDown,
  CircleSlash,
  Check,
  LockKeyhole,
  FileText,
  ArrowUpRight,
  Sparkles,
  Plus,
} from "lucide-vue-next";
import { useWardrobe } from "~/composables/useWardrobe";
const wardrobe = useWardrobe();
defineEmits<{ generate: [] }>();
const categoryItems = computed(() =>
  wardrobe.catalog.items.filter(
    (item) => item.category === wardrobe.activeCategory,
  ),
);
</script>
