<template>
  <main class="costume-gallery">
    <div class="gallery-heading">
      <div>
        <span class="eyebrow">WARDROBE</span>
        <h2>
          {{ activeSlotDef?.labelJa || "すべてのパーツ"
          }}<span>{{ items.length }}</span>
        </h2>
      </div>
      <span class="gallery-heading-icon"
        ><Shirt :size="22" :stroke-width="1.3"
      /></span>
    </div>
    <StyleFilterBar />
    <div class="gallery-results" :aria-busy="isLoading">
      <div class="results-label">
        <span>{{ selectedQuickTag ? "絞り込み結果" : "アイテムを選ぶ" }}</span
        ><span>クリックでコーデに追加</span>
      </div>
      <div v-if="isLoading" class="item-grid">
        <div v-for="n in 6" :key="n" class="item-skeleton" />
      </div>
      <template v-else>
        <div class="item-grid">
          <button
            v-if="board.activeSlot !== 'all'"
            class="item-card utility-card"
            :class="{ selected: !board.slots[board.activeSlot].item }"
            @click="board.removeItem(board.activeSlot)"
          >
            <span class="item-art none-art"
              ><CircleSlash :size="28" :stroke-width="1" /><span
                >アイテムを外す</span
              ></span
            ><span class="item-name">なし</span
            ><span class="item-subtitle">シンプルにまとめる</span>
          </button>
          <button
            v-for="item in items"
            :key="item.id"
            class="item-card"
            :class="{ selected: isEquipped(item) }"
            draggable="true"
            :aria-pressed="isEquipped(item)"
            @dragstart="startDrag(item, $event)"
            @click="equip(item)"
          >
            <span class="item-art"
              ><GarmentArtwork :key="item.id" :item="item" /><span
                v-if="isEquipped(item)"
                class="equipped-check"
                ><Check :size="12" /></span
              ><span class="item-source">{{
                item.previewUrl.startsWith("data:") ? "シルエット" : "イラスト"
              }}</span></span
            ><span class="item-name" :title="item.title">{{
              displayTitle(item)
            }}</span
            ><span class="item-subtitle"
              ><span
                v-for="(color, i) in item.dominantColors.slice(0, 3)"
                :key="i"
                class="mini-swatch"
                :style="{ background: color }"
              /><span>{{
                item.source === "danbooru" ? "イラスト資料" : "質感資料"
              }}</span></span
            >
          </button>
        </div>
        <div v-if="!items.length" class="empty-results">
          <SearchX :size="28" />
          <h3>アイテムが見つかりませんでした</h3>
          <p>キーワードやスタイルを変えてみてください。</p>
        </div>
        <button
          v-if="hasMore && items.length"
          class="load-more"
          :disabled="isLoadingMore"
          @click="loadMore"
        >
          {{ isLoadingMore ? "読み込み中…" : "もっとアイテムを見る"
          }}<ChevronDown :size="14" />
        </button>
      </template>
    </div>
    <div class="gallery-footnote">
      <Info :size="13" /><span
        >シルエットは形・配色を検討するための図案です。</span
      >
    </div>
  </main>
</template>
<script setup lang="ts">
import {
  Shirt,
  CircleSlash,
  Check,
  SearchX,
  ChevronDown,
  Info,
} from "lucide-vue-next";
import type { CostumeItem } from "~/types/costume";
import { useFittingBoard } from "~/composables/useFittingBoard";
import { useCostumeSearch } from "~/composables/useCostumeSearch";
const board = useFittingBoard();
const search = useCostumeSearch();
const {
  items,
  isLoading,
  isLoadingMore,
  hasMore,
  activeSlotDef,
  selectedQuickTag,
  loadMore,
} = search;
function isEquipped(item: CostumeItem) {
  return board.slots[item.category].item?.id === item.id;
}
function equip(item: CostumeItem) {
  board.equipItem(item, item.category);
}
function displayTitle(item: CostumeItem) {
  return item.title
    .replace(/【[^】]+】/g, "")
    .replace(/ 作画リファレンス.*/, "")
    .replace(/ 衣装資料.*/, "");
}
function startDrag(item: CostumeItem, event: DragEvent) {
  if (event.dataTransfer) {
    event.dataTransfer.setData("application/json", JSON.stringify(item));
    event.dataTransfer.effectAllowed = "copy";
  }
}
</script>
