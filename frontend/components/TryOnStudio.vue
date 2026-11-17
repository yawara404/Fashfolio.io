<template>
  <main class="tryon-studio">
    <div class="tryon-heading">
      <div class="view-switch fitting-view-switch" role="group" aria-label="プレビューの表示方法">
        <button :class="{ active: studioView === 'fitting' }" :aria-pressed="studioView === 'fitting'" @click="studioView = 'fitting'"><Eye :size="14" />試着</button>
        <button :class="{ active: studioView === 'canvas' }" :aria-pressed="studioView === 'canvas'" @click="studioView = 'canvas'"><Layers :size="14" />キャンバス</button>
      </div>
      <div class="fitting-export-actions">
        <button v-if="studioView === 'fitting'" class="button secondary compare-button" :aria-pressed="!!baseline" @click="toggleComparison"><Columns2 :size="14" />{{ baseline ? '比較を閉じる' : '今のコーデと比較' }}</button>
        <button class="icon-button recenter-preview" aria-label="全身を中央に表示" title="全身を中央に表示" @click="studioView === 'canvas' ? canvasPreview?.centerCharacter() : zoom = 100"><Maximize2 :size="15" /></button>
        <button class="icon-button" :disabled="exporting || waitingForAi" :aria-label="copied ? '画像をコピーしました' : '画像をコピー'" title="画像をコピー" @click="copyPng(activeSvg())"><Check v-if="copied" :size="15" /><Copy v-else :size="15" /></button>
        <button class="button primary" :disabled="exporting || waitingForAi" @click="exportPng(activeSvg(), wardrobe.title)"><Download :size="14" />{{ waitingForAi ? '服を生成中…' : exporting ? '準備中…' : 'PNGで保存' }}</button>
      </div>
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

    <div class="pose-generation-bar" :class="{ 'is-generated': !!poseGeneration.render }">
      <div><Sparkles :size="14" /><span v-if="poseGeneration.generating || poseDevice.phase === 'tryon'">{{ poseDevice.message }}</span><span v-else-if="poseGeneration.preparing">服の参照画像を準備中…</span><span v-else-if="poseGeneration.enabled && poseDevice.phase === 'prepare'">{{ poseDevice.message }}</span><span v-else-if="poseGeneration.render">生成済み · ポーズと衣装の変更で自動切替</span><span v-else>簡易プレビュー</span></div>
      <span v-if="baseline && studioView === 'fitting'">比較中は線画プレビュー</span>
      <button v-else-if="!poseGeneration.enabled" class="text-link" :disabled="poseDevice.supported === false" @click="poseGeneration.enable()">服を生成して試着<small>初回 約2.6GB</small></button>
      <button v-else class="text-link" @click="poseGeneration.disable()">自動生成をオフ</button>
    </div>
    <div v-if="poseGeneration.enabled && (poseGeneration.error || poseDevice.error)" class="pose-generation-error" role="alert">{{ poseGeneration.error || poseDevice.error }}<button class="text-link" @click="poseGeneration.retry()">再試行</button></div>
    <p v-if="poseGeneration.enabled && poseDevice.warning" class="field-help">{{ poseDevice.warning }}</p>

    <div v-if="studioView === 'canvas'" class="canvas-stage">
      <StudioCanvas ref="canvasPreview" :heads="heads" :gender="gender" :pose="avatar.pose.id" :generated-outfit="poseGeneration.render" :dressed="dressed" :guides="guides" />
      <div class="canvas-stage-label"><span class="status-dot ready" />自由キャンバス<span>ブラウザに自動保存</span></div>
      <CanvasControls :zoom="canvasPreview?.zoom || 1" :exporting="exporting || waitingForAi"
        @zoom-in="canvasPreview?.zoomIn()" @zoom-out="canvasPreview?.zoomOut()"
        @fit-view="canvasPreview?.fitView()" @reset-view="canvasPreview?.resetTo100()"
        @add-note="canvasPreview?.addNote()" @export="exportPng(canvasPreview?.mannequinSvg() || null, wardrobe.title)" />
    </div>
    <div
      v-else
      class="mannequin-stage"
      :style="{ backgroundColor: background }"
    >
      <div class="stage-corner">
        <span>FASHFOLIO / CHARACTER STUDIO</span>
        <span>{{ heads }} HEAD PROPORTIONS</span>
      </div>
      <div class="mannequin-viewport" :class="{ 'is-comparing': !!baseline }">
        <OutfitComparison v-if="baseline" ref="comparisonPreview" :baseline="baseline" :current="comparisonCurrent" :dressed="dressed" :guides="guides" />
        <MannequinPreview
          v-else
          ref="preview"
          :heads="heads"
          :selected="wardrobe.selectedItems"
          :palette="wardrobe.palette"
          :dressed="dressed"
          :guides="guides"
          :palette-colors="paletteColors"
          :gender="gender"
          :pose="avatar.pose.id"
          :generated-outfit="poseGeneration.render"
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

    <div v-if="studioView === 'fitting'" class="tryon-stage-tools">
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
      <div v-if="!baseline" class="stage-zoom">
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

    <p v-if="exportError" class="tryon-export-error" role="alert">{{ exportError }}</p>

  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { Eye, ZoomIn, ZoomOut, Download, Copy, Check, Layers, Maximize2, Sparkles, Columns2 } from "lucide-vue-next";
import { useWardrobe } from "~/composables/useWardrobe";
import { useAvatar } from "~/composables/useAvatar";
import { useIllustrationExport } from "~/composables/useIllustrationExport";
import StudioCanvas from "~/components/canvas/StudioCanvas.vue";
import CanvasControls from "~/components/ui/CanvasControls.vue";
import type { Garment } from "~/types/wardrobe";
import { mannequinTypes } from "~/data/avatarPresets";
import type { MannequinGender } from "~/types/avatar";
import { usePoseGeneration } from "~/composables/usePoseGeneration";
import { useDeviceGeneration } from "~/composables/useDeviceGeneration";
import type { PoseRenderInput } from "~/utils/poseReference";
import OutfitComparison, { type ComparisonOutfit } from "~/components/OutfitComparison.vue";

const wardrobe = useWardrobe();
const avatar = useAvatar();
const poseGeneration = usePoseGeneration();
const poseDevice = useDeviceGeneration();
const studioView = ref<"fitting" | "canvas">("fitting");
const canvasPreview = ref<InstanceType<typeof StudioCanvas> | null>(null);
const preview = ref<{ svg: SVGSVGElement | null } | null>(null);
const comparisonPreview = ref<{ svg: SVGSVGElement | null; reference: () => SVGSVGElement | null } | null>(null);
const baseline = ref<ComparisonOutfit | null>(null);
const comparisonCurrent = computed<ComparisonOutfit>(() => ({ selected: wardrobe.selectedItems, palette: wardrobe.palette,
  paletteColors: wardrobe.previewPaletteColors, heads: wardrobe.heads, gender: avatar.config.gender || "girl", pose: avatar.pose.id, title: wardrobe.title }));
function toggleComparison() {
  if (!baseline.value) poseGeneration.disable();
  baseline.value = baseline.value ? null : JSON.parse(JSON.stringify(comparisonCurrent.value));
}
watch(studioView, view => { if (view === "fitting" && baseline.value) poseGeneration.disable(); });
const { exporting, error: exportError, copied, exportPng, copyPng } = useIllustrationExport();
onMounted(async () => {
  avatar.hydrate();
  await nextTick();
  await poseGeneration.update(poseInput.value, referenceSvg);
  await poseGeneration.hydrate();
});
const heads = computed({ get: () => wardrobe.heads, set: (value: number) => { wardrobe.heads = value; } });
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
  { value: "#f4f5f7", label: "ペーパーグレー" },
  { value: "#faf5ee", label: "ウォームホワイト" },
  { value: "#eef4f2", label: "ミントグレー" },
  { value: "#1f1d24", label: "ダーク" },
];
const background = ref(backgrounds[0]!.value);
const dressed = ref(true);
const guides = ref(false);
const paletteColors = computed({ get: () => wardrobe.previewPaletteColors, set: (value: boolean) => { wardrobe.previewPaletteColors = value; } });
const poseInput = computed<PoseRenderInput>(() => ({ heads: heads.value, gender: gender.value, pose: avatar.pose.id,
  selected: wardrobe.selectedItems, palette: wardrobe.palette, paletteColors: paletteColors.value }));
const waitingForAi = computed(() => dressed.value && poseGeneration.enabled && !poseGeneration.render && (poseGeneration.generating || poseGeneration.preparing || poseDevice.busy));
watch([poseInput,dressed] as const, async ([value]) => { await nextTick(); await poseGeneration.update(value, referenceSvg); }, { deep: true, flush: "post" });
const zoom = ref(100);
function activeSvg() {
  return studioView.value === "canvas" ? canvasPreview.value?.mannequinSvg() || null : baseline.value ? comparisonPreview.value?.svg || null : preview.value?.svg || null;
}
function referenceSvg() { return dressed.value ? (baseline.value && studioView.value === 'fitting' ? comparisonPreview.value?.reference() || null : activeSvg()) : null; }
async function addGarment(item: Garment) {
  studioView.value = "canvas";
  await nextTick();
  canvasPreview.value?.addGarment(item);
}
defineExpose({ addGarment });
</script>
