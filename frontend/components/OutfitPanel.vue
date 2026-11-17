<template>
  <aside class="outfit-panel" :class="{ 'fitting-inspector': inspector }">
    <div class="section-heading">
      <div>
        <span class="eyebrow">01 / COORDINATE</span>
        <h2>{{ inspector ? "着用中の衣装" : "コーデを組む" }}</h2>
      </div>
      <span class="small-count"
        >{{ wardrobe.selectedItems.length }}<span>/ {{ wardrobe.catalog.categories.length }}</span></span
      >
    </div>
    <label class="field-label" for="outfit-name">コーデの名前</label
    ><input
      id="outfit-name"
      v-model="wardrobe.title"
      class="text-input title-input"
      maxlength="100"
    />
    <p v-if="titleEnglish" class="outfit-name-en" :title="titleEnglish"><span>EN</span>{{ titleEnglish }}</p>
    <div class="outfit-list">
      <div
        v-for="category in wardrobe.catalog.categories"
        :key="category.id"
        class="outfit-part"
        :class="{ active: !avatar.browsingPoses && wardrobe.activeCategory === category.id }"
      >
        <button
          class="part-pick"
          @click="avatar.browsingPoses = false; wardrobe.activeCategory = category.id"
        >
          <span class="part-thumb"
            ><img
              v-if="selected(category.id)"
              :src="wardrobe.previewImage(selected(category.id)!)"
              alt="" /><Plus v-else :size="15" /></span
          ><span
            ><span class="part-category">{{ category.name }}</span
            ><strong>{{
              selected(category.id)?.name || "アイテムを選ぶ"
            }}</strong></span
          >
        </button>
        <div class="part-actions">
          <button v-if="selected(category.id)" class="icon-button" :aria-label="`${category.name}の色を変更`" @click="editColor(category.id)"><Palette :size="13" /></button>
          <button
            class="icon-button"
            :class="{ locked: wardrobe.locks.includes(category.id) }"
            :aria-label="`${category.name}のロックを切り替え`"
            :aria-pressed="wardrobe.locks.includes(category.id)"
            @click="wardrobe.toggleLock(category.id)"
          >
            <LockKeyhole
              v-if="wardrobe.locks.includes(category.id)"
              :size="12"
            /><UnlockKeyhole v-else :size="12" /></button
          ><button
            class="icon-button"
            :aria-label="`${category.name}を外す`"
            :disabled="
              !selected(category.id) || wardrobe.locks.includes(category.id)
            "
            @click="wardrobe.remove(category.id)"
          >
            <X :size="12" />
          </button>
        </div>
      </div>
      <div class="outfit-part pose-part" :class="{ active: avatar.browsingPoses }">
        <button class="part-pick" aria-label="ポーズを選ぶ" :aria-expanded="inspector ? avatar.browsingPoses : posePickerOpen" @click="inspector ? openPoseLibrary() : posePickerOpen = !posePickerOpen">
          <span class="part-thumb pose-part-thumb"><Accessibility :size="23" :stroke-width="1.3" /></span>
          <span><span class="part-category">ポーズ</span><strong>{{ avatar.pose.name }}</strong></span>
        </button>
        <button class="icon-button" aria-label="ポーズを自然立ちに戻す" :disabled="avatar.pose.id === 'relax'" @click="avatar.setPose('relax')"><RotateCcw :size="12" /></button>
      </div>
      <PosePicker v-if="!inspector && posePickerOpen" :poses="studioPoses" />
    </div>
    <div v-if="colorOpen && selected(wardrobe.activeCategory)" ref="colorEditor"><GarmentColorEditor :item="selected(wardrobe.activeCategory)!" /></div>
    <button
      class="button secondary random-button"
      :disabled="wardrobe.recommending"
      @click="wardrobe.recommend(false)"
    >
      <Dices :size="15" />{{
        wardrobe.recommending ? "コーデを検討中…" : "おまかせで組み合わせる"
      }}
    </button>
    <div class="palette-section">
      <div class="section-label">
        <span><Palette :size="14" />配色を選ぶ</span
        ><button class="text-link" @click="copyPalette"><Copy :size="12" />配色をコピー</button>
      </div>
      <div class="palette-presets">
        <button
          v-for="palette in wardrobe.catalog.palettes"
          :key="palette.id"
          :title="palette.name"
          :aria-label="`${palette.name}の配色を選択`"
          :aria-pressed="wardrobe.paletteId === palette.id"
          :class="{ active: wardrobe.paletteId === palette.id }"
          @click="wardrobe.choosePalette(palette.id)"
        >
          <i
            v-for="color in palette.colors"
            :key="color"
            :style="{ background: color }"
          />
        </button>
      </div>
      <div class="palette-edit">
        <label
          v-for="(color, index) in wardrobe.palette"
          :key="index"
          :style="{ '--swatch': color }"
          ><input
            type="color"
            :aria-label="`パレットの${index + 1}色目`"
            :value="color"
            @input="
              wardrobe.updateColor(
                index,
                ($event.target as HTMLInputElement).value,
              )
            "
          /><span>{{ color }}</span></label
        >
      </div>
    </div>
    <details class="outfit-idea-disclosure" :open="!inspector">
    <summary>衣装のアイデアを相談</summary>
    <div class="ai-assistant">
      <div class="section-label">
        <span><Sparkles :size="14" />アイデアから衣装を提案</span
        ><span
          class="ollama-dot"
          :class="{ ready: wardrobe.integrations?.ollama.ready }"
        />
      </div>
      <label class="sr-only" for="idea">衣装のイメージ</label
      ><textarea
        id="idea"
        v-model="wardrobe.idea"
        rows="3"
        maxlength="600"
        placeholder="例：雨の日の古書店。落ち着いたクラシックな装い。"
      /><button
        class="button ai-button"
        :disabled="wardrobe.recommending || !wardrobe.idea.trim()"
        @click="wardrobe.recommend(true)"
      >
        <LoaderCircle
          v-if="wardrobe.recommending"
          class="spin"
          :size="14"
        /><Sparkles v-else :size="14" />{{
          wardrobe.recommending ? "提案を考えています…" : "Ollamaにコーデを相談"
        }}</button
      ><span class="ai-service-note">{{
        wardrobe.integrations?.ollama.ready
          ? wardrobe.integrations.ollama.model + " · このMacで実行"
          : "未接続時はスタイルからおまかせ提案"
      }}</span>
      <div
        v-if="wardrobe.lastRecommendation"
        class="recommendation-note"
        role="status"
      >
        <strong>{{
          wardrobe.lastRecommendation.engine === "ollama"
            ? `Ollama · ${wardrobe.lastRecommendation.model}`
            : "スタイルからおまかせ提案"
        }}</strong>
        <p>{{ wardrobe.lastRecommendation.reason }}</p>
        <p v-if="wardrobe.lastRecommendation.notice">
          {{ wardrobe.lastRecommendation.notice }}
        </p>
      </div>
    </div>
    </details>
  </aside>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
withDefaults(defineProps<{ inspector?: boolean }>(), { inspector: false });
const emit = defineEmits<{ "select-pose": [] }>();
import {
  Copy,
  Plus,
  X,
  LockKeyhole,
  UnlockKeyhole,
  Palette,
  Dices,
  Sparkles,
  LoaderCircle,
  Accessibility,
  RotateCcw,
} from "lucide-vue-next";
import type { Category } from "~/types/wardrobe";
import { useWardrobe } from "~/composables/useWardrobe";
import { useAvatar } from "~/composables/useAvatar";
import { translateCoordinatePrompt } from "~/utils/generationPrompt";
import { studioPoses } from "~/data/studioPoses";
import PosePicker from "~/components/PosePicker.vue";
import GarmentColorEditor from "~/components/GarmentColorEditor.vue";
const wardrobe = useWardrobe();
const avatar = useAvatar();
const titleEnglish = computed(() => translateCoordinatePrompt(wardrobe.title));
const posePickerOpen = ref(false);
const colorOpen = ref(true);
const colorEditor = ref<HTMLElement | null>(null);
async function editColor(category: Category) {
  wardrobe.activeCategory = category; colorOpen.value = true;
  await nextTick(); colorEditor.value?.scrollIntoView({block:"nearest",behavior:"smooth"});
}
onMounted(() => avatar.hydrate());
function openPoseLibrary() { avatar.browsingPoses = true; emit("select-pose"); }
async function copyPalette() {
  try {
    await navigator.clipboard.writeText(wardrobe.palette.join(", "));
    wardrobe.notify("配色をコピーしました。");
  } catch {
    wardrobe.notify("コピーできませんでした。表示されているカラーコードを選択してください。");
  }
}
function selected(category: Category) {
  return wardrobe.selectedItems.find((i) => i.category === category);
}
</script>
