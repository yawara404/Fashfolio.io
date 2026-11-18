<template>
  <dialog ref="dialog" class="generation-dialog" aria-labelledby="generation-title" @close="device.dialogOpen = false; $emit('close')" @click="closeOnBackdrop">
    <div class="dialog-heading">
      <div><span class="eyebrow">LOCAL CLOTHING LAB</span><h2 id="generation-title">自分だけの衣装を描く</h2></div>
      <button class="icon-button" aria-label="衣装生成を閉じる" @click="dialog?.close()"><X :size="20" /></button>
    </div>
    <p class="generation-lead">着せ替えゲームの衣装パーツを、あなたの端末で。<br />生成した衣装はこのブラウザの衣装棚に保存できます。</p>
    <div class="device-status" :class="{ available: device.supported }">
      <Cpu :size="19" /><div><strong>{{ device.supported === null ? '端末を確認中…' : device.supported ? 'この端末のGPUで生成' : 'この端末では画像生成を利用できません' }}</strong>
      <p>{{ device.supported === false ? 'WebGPU（shader-f16）対応のPC版Chrome / Edgeでお試しください。衣装選び・試着はこのまま使えます。' : 'Stable Diffusion Turbo · 512 × 512 · 処理中もほかのパーツを編集できます' }}</p></div>
    </div>
    <div class="generation-mode-tabs" role="tablist" aria-label="生成モード">
      <button type="button" role="tab" :class="{ active: generationMode === 'single' }" :aria-selected="generationMode === 'single'" :disabled="generatingLocal" @click="switchToSingleMode()">1パーツ生成</button>
      <button type="button" role="tab" :class="{ active: generationMode === 'batch' }" :aria-selected="generationMode === 'batch'" :disabled="generatingLocal" @click="switchToBatchMode()">1コーデまとめて生成</button>
    </div>
    <div v-if="generationMode === 'single'" class="generation-columns">
      <div class="generation-form">
        <label class="field-label" for="generation-base">形のベース / {{ selectedCategoryName }}</label>
        <button id="generation-base" type="button" class="base-picker-trigger" :data-base-id="base?.id || ''" :disabled="generatingLocal" @click="openBasePicker()">
          <span class="base-picker-thumb">
            <img v-if="base" :src="wardrobe.previewImage(base)" :alt="base.name" />
          </span>
          <span class="base-picker-meta">
            <strong>{{ base ? base.name : 'ベースを選択してください' }}</strong>
            <small>{{ base ? `${base.name_en} · ${base.material}` : 'クリックして一覧から選ぶ' }}</small>
          </span>
          <span class="base-picker-action"><LayoutGrid :size="14" />変更</span>
        </button>
        <label class="field-label" for="generation-name">衣装の名前</label>
        <input id="generation-name" v-model="name" maxlength="60" :disabled="generatingLocal" placeholder="例: 春のカフェのブラウス" />
        <p class="field-help">コーデ名を入れると、英語プロンプトと絵柄を自動で作ります。「春」「カフェ」「水彩」などの言葉が使えます。</p>
        <div class="field-label-row">
          <label class="field-label" for="generation-description">描きたい衣装（英語・任意）</label>
          <button type="button" class="text-link auto-prompt-button" :disabled="generatingLocal || !base" @click="regenerateDescriptionFromName">コーデ名から再生成</button>
        </div>
        <textarea id="generation-description" v-model="description" rows="3" maxlength="250" :disabled="generatingLocal" placeholder="ribbon-tie blouse, puff sleeves, cotton" />
        <p class="field-help prompt-auto-state" :class="{ manual: !descriptionIsAuto }">
          <Wand2 :size="11" />
          <span>{{ descriptionIsAuto ? 'コーデ名から英語プロンプトを自動入力中' : '手動編集（コーデ名を変えても自動更新しません）' }}</span>
          <span v-if="descriptionIsAuto && descriptionEngine !== 'idle'" class="prompt-engine" :class="[descriptionEngine, { loading: descriptionTranslating }]" :title="descriptionTranslationNotice">
            {{ descriptionTranslating ? 'Ollamaで英訳中…' : descriptionEngine === 'ollama' ? 'Ollama英訳' : '辞書英訳' }}
          </span>
        </p>
        <p v-if="descriptionIsAuto && descriptionUnknown.length" class="field-help prompt-unknown">未対応の言葉: {{ descriptionUnknown.join('・') }}。英語で追記すると反映されます。</p>
        <label class="prompt-preset-select" for="generation-preset">
          <span>絵柄プリセット</span>
          <select id="generation-preset" v-model="artStylePreset" :disabled="generatingLocal">
            <option value="auto">コーデ名から自動（未指定はシンプル）</option>
            <option v-for="preset in ART_STYLE_PRESETS" :key="preset.id" :value="preset.id">
              {{ preset.name }}
            </option>
          </select>
          <small>{{ presetHint }}</small>
        </label>
        <p class="generation-guard"><UserX :size="12" />人物と背景は描かず、衣装だけを白背景で生成します。</p>
        <PromptSuggestionGuide :disabled="generatingLocal" @pick="addDescriptionSuggestion" />
        <p class="field-help">形のベースは試着時の配置・サイズに使います。</p>
        <div class="generation-settings"><label for="generation-seed">Seed<input id="generation-seed" v-model.number="seed" type="number" min="1" max="4294967295" :disabled="generatingLocal" /></label><button class="icon-button" :disabled="generatingLocal" aria-label="Seedをランダムにする" @click="randomSeed"><Shuffle :size="15" /></button></div>
        <label class="generation-cutout"><input v-model="cutout" type="checkbox" :disabled="generatingLocal" />白背景を簡易透過する</label>
      </div>
      <div class="generation-result">
        <div class="generation-canvas">
          <img v-if="device.preview" :src="device.preview" alt="この端末で生成した衣装。輪郭と背景を確認してください" />
          <div v-else><LoaderCircle v-if="device.busy" :size="32" class="spin" /><Sparkles v-else :size="32" :stroke-width="1" /><strong>{{ generatingGarment ? '衣装を準備しています' : device.busy ? (device.message || 'モデルを準備しています') : 'ここに衣装が届きます' }}</strong><span>生成後、輪郭と背景を確認して<br />衣装棚に追加してください。</span></div>
        </div>
        <p v-if="device.preview" class="generation-result-meta">Seed {{ device.resultSeed }} · {{ device.duration }}秒 · PNG</p>
        <button v-if="device.preview" class="button primary generation-add" :disabled="adding || added" @click="addToWardrobe"><Check v-if="added" :size="15" /><Plus v-else :size="15" />{{ added ? '衣装棚に追加しました' : '衣装棚に追加して着用' }}</button>
        <a v-if="device.preview" :href="device.preview" class="text-link generation-download" :download="`${name || 'fashfolio-clothing'}.png`"><Download :size="13" />PNGを保存</a>
      </div>
    </div>
    <div v-else class="generation-columns generation-columns-batch">
      <div class="generation-form">
        <label class="field-label" for="batch-outfit-name">コーデ名（任意）</label>
        <input id="batch-outfit-name" v-model="batchOutfitName" maxlength="40" :disabled="generatingLocal" placeholder="例: 春のガーリーコーデ" />
        <p class="field-help">コーデ名を入れるだけで、英語テーマと絵柄を自動で作ります。「春」「カフェ」「レトロ」などが使えます。</p>
        <div class="field-label-row">
          <label class="field-label" for="batch-theme">コーデのテーマ（英語・任意）</label>
          <button type="button" class="text-link auto-prompt-button" :disabled="generatingLocal" @click="regenerateThemeFromName">コーデ名から再生成</button>
        </div>
        <textarea id="batch-theme" v-model="batchTheme" rows="2" maxlength="160" :disabled="generatingLocal" placeholder="pastel girly, lace ribbon, soft cotton" />
        <p class="field-help prompt-auto-state" :class="{ manual: !themeIsAuto }">
          <Wand2 :size="11" />
          <span>{{ themeIsAuto ? 'コーデ名から英語プロンプトを自動入力中' : '手動編集（コーデ名を変えても自動更新しません）' }}</span>
          <span v-if="themeIsAuto && themeEngine !== 'idle'" class="prompt-engine" :class="[themeEngine, { loading: themeTranslating }]" :title="themeTranslationNotice">
            {{ themeTranslating ? 'Ollamaで英訳中…' : themeEngine === 'ollama' ? 'Ollama英訳' : '辞書英訳' }}
          </span>
        </p>
        <p v-if="themeIsAuto && themeUnknown.length" class="field-help prompt-unknown">未対応の言葉: {{ themeUnknown.join('・') }}。英語で追記すると反映されます。</p>
        <label class="prompt-preset-select" for="batch-art-preset">
          <span>絵柄プリセット</span>
          <select id="batch-art-preset" v-model="artStylePreset" :disabled="generatingLocal">
            <option value="auto">コーデ名から自動（未指定はシンプル）</option>
            <option v-for="preset in ART_STYLE_PRESETS" :key="preset.id" :value="preset.id">
              {{ preset.name }}
            </option>
          </select>
          <small>{{ presetHint }}</small>
        </label>
        <p class="generation-guard"><UserX :size="12" />人物と背景は描かず、衣装だけを白背景で生成します。</p>
        <PromptSuggestionGuide :disabled="generatingLocal" @pick="addThemeSuggestion" />
        <div class="batch-slots-header">
          <span class="field-label">生成する部位</span>
          <small>選択中 {{ enabledBatchSlots.length }}点</small>
        </div>
        <div class="batch-slot-list">
          <div v-for="slot in batchSlotViews" :key="slot.category" class="batch-slot-row" :class="{ active: slot.enabled }" :data-batch-slot="slot.category">
            <label class="batch-slot-check">
              <input v-model="slot.raw.enabled" type="checkbox" :disabled="generatingLocal" />
              <span>{{ slot.categoryName }}</span>
            </label>
            <button type="button" class="batch-slot-base" :disabled="generatingLocal" @click="openBasePicker(slot.category)">
              <span class="batch-slot-thumb">
                <img v-if="slot.baseItem" :src="wardrobe.previewImage(slot.baseItem)" :alt="slot.baseItem.name" />
              </span>
              <span class="batch-slot-base-name">{{ slot.baseItem?.name || '未選択' }}</span>
              <span class="batch-slot-change">変更</span>
            </button>
          </div>
        </div>
        <div class="generation-settings"><label for="batch-seed">開始Seed（部位ごとに +1）<input id="batch-seed" v-model.number="seed" type="number" min="1" max="4294967295" :disabled="generatingLocal" /></label><button class="icon-button" :disabled="generatingLocal" aria-label="Seedをランダムにする" @click="randomSeed"><Shuffle :size="15" /></button></div>
        <label class="generation-cutout"><input v-model="cutout" type="checkbox" :disabled="generatingLocal" />白背景を簡易透過する</label>
        <label class="generation-cutout"><input v-model="batchUsePalette" type="checkbox" :disabled="generatingLocal" />現在の配色パレットを反映する</label>
      </div>
      <div class="generation-result batch-result-panel">
        <div class="batch-result-header">
          <strong>生成結果</strong>
          <span v-if="generatingBatch && device.batchProgress">{{ device.batchProgress.current }} / {{ device.batchProgress.total }} · {{ device.batchProgress.label }}</span>
          <span v-else-if="device.batchResults.length">{{ completedBatchResults.length }} / {{ device.batchResults.length }}点完了</span>
          <span v-else>順番に生成します</span>
        </div>
        <div v-if="batchDisplayCards.length" class="batch-result-grid">
          <div v-for="card in batchDisplayCards" :key="card.key" class="batch-result-card" :class="{ pending: card.pending, failed: !!card.result?.error }" :data-batch-result="card.category">
            <div class="batch-result-thumb">
              <img v-if="card.result?.preview" :src="card.result.preview" :alt="card.result.name" />
              <div v-else-if="card.result?.error" class="batch-slot-error">
                <strong>透過に失敗</strong>
                <small>{{ card.result.error }}</small>
              </div>
              <div v-else class="batch-slot-pending">
                <LoaderCircle v-if="card.current" :size="20" class="spin" />
                <Sparkles v-else :size="18" :stroke-width="1.2" />
                <small>{{ card.current ? '生成中…' : '待機中' }}</small>
              </div>
            </div>
            <div class="batch-result-meta">
              <strong>{{ card.categoryName }}</strong>
              <small>{{ card.title }}</small>
            </div>
            <div v-if="card.result" class="batch-result-actions">
              <button type="button" class="text-link" :disabled="device.busy" @click="regenerateBatchItemAt(card.resultIndex)">再生成</button>
              <a v-if="card.result.preview" :href="card.result.preview" class="text-link" :download="`${card.result.name || 'fashfolio-clothing'}.png`"><Download :size="12" />PNG</a>
            </div>
          </div>
        </div>
        <div v-else class="generation-canvas batch-empty-canvas">
          <div>
            <Sparkles :size="32" :stroke-width="1" />
            <strong>ここに1コーデの衣装が届きます</strong>
            <span>左で生成したい部位とテーマを選び、<br />下のボタンから順番に生成してください。</span>
          </div>
        </div>
        <button v-if="completedBatchResults.length" class="button primary generation-add" :disabled="adding || batchAllAdded || generatingBatch" @click="addBatchToWardrobe">
          <Check v-if="batchAllAdded" :size="15" />
          <Plus v-else :size="15" />
          {{ batchAllAdded ? '衣装棚に追加しました' : '衣装棚に追加してまとめて着用' }}
        </button>
        <p v-if="lockedBatchCategories.length && !batchAllAdded" class="field-help">ロック中の部位（{{ lockedBatchCategories.join('・') }}）は衣装棚への保存のみ行います。</p>
      </div>
    </div>
    <div v-if="device.busy || device.message" class="generation-progress" role="status" aria-live="polite"><span>{{ device.message }}</span><progress v-if="device.busy" :value="device.progress ?? undefined" max="1" /></div>
    <p v-if="device.error || addError" class="generation-error" role="alert">{{ device.error || addError }}</p>
    <p v-if="device.warning" class="field-help">{{ device.warning }}</p>
    <div class="generation-actions">
      <div class="generation-primary-actions">
        <button v-if="generationMode === 'single' && !generatingLocal" class="button primary" :disabled="device.supported !== true || !description.trim() || !base" @click="generate"><Sparkles :size="15" />{{ device.preview ? 'もう一度生成する' : device.ready ? 'この端末で生成する' : 'この端末で生成する（初回 約2.5GB）' }}</button>
        <button v-if="generationMode === 'batch' && !generatingLocal" class="button primary" :disabled="device.supported !== true || !enabledBatchSlots.length" @click="generateBatch"><Layers :size="15" />{{ device.batchResults.length ? `もう一度1コーデ生成する（${enabledBatchSlots.length}点）` : device.ready ? `1コーデまとめて生成する（${enabledBatchSlots.length}点）` : `1コーデまとめて生成（${enabledBatchSlots.length}点 · 初回 約2.5GB）` }}</button>
        <button v-if="!device.ready && !device.busy" class="button secondary" :disabled="device.supported !== true" @click="device.prepare()"><Download :size="15" />モデルを準備（初回 約2.5GB）</button>
        <button v-if="device.busy" class="button secondary" @click="device.cancel()"><Square :size="13" />停止してメモリを解放</button>
      </div>
      <button class="text-link" :disabled="device.busy" @click="device.clearCache()">ブラウザのモデルキャッシュを削除</button>
    </div>
    <p class="generation-footnote">モデルはHugging Faceから取得し、次回用にキャッシュします。生成処理と画像保存は端末内で行います。GPU・メモリの空き容量が必要です（メモリ8GB以上を推奨）。生成画像の配色は生成時に確定します。<a href="https://huggingface.co/stabilityai/sd-turbo" target="_blank" rel="noopener noreferrer">モデルの詳細・ライセンス<ArrowUpRight :size="10" /></a></p>
  </dialog>
  <dialog ref="basePickerDialog" class="base-picker-dialog" aria-labelledby="base-picker-title" @close="basePickerOpen = false; pickerTargetSlot = null" @click="closeBasePickerOnBackdrop">
    <div class="dialog-heading">
      <div>
        <span class="eyebrow">SELECT BASE GARMENT</span>
        <h3 id="base-picker-title">{{ pickerTargetSlot ? `${categoryLabel(pickerTargetSlot)}の形のベースを選ぶ` : '形のベースを選ぶ' }}</h3>
      </div>
      <button type="button" class="icon-button" aria-label="ベース選択を閉じる" @click="basePickerDialog?.close()"><X :size="20" /></button>
    </div>
    <p class="base-picker-lead">試着時の配置・サイズと、初期プロンプトのベースになる衣装を選びます。</p>
    <div class="base-picker-categories" role="tablist" aria-label="ベース衣装の部位">
      <button
        v-for="cat in wardrobe.catalog.categories"
        :key="cat.id"
        type="button"
        role="tab"
        :class="{ active: pickerCategory === cat.id }"
        :aria-selected="pickerCategory === cat.id"
        :disabled="!!pickerTargetSlot && pickerTargetSlot !== cat.id"
        @click="pickerCategory = cat.id"
      >{{ cat.name }}</button>
    </div>
    <label class="base-picker-search">
      <Search :size="14" />
      <input v-model="pickerQuery" type="search" placeholder="名前・英語名・素材から探す" aria-label="ベース衣装を検索" />
    </label>
    <div class="base-picker-grid">
      <button
        v-for="item in pickerItems"
        :key="item.id"
        type="button"
        class="base-picker-card"
        :class="{ selected: item.id === activePickerBaseId }"
        :data-picker-item="item.id"
        @click="selectBase(item)"
      >
        <span class="base-picker-card-thumb">
          <img :src="wardrobe.previewImage(item)" :alt="item.name" />
          <i v-if="item.id === activePickerBaseId"><Check :size="12" /></i>
        </span>
        <strong>{{ item.name }}</strong>
        <small>{{ item.name_en }}</small>
      </button>
    </div>
    <p v-if="!pickerItems.length" class="base-picker-empty">条件に合うベース衣装がありません。</p>
  </dialog>
</template>
<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import { X, Cpu, Sparkles, Download, Plus, Check, Shuffle, Square, LoaderCircle, ArrowUpRight, LayoutGrid, Search, Layers, UserX, Wand2 } from "lucide-vue-next";
import PromptSuggestionGuide from "~/components/PromptSuggestionGuide.vue";
import { useWardrobe } from "~/composables/useWardrobe";
import { usePromptTranslation } from "~/composables/usePromptTranslation";
import { useDeviceGeneration, type BatchPartInput, type BatchPartResult } from "~/composables/useDeviceGeneration";
import {
  ART_STYLE_PRESETS,
  appendPromptToken,
  artStyleHint,
  composeClothingPrompt,
  limitPromptTokens,
  mergePromptTokens,
  translateCoordinatePrompt,
} from "~/utils/generationPrompt";
import { translateJaToEnPrompt } from "~/utils/jaEnPrompt";
import type { Category, Garment } from "~/types/wardrobe";

type GenerationMode = "single" | "batch";
interface BatchSlotConfig {
  category: Category;
  enabled: boolean;
  baseId: string;
}

const BATCH_CATEGORY_ORDER: Category[] = ["outer", "tops", "bottoms", "socks", "shoes", "head", "bag", "jewelry", "inner"];
const DEFAULT_COORDINATE_CATEGORIES: Category[] = ["outer", "tops", "bottoms", "shoes", "head", "bag", "jewelry"];
const ACCESSORY_CATEGORIES = new Set<Category>(["bag", "jewelry", "head", "socks", "inner"]);
const PALETTE_SLOT_INDEX: Record<Category, number> = {
  inner: 1, underwear: 1, socks: 1, tops: 0, outer: 1, bottoms: 2, shoes: 4, head: 3, bag: 0, jewelry: 3,
};

const props = defineProps<{ open: boolean }>();
defineEmits<{ close: [] }>();
const wardrobe = useWardrobe();
const device = useDeviceGeneration();
const {
  engine: descriptionEngine,
  loading: descriptionTranslating,
  notice: descriptionTranslationNotice,
  translate: translateDescription,
  cancel: cancelDescriptionTranslation,
  reset: resetDescriptionTranslation,
} = usePromptTranslation();
const {
  engine: themeEngine,
  loading: themeTranslating,
  notice: themeTranslationNotice,
  translate: translateTheme,
  cancel: cancelThemeTranslation,
  reset: resetThemeTranslation,
} = usePromptTranslation();
const dialog = ref<HTMLDialogElement | null>(null);
const basePickerDialog = ref<HTMLDialogElement | null>(null);
const basePickerOpen = ref(false);
const pickerTargetSlot = ref<Category | null>(null);
const pickerCategory = ref<Category>(wardrobe.activeCategory);
const pickerQuery = ref("");
const generationMode = ref<GenerationMode>("single");
const baseId = ref("");
const name = ref("");
const description = ref("");
const batchOutfitName = ref("");
const batchTheme = ref("");
const lastAutoTheme = ref("");
const lastAutoDescription = ref("");
const lastSyncedTitle = ref("");
const descriptionOllamaUnknown = ref<string[]>([]);
const themeOllamaUnknown = ref<string[]>([]);
const artStylePreset = ref("auto");
const batchUsePalette = ref(true);
const batchSlots = ref<BatchSlotConfig[]>([]);
const batchRunSlots = ref<Array<{ category: Category; title: string }>>([]);
const regeneratingIndex = ref<number | null>(null);
const seed = ref(1);
const cutout = ref(true);
const adding = ref(false), added = ref(false), addError = ref("");
const run = computed(() => device.context);
const generatingGarment = computed(() => device.busy && device.phase === "generate");
const generatingBatch = computed(() => device.busy && device.phase === "batch");
const generatingLocal = computed(() => generatingGarment.value || generatingBatch.value);
const baseOptions = computed(() => wardrobe.catalog.items.filter((i) => i.category === wardrobe.activeCategory && !i.source));
const base = computed(() => wardrobe.catalog.items.find((i) => i.id === baseId.value));
const selectedCategoryName = computed(() => categoryLabel(base.value?.category) || wardrobe.activeDefinition?.name || "");
const presetHint = computed(() => artStyleHint(artStylePreset.value, `${batchOutfitName.value} ${batchTheme.value} ${name.value} ${description.value}`));
const ollamaReady = computed(() => wardrobe.integrations?.ollama.ready === true);

function categoryLabel(category: Category | undefined): string {
  if (!category) return "";
  return wardrobe.catalog.categories.find((c) => c.id === category)?.name || category;
}

const activePickerBaseId = computed(() => {
  if (pickerTargetSlot.value) {
    return batchSlots.value.find((s) => s.category === pickerTargetSlot.value)?.baseId || "";
  }
  return baseId.value;
});

const pickerItems = computed(() => {
  const q = pickerQuery.value.trim().toLowerCase();
  return wardrobe.catalog.items.filter((i) => {
    if (i.category !== pickerCategory.value || i.source) return false;
    if (!q) return true;
    return `${i.name} ${i.name_en} ${i.material} ${i.tags.join(" ")}`.toLowerCase().includes(q);
  });
});

const batchSlotViews = computed(() =>
  batchSlots.value.map((slot) => ({
    raw: slot,
    category: slot.category,
    enabled: slot.enabled,
    categoryName: categoryLabel(slot.category),
    baseItem: wardrobe.catalog.items.find((i) => i.id === slot.baseId),
  })),
);

const enabledBatchSlots = computed(() => batchSlotViews.value.filter((s) => s.enabled && s.baseItem));
const completedBatchResults = computed(() => device.batchResults.filter((r) => !!r.image));
const batchPendingAdd = computed(() => completedBatchResults.value.filter((r) => !r.added));
const batchAllAdded = computed(() => completedBatchResults.value.length > 0 && batchPendingAdd.value.length === 0);
const lockedBatchCategories = computed(() => {
  const locked = new Set(wardrobe.locks);
  return completedBatchResults.value
    .filter((r) => !r.added && locked.has(r.base.category))
    .map((r) => categoryLabel(r.base.category));
});

const batchDisplayCards = computed(() => {
  const isSingleRegen = generatingBatch.value && regeneratingIndex.value !== null;
  const cards: Array<{
    key: string;
    category: Category;
    categoryName: string;
    title: string;
    result?: BatchPartResult;
    resultIndex: number;
    pending: boolean;
    current: boolean;
  }> = device.batchResults.map((result, index) => {
    const activeRegen = isSingleRegen && regeneratingIndex.value === index;
    return {
      key: `${result.base.category}-${index}`,
      category: result.base.category,
      categoryName: categoryLabel(result.base.category),
      title: result.name,
      result: activeRegen ? undefined : result,
      resultIndex: index,
      pending: activeRegen,
      current: activeRegen,
    };
  });
  if (generatingBatch.value && !isSingleRegen) {
    const planned = batchRunSlots.value.length
      ? batchRunSlots.value
      : enabledBatchSlots.value.map((s) => ({
          category: s.category,
          title: formatBatchItemName(s.baseItem?.name || ""),
        }));
    for (let i = cards.length; i < planned.length; i++) {
      const slot = planned[i]!;
      cards.push({
        key: `pending-${slot.category}-${i}`,
        category: slot.category,
        categoryName: categoryLabel(slot.category),
        title: slot.title,
        resultIndex: i,
        pending: true,
        current: i === device.batchResults.length,
      });
    }
  }
  return cards;
});

async function openBasePicker(slotCategory?: Category) {
  if (generatingLocal.value) return;
  pickerTargetSlot.value = slotCategory || null;
  pickerCategory.value = slotCategory || base.value?.category || wardrobe.activeCategory;
  pickerQuery.value = "";
  basePickerOpen.value = true;
  await nextTick();
  if (!basePickerDialog.value?.open) basePickerDialog.value?.showModal();
}

function selectBase(item: Garment) {
  if (pickerTargetSlot.value) {
    const target = batchSlots.value.find((s) => s.category === pickerTargetSlot.value);
    if (target) {
      target.baseId = item.id;
      target.enabled = true;
    }
    pickerTargetSlot.value = null;
  } else {
    baseId.value = item.id;
    applyBaseDefaults(item);
  }
  basePickerDialog.value?.close();
}

function closeBasePickerOnBackdrop(event: MouseEvent) {
  const picker = basePickerDialog.value;
  if (!picker || event.target !== picker) return;
  const rect = picker.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) picker.close();
}

function switchToBatchMode() {
  if (generatingLocal.value) return;
  generationMode.value = "batch";
  ensureBatchInitialized(false);
  scheduleThemeTranslation(batchOutfitName.value);
}

function switchToSingleMode() {
  if (generatingLocal.value) return;
  generationMode.value = "single";
  scheduleDescriptionTranslation(name.value);
}

function nextUint32Seed() {
  return crypto.getRandomValues(new Uint32Array(1))[0]! || 1;
}

function randomSeed() { seed.value = nextUint32Seed(); }

function baseDescriptionFor(item: Garment): string {
  return `${item.name_en}, ${item.material_en}, ${item.tags.slice(0, 2).join(", ")}`;
}

function autoDescriptionFor(item: Garment, title: string, translatedOverride?: string) {
  const defaultName = `オリジナル${item.name}`;
  const translated = translatedOverride ?? (
    title.trim() && title.trim() !== defaultName
      ? translateCoordinatePrompt(title)
      : ""
  );
  return limitPromptTokens(mergePromptTokens(baseDescriptionFor(item), translated), 250);
}

function autoThemeForName(title: string, translatedOverride?: string) {
  const styleName = wardrobe.catalog.styles.find((s) => s.id === wardrobe.style)?.en || "girly";
  const translated = translatedOverride ?? translateCoordinatePrompt(title);
  const styleToken = `${styleName.toLowerCase()} coordinate`;
  if (translated && translated.toLowerCase().includes(styleName.toLowerCase())) {
    return limitPromptTokens(translated, 160);
  }
  return limitPromptTokens(mergePromptTokens(translated, styleToken), 160);
}

const descriptionIsAuto = computed(() => {
  const current = description.value.trim();
  return !current || current === lastAutoDescription.value.trim();
});
const themeIsAuto = computed(() => {
  const current = batchTheme.value.trim();
  return !current || current === lastAutoTheme.value.trim();
});
const descriptionUnknown = computed(() => {
  if (base.value && name.value.trim() === `オリジナル${base.value.name}`) return [];
  return descriptionEngine.value === "ollama"
    ? descriptionOllamaUnknown.value.slice(0, 6)
    : translateJaToEnPrompt(name.value).untranslated.slice(0, 6);
});
const themeUnknown = computed(() => themeEngine.value === "ollama"
  ? themeOllamaUnknown.value.slice(0, 6)
  : translateJaToEnPrompt(batchOutfitName.value).untranslated.slice(0, 6));

function scheduleDescriptionTranslation(title: string) {
  const item = base.value;
  if (!item) {
    resetDescriptionTranslation();
    descriptionOllamaUnknown.value = [];
    return;
  }
  const value = title.trim();
  const defaultName = `オリジナル${item.name}`;
  if (!value || value === defaultName || generatingLocal.value) {
    resetDescriptionTranslation();
    descriptionOllamaUnknown.value = [];
    return;
  }
  void translateDescription(title, {
    enabled: ollamaReady.value,
    onLocal: () => {},
    onOllama: (result) => {
      if (generatingLocal.value || !descriptionIsAuto.value || name.value.trim() !== value) return;
      const next = autoDescriptionFor(item, title, result.positive);
      description.value = next;
      lastAutoDescription.value = next;
      descriptionOllamaUnknown.value = result.untranslated.slice(0, 6);
    },
  });
}

function scheduleThemeTranslation(title: string) {
  const value = title.trim();
  if (!value || generatingLocal.value) {
    resetThemeTranslation();
    themeOllamaUnknown.value = [];
    return;
  }
  void translateTheme(title, {
    enabled: ollamaReady.value,
    onLocal: () => {},
    onOllama: (result) => {
      if (generatingLocal.value || !themeIsAuto.value || batchOutfitName.value.trim() !== value) return;
      const next = autoThemeForName(title, result.positive);
      batchTheme.value = next;
      lastAutoTheme.value = next;
      themeOllamaUnknown.value = result.untranslated.slice(0, 6);
    },
  });
}

function regenerateDescriptionFromName() {
  if (generatingLocal.value || !base.value) return;
  descriptionOllamaUnknown.value = [];
  description.value = autoDescriptionFor(base.value, name.value);
  lastAutoDescription.value = description.value;
  scheduleDescriptionTranslation(name.value);
}

function regenerateThemeFromName() {
  if (generatingLocal.value) return;
  themeOllamaUnknown.value = [];
  batchTheme.value = autoThemeForName(batchOutfitName.value);
  lastAutoTheme.value = batchTheme.value;
  scheduleThemeTranslation(batchOutfitName.value);
}

function syncBatchNameFromWardrobe() {
  const title = wardrobe.title.trim();
  const current = batchOutfitName.value.trim();
  if (!current || current === lastSyncedTitle.value) {
    batchOutfitName.value = title;
    lastSyncedTitle.value = title;
  }
}

function applyBaseDefaults(item: Garment | undefined) {
  if (!item) return;
  resetDescriptionTranslation();
  name.value = `オリジナル${item.name}`;
  descriptionOllamaUnknown.value = [];
  description.value = autoDescriptionFor(item, name.value);
  lastAutoDescription.value = description.value;
}

function addDescriptionSuggestion(token: string) {
  if (generatingLocal.value) return;
  cancelDescriptionTranslation();
  descriptionOllamaUnknown.value = [];
  description.value = appendPromptToken(description.value, token);
  lastAutoDescription.value = "";
}

function addThemeSuggestion(token: string) {
  if (generatingLocal.value) return;
  cancelThemeTranslation();
  themeOllamaUnknown.value = [];
  batchTheme.value = appendPromptToken(batchTheme.value, token);
  lastAutoTheme.value = "";
}

function ensureBaseInitialized(forceReset = false) {
  const preferred = baseOptions.value.find((i) => i.id === wardrobe.selections[wardrobe.activeCategory]) || baseOptions.value[0];
  if (!preferred) return;
  const changed = baseId.value !== preferred.id;
  if (forceReset || !base.value) {
    baseId.value = preferred.id;
  }
  const current = base.value || preferred;
  if (forceReset || changed || !name.value.trim() || !description.value.trim()) {
    applyBaseDefaults(current);
  }
}

function ensureBatchInitialized(forceReset = false) {
  const autoTheme = autoThemeForName(batchOutfitName.value);
  if (!batchTheme.value.trim() || (forceReset && batchTheme.value === lastAutoTheme.value)) {
    resetThemeTranslation();
    themeOllamaUnknown.value = [];
    batchTheme.value = autoTheme;
    lastAutoTheme.value = autoTheme;
  }
  if (!forceReset && batchSlots.value.length) return;

  const hasMainSelections = (["tops", "bottoms", "shoes"] as Category[]).some((c) => !!wardrobe.selections[c]);
  const slots: BatchSlotConfig[] = [];
  for (const category of BATCH_CATEGORY_ORDER) {
    const candidates = wardrobe.catalog.items.filter((i) => i.category === category && !i.source);
    if (!candidates.length) continue;
    const preferred = candidates.find((i) => i.id === wardrobe.selections[category])
      || candidates.find((i) => wardrobe.matchesAudience(i))
      || candidates[0]!;
    const enabled = hasMainSelections
      ? DEFAULT_COORDINATE_CATEGORIES.includes(category) && !!wardrobe.selections[category]
      : (["tops", "bottoms", "shoes"] as Category[]).includes(category);
    slots.push({ category, enabled, baseId: preferred.id });
  }
  batchSlots.value = slots;
}

watch(generatingBatch, (active) => {
  if (!active) regeneratingIndex.value = null;
});

watch(baseId, () => {
  if (!base.value || generatingLocal.value) return;
  applyBaseDefaults(base.value);
});

watch(name, (value) => {
  if (generatingLocal.value || !base.value) return;
  const current = description.value.trim();
  if (current && current !== lastAutoDescription.value.trim()) return;
  descriptionOllamaUnknown.value = [];
  description.value = autoDescriptionFor(base.value, value);
  lastAutoDescription.value = description.value;
  if (generationMode.value === "single") scheduleDescriptionTranslation(value);
});

watch(batchOutfitName, (value) => {
  if (generatingLocal.value) return;
  const current = batchTheme.value.trim();
  if (current && current !== lastAutoTheme.value.trim()) return;
  themeOllamaUnknown.value = [];
  batchTheme.value = autoThemeForName(value);
  lastAutoTheme.value = batchTheme.value;
  if (generationMode.value === "batch") scheduleThemeTranslation(value);
});

watch(ollamaReady, (ready) => {
  if (!ready || !props.open || generatingLocal.value) return;
  if (generationMode.value === "single") scheduleDescriptionTranslation(name.value);
  else scheduleThemeTranslation(batchOutfitName.value);
});

watch(() => wardrobe.catalog.items.length, () => {
  if (!generatingLocal.value) {
    ensureBaseInitialized(false);
    ensureBatchInitialized(false);
  }
});

watch(baseOptions, () => {
  if (!generatingLocal.value) ensureBaseInitialized(false);
}, { immediate: true });

watch(() => props.open, async (open) => {
  device.dialogOpen = open;
  await nextTick();
  if (open) {
    if (device.phase === "batch" || (!device.busy && device.batchResults.length > 0 && !device.preview)) {
      generationMode.value = "batch";
    } else if (device.phase === "generate") {
      generationMode.value = "single";
    }
    if (!generatingLocal.value) {
      syncBatchNameFromWardrobe();
      ensureBaseInitialized(true);
      ensureBatchInitialized(!device.batchResults.length);
      if (!device.preview && !device.batchResults.length) randomSeed();
    } else {
      if (!base.value) ensureBaseInitialized(false);
      if (!batchSlots.value.length) ensureBatchInitialized(false);
    }
    if (!dialog.value?.open) dialog.value?.showModal();
    await device.initialize();
    device.detect();
    void wardrobe.refreshIntegrations();
    if (generationMode.value === "single") scheduleDescriptionTranslation(name.value);
    else scheduleThemeTranslation(batchOutfitName.value);
  } else {
    pickerTargetSlot.value = null;
    cancelDescriptionTranslation();
    cancelThemeTranslation();
    if (basePickerDialog.value?.open) basePickerDialog.value.close();
    if (dialog.value?.open) dialog.value.close();
  }
}, { immediate: true });

onBeforeUnmount(() => {
  cancelDescriptionTranslation();
  cancelThemeTranslation();
});

function buildPromptForPart(item: Garment, descText: string, includePaletteColor: boolean, outfitName = ""): { prompt: string; colors: string[] } {
  const palette = wardrobe.catalog.palettes.find((p) => p.id === wardrobe.paletteId);
  const colorName = includePaletteColor ? (palette?.names[PALETTE_SLOT_INDEX[item.category]] || "soft pastel colors") : "";
  // Keep the clothing description first so CLIP's 77-token limit preserves it.
  // The shared composer always ends with the no-human / white-background guard.
  return {
    prompt: composeClothingPrompt({
      description: descText,
      name: outfitName,
      paletteColor: colorName,
      artStyle: artStylePreset.value,
    }),
    colors: includePaletteColor && wardrobe.palette.length ? [...wardrobe.palette] : [...item.colors],
  };
}

function formatBatchItemName(baseName: string): string {
  const outfitTitle = batchOutfitName.value.trim();
  return outfitTitle ? `${outfitTitle}・${baseName}` : `オリジナル${baseName}`;
}

function batchPartInputForSlot(slot: BatchSlotConfig, slotSeed: number): BatchPartInput | null {
  const baseItem = wardrobe.catalog.items.find((i) => i.id === slot.baseId && !i.source)
    || wardrobe.catalog.items.find((i) => i.category === slot.category && !i.source);
  if (!baseItem) return null;
  const theme = batchTheme.value.trim();
  const partDesc = [theme, baseItem.name_en, baseItem.material_en].filter(Boolean).join(", ");
  const { prompt, colors } = buildPromptForPart(baseItem, partDesc, batchUsePalette.value, batchOutfitName.value);
  return {
    base: { ...baseItem, name_en: partDesc },
    name: formatBatchItemName(baseItem.name),
    prompt,
    seed: slotSeed,
    cutout: cutout.value,
    colors,
  };
}

function generate() {
  if (!base.value || generatingLocal.value) return;
  randomizeInvalidSeed(); added.value = false; addError.value = "";
  const { prompt, colors } = buildPromptForPart(base.value, description.value, true, name.value);
  device.generate(prompt, seed.value, cutout.value, { base: { ...base.value, name_en: description.value.trim() }, prompt, name: name.value || base.value.name, colors });
}

function generateBatch() {
  if (!enabledBatchSlots.value.length || generatingLocal.value) return;
  randomizeInvalidSeed();
  addError.value = "";
  regeneratingIndex.value = null;
  const baseSeed = Math.max(1, Math.min(4294967295, Math.floor(seed.value || 1)));
  const parts: BatchPartInput[] = [];
  for (const [idx, slot] of enabledBatchSlots.value.entries()) {
    const slotSeed = ((baseSeed - 1 + idx) % 4294967295) + 1;
    const part = batchPartInputForSlot(slot.raw, slotSeed);
    if (part) parts.push(part);
  }
  if (!parts.length) return;
  batchRunSlots.value = parts.map((p) => ({ category: p.base.category, title: p.name }));
  device.generateBatch(parts);
}

function regenerateBatchItemAt(index: number) {
  const result = device.batchResults[index];
  if (!result || device.busy) return;
  addError.value = "";
  const category = result.base.category;
  const slot = batchSlots.value.find((s) => s.category === category);
  const part = batchPartInputForSlot({ category, enabled: true, baseId: slot?.baseId || result.base.baseId || result.base.id }, nextUint32Seed());
  if (!part) return;
  regeneratingIndex.value = index;
  device.regenerateBatchItem(index, part);
}

function randomizeInvalidSeed() { if (!Number.isInteger(seed.value) || seed.value < 1 || seed.value > 4294967295) randomSeed(); }

function buildGeneratedGarmentRecord(sourceBase: Garment, garmentName: string, colors: string[], prompt: string, itemSeed: number, desc: string): Garment {
  return {
    ...sourceBase,
    id: `local-${crypto.randomUUID()}`,
    baseId: sourceBase.id,
    source: "local-diffusion",
    name: garmentName,
    colors,
    generationPrompt: prompt,
    seed: itemSeed,
    description: desc,
  };
}

async function addToWardrobe() {
  if (!device.image || !run.value) return;
  adding.value = true; addError.value = "";
  try {
    await wardrobe.addGenerated(
      buildGeneratedGarmentRecord(run.value.base, run.value.name, run.value.colors, run.value.prompt, device.resultSeed, "このブラウザで生成したオリジナル衣装。"),
      device.image,
    );
    added.value = true;
  } catch { addError.value = "衣装を保存できませんでした。空き容量を確認するか、PNGで保存してください。"; }
  finally { adding.value = false; }
}

async function addBatchToWardrobe() {
  const itemsToAdd = batchPendingAdd.value;
  if (!itemsToAdd.length) return;
  adding.value = true;
  addError.value = "";
  let addedCount = 0;
  let firstCategory: Category | null = null;
  let preferredCategory: Category | null = null;
  const lockedSet = new Set(wardrobe.locks);
  let skippedWearLocked = false;
  try {
    for (const item of itemsToAdd) {
      if (!item.image) continue;
      if (lockedSet.has(item.base.category)) skippedWearLocked = true;
      const stored = await wardrobe.addGenerated(
        buildGeneratedGarmentRecord(item.base, item.name, item.colors, item.prompt, item.seed, "このブラウザで生成したオリジナルコーデ衣装。"),
        item.image,
        { quiet: true, switchCategory: false },
      );
      item.added = true;
      addedCount++;
      if (!firstCategory) firstCategory = stored.category;
      if (!preferredCategory && !ACCESSORY_CATEGORIES.has(stored.category)) {
        preferredCategory = stored.category;
      }
    }
    const targetCategory = preferredCategory || firstCategory;
    if (targetCategory) {
      wardrobe.activeCategory = targetCategory;
      wardrobe.query = "";
      wardrobe.styleFilter = false;
    }
    if (addedCount > 0) {
      const toastMsg = skippedWearLocked
        ? `${addedCount}点の衣装を衣装棚に追加しました（ロック中の部位は未着用）。`
        : `${addedCount}点のコーデを衣装棚に追加して着用しました。`;
      wardrobe.toast = toastMsg;
      setTimeout(() => {
        if (wardrobe.toast === toastMsg) wardrobe.toast = "";
      }, 3200);
    }
  } catch {
    addError.value = "一部の衣装を保存できませんでした。空き容量を確認するか、PNGで保存してください。";
  } finally {
    adding.value = false;
  }
}

function closeOnBackdrop(event: MouseEvent) {
  if (event.target !== dialog.value) return;
  const rect = dialog.value!.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.value?.close();
}
</script>
