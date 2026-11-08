<template>
  <div class="gallery-filters">
    <form class="search-field" @submit.prevent="submit">
      <Search :size="16" /><input
        v-model="searchQuery"
        type="search"
        aria-label="衣装を検索"
        placeholder="キーワードで探す（例：ブラウス）"
      /><button type="submit" aria-label="検索する">
        <ArrowRight :size="16" />
      </button>
    </form>
    <div class="filter-line">
      <label for="style-filter">スタイル</label>
      <div class="select-wrap">
        <select
          id="style-filter"
          :value="selectedStyleId || ''"
          @change="changeStyle"
        >
          <option value="">すべてのスタイル</option>
          <option
            v-for="style in STYLE_PRESETS"
            :key="style.id"
            :value="style.id"
          >
            {{ style.label }}
          </option></select
        ><ChevronDown :size="14" />
      </div>
    </div>
    <div class="source-switch" aria-label="資料の種類">
      <button
        v-for="source in sources"
        :key="source.id"
        :class="{ active: sourceFilter === source.id }"
        :aria-pressed="sourceFilter === source.id"
        @click="setSourceFilter(source.id)"
      >
        {{ source.label }}
      </button>
    </div>
    <div class="quick-tags">
      <button
        :class="{ active: !selectedQuickTag }"
        :aria-pressed="!selectedQuickTag"
        @click="clearTag"
      >
        すべて</button
      ><button
        v-for="tag in activeSlotDef?.quickTags || []"
        :key="tag.danbooruTag"
        :class="{ active: selectedQuickTag === tag.danbooruTag }"
        :aria-pressed="selectedQuickTag === tag.danbooruTag"
        @click="applyQuickTag(tag.danbooruTag)"
      >
        {{ tag.label.replace(/ \(.*\)/, "") }}
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Search, ArrowRight, ChevronDown } from "lucide-vue-next";
import { STYLE_PRESETS, type SourceFilter } from "~/types/costume";
import { useCostumeSearch } from "~/composables/useCostumeSearch";
import { useFittingBoard } from "~/composables/useFittingBoard";
const search = useCostumeSearch();
const board = useFittingBoard();
const {
  searchQuery,
  selectedStyleId,
  selectedQuickTag,
  sourceFilter,
  activeSlotDef,
  applyQuickTag,
  setSourceFilter,
} = search;
const sources: { id: SourceFilter; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "danbooru", label: "イラスト資料" },
  { id: "pinterest", label: "質感資料" },
];
function submit() {
  selectedQuickTag.value = "";
  search.fetchCostumes(true);
}
function clearTag() {
  selectedQuickTag.value = "";
  search.fetchCostumes(true);
}
function changeStyle(event: Event) {
  selectedStyleId.value = (event.target as HTMLSelectElement).value || null;
  selectedQuickTag.value = "";
  board.activeStyleId = selectedStyleId.value;
  search.fetchCostumes(true);
  board.refreshPalette();
}
</script>
