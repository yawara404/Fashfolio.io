<template>
  <main class="tryon-studio">
    <div class="tryon-heading">
      <div>
        <span class="eyebrow">02 / FITTING ROOM</span>
        <h2>着せ替えて、イメージを形に。</h2>
      </div>
      <span class="tryon-view-badge">
        <Eye :size="12" />FRONT VIEW
      </span>
    </div>

    <div class="proportion-controls">
      <div class="mannequin-gender-group">
        <span class="field-label">アバター</span>
        <div class="gender-switch" role="group" aria-label="キャラクターのタイプ">
          <button
            v-for="item in mannequinTypes"
            :key="item.id"
            :class="{ active: gender === item.id }"
            :aria-pressed="gender === item.id"
            :aria-label="`${item.name}（${item.caption}）`"
            @click="selectGender(item.id)"
          >
            <strong>{{ item.name }}</strong>
            <small>{{ item.en }}</small>
          </button>
        </div>
      </div>
      <div class="mannequin-heads-group">
        <span class="field-label">頭身</span>
        <div class="proportion-switch" role="group" aria-label="キャラクターの頭身">
          <button
            v-for="option in proportions"
            :key="option.heads"
            :class="{ active: heads === option.heads }"
            :aria-pressed="heads === option.heads"
            :aria-label="`${option.heads}頭身 ${option.label}`"
            @click="heads = option.heads"
          >
            <strong>{{ option.heads }}<span>頭身</span></strong>
            <small>{{ option.label }}</small>
          </button>
        </div>
      </div>
    </div>

    <div
      class="mannequin-stage"
      :style="{ backgroundColor: background }"
    >
      <div class="stage-corner">
        <span>FASHFOLIO / CHARACTER STUDIO</span>
        <span>{{ heads }} HEAD PROPORTIONS</span>
      </div>
      <div class="mannequin-viewport">
        <MannequinPreview
          ref="preview"
          :heads="heads"
          :selected="wardrobe.selectedItems"
          :palette="wardrobe.palette"
          :dressed="dressed"
          :guides="guides"
          :palette-colors="paletteColors"
          :gender="gender"
          :style="{ transform: `scale(${zoom / 100})` }"
        />
      </div>
      <div class="stage-caption">
        <span>{{
          dressed ? wardrobe.title || "My coordinate" : "キャラクタープレビュー"
        }}</span>
        <span>{{ dressed ? wardrobe.selectedItems.length : 0 }} PARTS / {{ heads }} HEADS</span>
      </div>
    </div>

    <div class="tryon-stage-tools">
      <div class="stage-backgrounds" aria-label="背景色">
        <button
          v-for="bg in backgrounds"
          :key="bg.value"
          :aria-label="`${bg.label}の背景`"
          :aria-pressed="background === bg.value"
          :class="{ active: background === bg.value }"
          :style="{ background: bg.value }"
          @click="background = bg.value"
        />
      </div>
      <div class="stage-zoom">
        <ZoomOut :size="13" />
        <input
          v-model.number="zoom"
          type="range"
          min="75"
          max="120"
          step="5"
          aria-label="プレビューの表示倍率"
        />
        <button title="倍率を100%に戻す" @click="zoom = 100">
          {{ zoom }}%
        </button>
        <ZoomIn :size="13" />
      </div>
    </div>

    <div class="tryon-options">
      <label><input v-model="guides" type="checkbox" />頭身ガイド</label>
      <label><input v-model="dressed" type="checkbox" />衣装を表示</label>
      <label><input v-model="paletteColors" type="checkbox" />コーデの配色を反映</label>
    </div>

    <div class="tryon-export" aria-label="試着画像を持ち出す">
      <button class="button secondary" :disabled="exporting" @click="exportPng(preview?.svg || null, wardrobe.title)"><Download :size="14" />{{ exporting ? "画像を準備中…" : "PNGで保存" }}</button>
      <button class="button secondary" :disabled="exporting" @click="copyPng(preview?.svg || null)"><Copy :size="14" />{{ copied ? "画像をコピーしました" : "画像をコピー" }}</button>
      <a class="button secondary" href="https://reflens.wawa-app.me/" target="_blank" rel="noopener noreferrer">Reflensを開く<ArrowUpRight :size="14" /></a>
      <span>コピーした画像をReflensで貼り付けられます。</span>
    </div>
    <p v-if="exportError" class="tryon-export-error" role="alert">{{ exportError }}</p>

    <p class="tryon-caption">
      <Info :size="13" />
      <span>シルエットと丈感を確認する2Dプレビューです。頭身の切り替えは、選択した衣装やプロンプトには影響しません。</span>
    </p>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Eye, Info, ZoomIn, ZoomOut, Download, Copy, ArrowUpRight } from "lucide-vue-next";
import { useWardrobe } from "~/composables/useWardrobe";
import { useAvatar } from "~/composables/useAvatar";
import { useIllustrationExport } from "~/composables/useIllustrationExport";
import { mannequinTypes } from "~/data/avatarPresets";
import type { MannequinGender } from "~/types/avatar";

const wardrobe = useWardrobe();
const avatar = useAvatar();
const preview = ref<{ svg: SVGSVGElement | null } | null>(null);
const { exporting, error: exportError, copied, exportPng, copyPng } = useIllustrationExport();
onMounted(() => avatar.hydrate());
const heads = useState<number>("tryon-heads", () => 5);
const gender = computed(() => avatar.config.gender || "girl");

function selectGender(next: MannequinGender) {
  avatar.setGender(next);
}

const proportions: { heads: number; label: string }[] = [
  { heads: 5, label: "デフォルメ" },
  { heads: 6, label: "ナチュラル" },
  { heads: 7, label: "スタンダード" },
];

const backgrounds = [
  { value: "#f4f0f9", label: "ラベンダーホワイト" },
  { value: "#faf5ee", label: "ウォームホワイト" },
  { value: "#eef4f2", label: "ミントグレー" },
  { value: "#1f1d24", label: "ダーク" },
];
const background = ref(backgrounds[0]!.value);
const dressed = ref(true);
const guides = ref(true);
const paletteColors = computed({ get: () => wardrobe.previewPaletteColors, set: (value: boolean) => { wardrobe.previewPaletteColors = value; } });
const zoom = ref(100);
</script>
