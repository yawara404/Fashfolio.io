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
        <h1 v-else>試着・キャンバス</h1>
        <p v-if="mode === 'outfit'">
          衣装と色を組み合わせて、キャラクターの装いを考える。
        </p>
        <p v-else>
          頭身・丈・配色を見比べて、描く前のイメージを整える。
        </p>
      </div>
      <div class="intro-right">
        <span class="draft-status" role="status">{{ wardrobe.draftStatus }}</span>
        <div class="coordinate-history" role="group" aria-label="コーデの編集履歴">
          <button class="icon-button" :disabled="!wardrobe.canUndo" aria-label="コーデの変更を元に戻す" title="元に戻す" @click="wardrobe.undo()"><Undo2 :size="15" /></button>
          <button class="icon-button" :disabled="!wardrobe.canRedo" aria-label="コーデの変更をやり直す" title="やり直す" @click="wardrobe.redo()"><Redo2 :size="15" /></button>
        </div>
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
      :class="[{ 'tryon-workspace': mode === 'try-on' }, `mobile-pane-${mobilePane}`]"
      :aria-busy="wardrobe.loading"
    >
      <TryOnWardrobe v-if="mode === 'try-on'" @generate="generationOpen = true" @add-to-canvas="fittingStudio?.addGarment($event); mobilePane = 'main'" />
      <OutfitPanel v-else />
      <TryOnStudio v-if="mode === 'try-on'" ref="fittingStudio" />
      <main v-else class="wardrobe-main">
        <div class="wardrobe-topline">
          <div>
            <span class="eyebrow">02 / WARDROBE LIBRARY</span>
            <h2>衣装ライブラリ <span class="library-count" :aria-label="`${wardrobe.catalog.items.length}点の衣装`">{{ wardrobe.catalog.items.length }}</span></h2>
          </div>
          <div class="wardrobe-actions">
            <div class="view-switch">
              <button
                :class="{ active: view === 'atlas' }"
                :aria-pressed="view === 'atlas'"
                @click="view = 'atlas'"
              >
                <LayoutGrid :size="14" />パーツ図鑑
              </button>
              <button
                :class="{ active: view === 'references' }"
                :aria-pressed="view === 'references'"
                @click="view = 'references'"
              >
                <Search :size="14" />資料を探す
              </button>
            </div>
            <button class="button lab-trigger" @click="generationOpen = true">
              <Plus :size="13" />衣装を生成
            </button>
          </div>
        </div>
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
      <OutfitPanel v-if="mode === 'try-on'" inspector @select-pose="mobilePane = 'details'" /><PromptPanel v-else />
    </div>
    <nav class="mobile-pane-nav" aria-label="作業パネル">
      <button :class="{ active: mobilePane === 'coordinate' }" :aria-pressed="mobilePane === 'coordinate'" @click="mobilePane = 'coordinate'"><Palette :size="18" /><span>コーデ・配色</span></button>
      <button :class="{ active: mobilePane === 'main' }" :aria-pressed="mobilePane === 'main'" @click="mobilePane = 'main'"><component :is="mode === 'outfit' ? Shirt : PencilRuler" :size="18" /><span>{{ mode === 'outfit' ? '衣装ライブラリ' : '試着・キャンバス' }}</span></button>
      <button :class="{ active: mobilePane === 'details' }" :aria-pressed="mobilePane === 'details'" @click="mobilePane = 'details'"><component :is="mode === 'outfit' ? FileText : Layers2" :size="18" /><span>{{ mode === 'outfit' ? '作画メモ・出力' : '衣装を選ぶ' }}</span></button>
    </nav>
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
        >{{ wardrobe.catalog.items.length }} wardrobe pieces<template v-if="cloudStorageState.configured"><span class="footer-divider">/</span>{{ cloudStorageState.message }}</template></span
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
      <div class="cloud-storage-summary" role="status">
        <Cloud :size="16" /><span>{{ cloudStorageState.message }}</span>
        <button v-if="cloudStorageState.configured" class="text-link" :disabled="cloudStorageState.phase === 'syncing'" @click="flushCloudWorkspace()">{{ cloudStorageState.phase === 'error' ? '再試行' : '今すぐ同期' }}</button>
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
            >{{ outfit.item_ids.length }} parts · {{ outfit.gender === 'boy' ? '少年' : outfit.gender === 'girl' ? '少女' : '' }} {{ outfit.heads ? `${outfit.heads}頭身 · ` : '' }}
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
import { Plus } from "lucide-vue-next";
import StudioHeader from "~/components/ui/StudioHeader.vue";
import {
  Shirt,
  Palette,
  FileText,
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
  Undo2,
  Redo2,
  Cloud,
  Footprints,
  Glasses,
  ShoppingBag,
  Gem,
} from "lucide-vue-next";
import TryOnStudio from "~/components/TryOnStudio.vue";
import type { Category } from "~/types/wardrobe";
import { useWardrobe } from "~/composables/useWardrobe";
import { cloudStorageState, flushCloudWorkspace } from "~/utils/cloudStorage";
defineProps<{ mode: "outfit" | "try-on" }>();
const wardrobe = useWardrobe();
const mobilePane = ref<"coordinate" | "main" | "details">("main");
const view = ref<"atlas" | "references">("atlas");
const savedDialog = ref<HTMLDialogElement | null>(null);
const icons = {
  underwear: LayoutGrid,
  socks: Footprints,
  inner: Shirt,
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
const fittingStudio = ref<InstanceType<typeof TryOnStudio> | null>(null);
const generationOpen = ref(false);
onMounted(() => {
  if (!wardrobe.catalog.items.length) wardrobe.initialize();
});
</script>
