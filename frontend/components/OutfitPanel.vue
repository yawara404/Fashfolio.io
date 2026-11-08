<template>
  <aside class="outfit-panel">
    <div class="section-heading">
      <div>
        <span class="eyebrow">01 / COORDINATE</span>
        <h2>コーデを組む</h2>
      </div>
      <span class="small-count"
        >{{ wardrobe.selectedItems.length }}<span>/ 7</span></span
      >
    </div>
    <label class="field-label" for="outfit-name">コーデの名前</label
    ><input
      id="outfit-name"
      v-model="wardrobe.title"
      class="text-input title-input"
      maxlength="100"
    />
    <div class="outfit-list">
      <div
        v-for="category in wardrobe.catalog.categories"
        :key="category.id"
        class="outfit-part"
        :class="{ active: wardrobe.activeCategory === category.id }"
      >
        <button
          class="part-pick"
          @click="wardrobe.activeCategory = category.id"
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
    </div>
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
  </aside>
</template>
<script setup lang="ts">
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
} from "lucide-vue-next";
import type { Category } from "~/types/wardrobe";
import { useWardrobe } from "~/composables/useWardrobe";
const wardrobe = useWardrobe();
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
