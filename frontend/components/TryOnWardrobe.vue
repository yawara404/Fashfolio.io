<template>
  <aside class="tryon-wardrobe">
    <div class="fitting-library-heading"><h2>{{ avatar.browsingPoses ? 'ポーズ' : '衣装' }}</h2><span>{{ avatar.browsingPoses ? filteredPoses.length : categoryItems.length }}点</span><button v-if="!avatar.browsingPoses" class="icon-button" aria-label="衣装を生成して追加" title="衣装を生成して追加" @click="$emit('generate')"><Plus :size="17" /></button></div>
    <div v-if="!avatar.browsingPoses" class="fitting-source-tabs" role="group" aria-label="衣装の種類">
      <button :class="{ active: source === 'preset' }" :aria-pressed="source === 'preset'" @click="source = 'preset'">プリセット</button>
      <button :class="{ active: source === 'local' }" :aria-pressed="source === 'local'" @click="source = 'local'">生成した衣装</button>
    </div>
    <div v-if="!avatar.browsingPoses && source === 'preset'" class="fitting-audience-tabs" role="group" aria-label="プリセットの対象">
      <button v-for="option in audiences" :key="option.id" :class="{ active: wardrobe.presetAudience === option.id }" :aria-pressed="wardrobe.presetAudience === option.id" @click="wardrobe.presetAudience = option.id">{{ option.name }}</button>
    </div>
    <label class="fitting-search"><Search :size="14" /><input v-model="query" type="search" :placeholder="avatar.browsingPoses ? 'ポーズを検索' : '衣装を検索'" :aria-label="avatar.browsingPoses ? 'ポーズを検索' : '試着する衣装を検索'" /></label>
    <div class="fitting-library-body">
      <nav class="fitting-category-rail" aria-label="試着する衣装の部位">
        <button v-for="category in wardrobe.catalog.categories" :key="category.id" :class="{ active: !avatar.browsingPoses && wardrobe.activeCategory === category.id }" :aria-label="category.name" :aria-pressed="!avatar.browsingPoses && wardrobe.activeCategory === category.id" @click="avatar.browsingPoses = false; wardrobe.activeCategory = category.id; query = ''">
          <component :is="icons[category.id]" :size="20" :stroke-width="1.5" /><span>{{ labels[category.id] }}</span><i v-if="wardrobe.selections[category.id]" />
        </button>
        <button :class="{ active: avatar.browsingPoses }" aria-label="ポーズ" :aria-pressed="avatar.browsingPoses" @click="avatar.browsingPoses = true; query = ''"><Accessibility :size="20" :stroke-width="1.5" /><span>ポーズ</span><i v-if="avatar.pose.id !== 'relax'" /></button>
      </nav>
      <div v-if="avatar.browsingPoses" class="fitting-library-content">
        <div class="fitting-active-category">ポーズ<span>POSE</span></div>
        <PosePicker :poses="filteredPoses" />
        <div v-if="!filteredPoses.length" class="fitting-library-empty"><p>条件に合うポーズがありません。</p><button class="text-link" @click="query = ''">検索をクリア</button></div>
      </div>
      <div v-else class="fitting-library-content">
        <div class="fitting-active-category">{{ wardrobe.activeDefinition?.name }}<span>{{ source === 'preset' ? 'PRESET' : 'LOCAL' }}</span></div>
        <div class="fitting-items">
          <button v-if="source === 'preset' && !query" class="fitting-item fitting-none" :aria-label="`${wardrobe.activeDefinition?.name || '衣装'}を外す（なし）`" :aria-pressed="!wardrobe.selections[wardrobe.activeCategory]" :class="{ selected: !wardrobe.selections[wardrobe.activeCategory] }" :disabled="wardrobe.locks.includes(wardrobe.activeCategory)" @click="wardrobe.remove(wardrobe.activeCategory)"><span><CircleSlash :size="23" :stroke-width="1" /></span><strong>なし</strong></button>
          <div v-for="item in categoryItems" :key="item.id" class="fitting-tile">
            <button class="fitting-item" :aria-label="item.name" draggable="true" @dragstart="setGarmentDragData($event.dataTransfer!, item.id)" :class="{ selected: wardrobe.selections[item.category] === item.id }" :aria-pressed="wardrobe.selections[item.category] === item.id" @click="wardrobe.choose(item)">
              <span><img :src="wardrobe.previewImage(item)" :alt="item.name" :class="{ 'local-garment-image': item.source }" /><i v-if="wardrobe.selections[item.category] === item.id"><Check :size="11" /></i></span>
              <strong>{{ item.name }}</strong>
            </button>
            <div class="fitting-tile-actions">
              <button class="fitting-add-canvas" :aria-label="`${item.name}をキャンバスに追加`" @click="$emit('add-to-canvas', item)"><Plus :size="11" />資料として追加</button>
              <button v-if="item.source" class="fitting-remove-local" :aria-label="`${item.name}を衣装棚から削除`" @click="wardrobe.removeGenerated(item.id)">削除</button>
            </div>
          </div>
        </div>
        <div v-if="!categoryItems.length" class="fitting-library-empty"><Search :size="22" :stroke-width="1.2" /><p>{{ source === 'local' && !query ? 'この部位の生成衣装はまだありません。' : '条件に合う衣装がありません。' }}</p><button v-if="source === 'local' && !query" class="button secondary" @click="$emit('generate')"><Plus :size="13" />衣装を生成</button><button v-else class="text-link" @click="query = ''">検索をクリア</button></div>
      </div>
    </div>
    <p class="fitting-library-hint"><MousePointer2 :size="12" />{{ avatar.browsingPoses ? 'クリックでポーズを変更 · 衣装も自動調整' : 'クリックで試着 · ドラッグでキャンバスへ' }}</p>
  </aside>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Shirt, Layers2, LayoutGrid, Footprints, Glasses, ShoppingBag, Gem, Search, CircleSlash, Check, Plus, MousePointer2, Accessibility } from "lucide-vue-next";
import PosePicker from "~/components/PosePicker.vue";
import { useAvatar } from "~/composables/useAvatar";
import { studioPoses } from "~/data/studioPoses";
import { setGarmentDragData } from "~/utils/canvasDnd";
import type { Garment, Category, PresetAudience } from "~/types/wardrobe";
import { useWardrobe } from "~/composables/useWardrobe";
const wardrobe = useWardrobe();
const avatar = useAvatar();
defineEmits<{ generate: []; "add-to-canvas": [item: Garment] }>();
const source = ref<"preset" | "local">("preset");
const query = ref("");
const audiences:{id:PresetAudience;name:string}[] = [{id:"womens",name:"レディース"},{id:"mens",name:"メンズ"},{id:"unisex",name:"共用"}];
watch(() => avatar.browsingPoses, () => { query.value = ""; });
watch(() => wardrobe.selections[wardrobe.activeCategory], (selectedId) => {
  if (!selectedId) return;
  const selectedItem = wardrobe.catalog.items.find(item => item.id === selectedId);
  if (selectedItem?.source) source.value = "local";
});
const filteredPoses = computed(() => studioPoses.filter(pose => `${pose.name} ${pose.en}`.toLowerCase().includes(query.value.trim().toLowerCase())));
const icons = { underwear: LayoutGrid, socks: Footprints, inner: Shirt, tops: Shirt, outer: Layers2, bottoms: LayoutGrid, shoes: Footprints, head: Glasses, bag: ShoppingBag, jewelry: Gem };
const labels: Record<Category, string> = { underwear: "インナー下", socks: "靴下", inner: "インナー上", tops: "トップス", outer: "アウター", bottoms: "ボトムス", shoes: "シューズ", head: "髪飾り", bag: "バッグ", jewelry: "アクセ" };
const categoryItems = computed(() => wardrobe.catalog.items.filter(item =>
  (item.category === wardrobe.activeCategory || wardrobe.activeCategory === "socks" && item.kind === "tights") && Boolean(item.source) === (source.value === "local") &&
  wardrobe.matchesAudience(item) &&
  `${item.name} ${item.name_en} ${item.material}`.toLowerCase().includes(query.value.trim().toLowerCase()),
));
</script>
