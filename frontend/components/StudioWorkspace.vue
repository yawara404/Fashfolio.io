<template>
  <div class="app-shell">
    <StudioHeader
      :mode="mode"
      :saved-count="wardrobe.saved.length"
      @open-saved="savedDialog?.showModal()"
    />
    <section class="intro-bar">
      <div>
        <div class="intro-eyebrow"><span />FASHFOLIO STUDIO</div>
        <h1 v-if="mode === 'outfit'">衣装・配色を組み立てる</h1>
        <h1 v-else>少年・少女でコーデを確認</h1>
        <p v-if="mode === 'outfit'">
          パーツを選び、作画設定とAIプロンプトをまとめる。
        </p>
        <p v-else>
          デフォルメした少年・少女の頭身を切り替えて、衣装のバランスを見比べる。
        </p>
      </div>
      <div class="intro-right">
        <span class="tool-badge"
          ><PencilRuler :size="13" />絵師のためのコーデプロンプトメーカー</span
        ><button
          class="button save-button"
          :disabled="!wardrobe.selectedItems.length"
          @click="wardrobe.save()"
        >
          <Bookmark :size="14" />このコーデを保存
        </button>
      </div>
    </section>
    <div v-if="wardrobe.error" class="connection-error" role="alert">
      <ServerOff :size="24" />
      <h2>バックエンドに接続できません</h2>
      <p>{{ wardrobe.error }}</p>
      <button class="button primary" @click="wardrobe.initialize()">
        再接続する<RotateCw :size="14" />
      </button>
    </div>
    <div
      v-else
      class="studio-workspace"
      :class="{ 'tryon-workspace': mode === 'try-on' }"
      :aria-busy="wardrobe.loading"
    >
      <OutfitPanel />
      <TryOnStudio v-if="mode === 'try-on'" />
      <main v-else class="wardrobe-main">
        <div class="wardrobe-topline">
          <div>
            <span class="eyebrow">02 / WARDROBE LIBRARY</span>
            <h2>服を選ぶ、想像がふくらむ。</h2>
          </div>
          <div class="view-switch">
            <button
              :class="{ active: view === 'atlas' }"
              :aria-pressed="view === 'atlas'"
              @click="view = 'atlas'"
            >
              <LayoutGrid :size="14" />パーツ図鑑</button
            ><button
              :class="{ active: view === 'references' }"
              :aria-pressed="view === 'references'"
              @click="view = 'references'"
            >
              <Search :size="14" />資料を探す
            </button>
          </div>
        </div>
        <div class="clothing-lab-toolbar"><span><Sparkles :size="13" />選んで、着せ替えて、描く。</span><button class="button lab-trigger" @click="generationOpen = true"><Plus :size="13" />この部位の衣装を生成</button></div>
        <nav class="category-tabs" aria-label="衣装の部位">
          <button
            v-for="category in wardrobe.catalog.categories"
            :key="category.id"
            :class="{ active: wardrobe.activeCategory === category.id }"
            :aria-pressed="wardrobe.activeCategory === category.id"
            @click="selectCategory(category.id)"
          >
            <component
              :is="icons[category.id]"
              :size="20"
              :stroke-width="1.3"
            /><span>{{ category.name }}</span
            ><i v-if="wardrobe.selections[category.id]" />
          </button>
        </nav>
        <template v-if="view === 'atlas'"
          ><div class="atlas-controls">
            <div class="atlas-search">
              <Search :size="15" /><input
                v-model="wardrobe.query"
                type="search"
                :aria-label="`${wardrobe.activeDefinition?.name || 'パーツ'}を検索`"
                placeholder="名前・素材・タグから探す"
              />
            </div>
            <label class="style-select"
              ><span class="sr-only">コーデのスタイル</span
              ><select v-model="wardrobe.style">
                <option
                  v-for="style in wardrobe.catalog.styles"
                  :key="style.id"
                  :value="style.id"
                >
                  {{ style.name }}
                </option></select
              ><ChevronDown :size="12" /></label
            ><label class="style-filter"
              ><input v-model="wardrobe.styleFilter" type="checkbox" /><span
                >このスタイルのみ</span
              ></label
            >
          </div>
          <div class="atlas-scroll">
            <div class="atlas-heading">
              <span>{{ wardrobe.activeDefinition?.en || "WARDROBE" }}</span
              ><span
                >{{ wardrobe.visibleItems.length }} items
                <span class="atlas-heading-separator">/</span> CLOTHING ASSETS</span
              >
            </div>
            <div v-if="wardrobe.loading" class="garment-grid">
              <div v-for="n in 6" :key="n" class="garment-skeleton" />
            </div>
            <div v-else-if="wardrobe.visibleItems.length" class="garment-grid">
              <GarmentCard
                v-for="(item, index) in wardrobe.visibleItems"
                :key="item.id"
                :item="item"
                :index="index"
                :selected="wardrobe.selections[item.category] === item.id"
                @select="wardrobe.choose"
                @delete="wardrobe.removeGenerated"
              />
            </div>
            <div v-else class="atlas-empty">
              <SearchX :size="28" :stroke-width="1" />
              <h3>条件に合うパーツがありません</h3>
              <p>
                キーワードを変えるか、スタイルの絞り込みを外してみてください。
              </p>
              <button
                class="text-link"
                @click="
                  wardrobe.query = '';
                  wardrobe.styleFilter = false;
                "
              >
                絞り込みをリセットする<ArrowRight :size="13" />
              </button>
            </div>
            <div class="atlas-bottom-note">
              <MousePointer2 :size="13" /><span
                >カードをクリックでコーデに追加。パーツごとに形と素材を見比べられます。</span
              >
            </div>
          </div></template
        >
        <ReferenceExplorer v-else />
      </main>
      <TryOnWardrobe v-if="mode === 'try-on'" @generate="generationOpen = true" /><PromptPanel v-else />
    </div>
    <footer class="app-footer">
      <span
        ><i
          class="status-dot"
          :class="{ ready: wardrobe.integrations?.ollama.ready }"
        />{{
          wardrobe.integrations?.ollama.ready
            ? "Ollama connected"
            : "Local prompt studio"
        }}<span class="footer-divider">/</span
        >{{ wardrobe.catalog.items.length }} wardrobe pieces</span
      ><button @click="wardrobe.refreshIntegrations()">
        接続状態を更新<RotateCw :size="10" /></button
      ><span>Fashfolio & Reflens — tools for your creative process.</span>
    </footer>
    <LocalGenerationDialog :open="generationOpen" @close="generationOpen = false" />
    <Transition name="toast"
      ><div v-if="wardrobe.toast" class="toast-message" role="status">
        <Check :size="15" /><span>{{ wardrobe.toast }}</span
        ><button aria-label="通知を閉じる" @click="wardrobe.toast = ''">
          <X :size="14" />
        </button></div
    ></Transition>
    <dialog
      ref="savedDialog"
      class="saved-dialog"
      aria-labelledby="saved-title"
      @click="closeOnBackdrop"
    >
      <div class="dialog-heading">
        <div>
          <span class="eyebrow">YOUR COLLECTION</span>
          <h2 id="saved-title">保存したコーデ</h2>
        </div>
        <button
          class="icon-button"
          aria-label="閉じる"
          @click="savedDialog?.close()"
        >
          <X :size="20" />
        </button>
      </div>
      <p v-if="!wardrobe.saved.length" class="saved-empty">
        気に入った組み合わせを保存すると、ここから呼び出せます。
      </p>
      <div
        v-for="outfit in wardrobe.saved"
        :key="outfit.id"
        class="saved-outfit"
      >
        <button
          class="saved-outfit-load"
          @click="
            wardrobe.load(outfit);
            savedDialog?.close();
          "
        >
          <span class="saved-palette"
            ><i
              v-for="(color, index) in outfit.palette"
              :key="index"
              :style="{ background: color }" /></span
          ><strong>{{ outfit.name }}</strong
          ><span
            >{{ outfit.item_ids.length }} parts ·
            {{ new Date(outfit.createdAt).toLocaleDateString("ja-JP") }}</span
          ></button
        ><button
          class="icon-button"
          :aria-label="`${outfit.name}を削除`"
          @click="wardrobe.deleteSaved(outfit.id)"
        >
          <Trash2 :size="15" />
        </button>
      </div>
      <p class="saved-storage-note">
        <HardDrive :size="12" />このブラウザに最大20件保存されます。
      </p>
    </dialog>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Sparkles, Plus } from "lucide-vue-next";
import StudioHeader from "~/components/ui/StudioHeader.vue";
import {
  Shirt,
  PencilRuler,
  Bookmark,
  ServerOff,
  RotateCw,
  LayoutGrid,
  Search,
  ChevronDown,
  SearchX,
  ArrowRight,
  MousePointer2,
  Check,
  X,
  Trash2,
  HardDrive,
  Layers2,
  Footprints,
  Glasses,
  ShoppingBag,
  Gem,
} from "lucide-vue-next";
import type { Category } from "~/types/wardrobe";
import { useWardrobe } from "~/composables/useWardrobe";
defineProps<{ mode: "outfit" | "try-on" }>();
const wardrobe = useWardrobe();
const view = ref<"atlas" | "references">("atlas");
const savedDialog = ref<HTMLDialogElement | null>(null);
const icons = {
  tops: Shirt,
  outer: Layers2,
  bottoms: LayoutGrid,
  shoes: Footprints,
  head: Glasses,
  bag: ShoppingBag,
  jewelry: Gem,
};
function selectCategory(category: Category) {
  wardrobe.activeCategory = category;
  wardrobe.query = "";
}
function closeOnBackdrop(event: MouseEvent) {
  const dialog = savedDialog.value;
  if (!dialog || event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    dialog.close();
}
const generationOpen = ref(false);
onMounted(() => {
  if (!wardrobe.catalog.items.length) wardrobe.initialize();
});
</script>
