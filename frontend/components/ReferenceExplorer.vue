<template>
  <div class="reference-explorer">
    <div class="reference-controls">
      <div>
        <span class="eyebrow">REFERENCE SEARCH</span>
        <h3>形と素材を、もっと詳しく。</h3>
      </div>
      <label class="select-field"
        ><span class="sr-only">資料を探すパーツ</span
        ><select v-model="itemId">
          <option value="">パーツを選択</option>
          <option
            v-for="item in wardrobe.catalog.items"
            :key="item.id"
            :value="item.id"
          >
            {{ item.name }}
          </option></select
        ><ChevronDown :size="13"
      /></label>
    </div>
    <p class="reference-intro">
      選んだアイテムの作画資料を検索します。イラストはDanbooru、質感・着こなしはPinterestで。
    </p>
    <div v-if="selectedItem" class="reference-search-actions">
      <button class="button primary" :disabled="loading" @click="search">
        <LoaderCircle v-if="loading" class="spin" :size="14" /><Search
          v-else
          :size="14"
        />{{ loading ? "APIで検索中…" : "資料を検索する" }}</button
      ><a
        :href="danbooruURL"
        target="_blank"
        rel="noopener noreferrer"
        class="text-link"
        >Danbooruで開く<ArrowUpRight :size="12" /></a
      ><a
        :href="pinterestURL"
        target="_blank"
        rel="noopener noreferrer"
        class="text-link"
        >Pinterestで開く<ArrowUpRight :size="12"
      /></a>
    </div>
    <p v-if="error" class="inline-error" role="alert">{{ error }}</p>
    <p v-if="outdated" class="reference-notice">
      検索対象が変わりました。「資料を検索する」で更新できます。
    </p>
    <div v-if="!providers.length && !loading" class="reference-empty">
      <ScanSearch :size="35" :stroke-width="1" />
      <h4>衣装のディテールを探そう</h4>
      <p>APIで検索するか、各サイトの検索リンクから資料を探せます。</p>
    </div>
    <section
      v-for="provider in providers"
      :key="provider.source"
      class="provider-section"
    >
      <div class="provider-title">
        <h4>{{ provider.source === "danbooru" ? "Danbooru" : "Pinterest" }}</h4>
        <span class="provider-status" :class="provider.status">{{
          provider.status === "connected"
            ? "接続済み"
            : provider.status === "not_configured"
              ? "未接続"
              : "接続できません"
        }}</span>
      </div>
      <p v-if="provider.message" class="provider-message">
        {{ provider.message }}
      </p>
      <p
        v-if="provider.status === 'connected' && !provider.items.length"
        class="provider-message"
      >
        この条件の資料は見つかりませんでした。
      </p>
      <div class="reference-image-grid">
        <a
          v-for="image in provider.items"
          :key="image.id"
          :href="image.url"
          target="_blank"
          rel="noopener noreferrer"
          ><div>
            <img
              v-if="image.thumbnail && !failedImages.has(image.id)"
              :src="image.thumbnail"
              :alt="image.title"
              loading="lazy"
              referrerpolicy="no-referrer"
              @error="failedImages.add(image.id)"
            /><span v-else
              >元の作品ページで確認<ArrowUpRight :size="16"
            /></span>
          </div>
          <strong>{{ image.title }}</strong
          ><span
            >{{ image.credit || provider.source
            }}<ArrowUpRight :size="11" /></span
        ></a>
      </div>
    </section>
    <p class="reference-footnote">
      外部画像は元サイトの資料です。閲覧・利用条件は各作品ページをご確認ください。
    </p>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  ChevronDown,
  LoaderCircle,
  Search,
  ArrowUpRight,
  ScanSearch,
} from "lucide-vue-next";
import { useWardrobe } from "~/composables/useWardrobe";
import type { ReferenceProvider } from "~/types/wardrobe";
const wardrobe = useWardrobe();
const itemId = ref(
  wardrobe.selections[wardrobe.activeCategory] ||
    wardrobe.catalog.items[0]?.id ||
    "",
);
const selectedItem = computed(() =>
  wardrobe.catalog.items.find((i) => i.id === itemId.value),
);
const danbooruURL = computed(
  () =>
    "https://danbooru.donmai.us/posts?" +
    new URLSearchParams({
      tags: (selectedItem.value?.tags[0] || "blouse") + " rating:g",
    }),
);
const pinterestURL = computed(
  () =>
    "https://www.pinterest.com/search/pins/?" +
    new URLSearchParams({ q: selectedItem.value?.name_en || "fashion" }),
);
const providers = ref<ReferenceProvider[]>([]);
const loading = ref(false);
const error = ref("");
const searchedId = ref("");
const failedImages = ref(new Set<string>());
const outdated = computed(
  () => !!providers.value.length && searchedId.value !== itemId.value,
);
watch(
  () => wardrobe.activeCategory,
  () => {
    itemId.value =
      wardrobe.selections[wardrobe.activeCategory] ||
      wardrobe.catalog.items.find((i) => i.category === wardrobe.activeCategory)
        ?.id ||
      "";
  },
);
async function search() {
  if (!itemId.value || loading.value) return;
  loading.value = true;
  error.value = "";
  const snapshot = itemId.value;
  try {
    const response = await $fetch<{ providers: ReferenceProvider[] }>(
      "/api/references",
      { query: { item_id: selectedItem.value?.baseId || snapshot } },
    );
    providers.value = response.providers;
    searchedId.value = snapshot;
    failedImages.value.clear();
  } catch {
    error.value =
      "資料を取得できませんでした。接続を確認して再試行してください。";
  } finally {
    loading.value = false;
  }
}
</script>
