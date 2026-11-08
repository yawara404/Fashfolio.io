<template>
  <dialog ref="dialog" class="generation-dialog" aria-labelledby="generation-title" @close="$emit('close')" @click="closeOnBackdrop">
    <div class="dialog-heading">
      <div><span class="eyebrow">LOCAL CLOTHING LAB</span><h2 id="generation-title">自分だけの衣装を描く</h2></div>
      <button class="icon-button" aria-label="衣装生成を閉じる" @click="dialog?.close()"><X :size="20" /></button>
    </div>
    <p class="generation-lead">着せ替えゲームの衣装パーツを、あなたの端末で。<br />生成した衣装はこのブラウザの衣装棚に保存できます。</p>
    <div class="device-status" :class="{ available: device.supported }">
      <Cpu :size="19" /><div><strong>{{ device.supported === null ? '端末を確認中…' : device.supported ? 'この端末のGPUで生成' : 'この端末では画像生成を利用できません' }}</strong>
      <p>{{ device.supported === false ? 'WebGPU（shader-f16）対応のPC版Chrome / Edgeでお試しください。衣装選び・試着はこのまま使えます。' : 'Stable Diffusion Turbo · 512 × 512 · 処理中もほかのパーツを編集できます' }}</p></div>
    </div>
    <div class="generation-columns">
      <div class="generation-form">
        <label class="field-label" for="generation-base">形のベース / {{ wardrobe.activeDefinition?.name }}</label>
        <select id="generation-base" v-model="baseId" :disabled="device.busy">
          <option v-for="item in baseOptions" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
        <label class="field-label" for="generation-name">衣装の名前</label>
        <input id="generation-name" v-model="name" maxlength="60" :disabled="device.busy" />
        <label class="field-label" for="generation-description">描きたい衣装（英語推奨）</label>
        <textarea id="generation-description" v-model="description" rows="4" maxlength="250" :disabled="device.busy" placeholder="ribbon-tie blouse, puff sleeves, cotton" />
        <p class="field-help">正面向きの衣装パーツとして生成します。形のベースは試着時の配置・サイズに使います。</p>
        <div class="generation-settings"><label for="generation-seed">Seed<input id="generation-seed" v-model.number="seed" type="number" min="1" max="4294967295" :disabled="device.busy" /></label><button class="icon-button" :disabled="device.busy" aria-label="Seedをランダムにする" @click="randomSeed"><Shuffle :size="15" /></button></div>
        <label class="generation-cutout"><input v-model="cutout" type="checkbox" :disabled="device.busy" />白背景を簡易透過する</label>
      </div>
      <div class="generation-result">
        <div class="generation-canvas">
          <img v-if="device.preview" :src="device.preview" alt="この端末で生成した衣装。輪郭と背景を確認してください" />
          <div v-else><LoaderCircle v-if="device.busy" :size="32" class="spin" /><Sparkles v-else :size="32" :stroke-width="1" /><strong>{{ device.busy ? '衣装を準備しています' : 'ここに衣装が届きます' }}</strong><span>生成後、輪郭と背景を確認して<br />衣装棚に追加してください。</span></div>
        </div>
        <p v-if="device.preview" class="generation-result-meta">Seed {{ device.resultSeed }} · {{ device.duration }}秒 · PNG</p>
        <button v-if="device.preview" class="button primary generation-add" :disabled="adding || added" @click="addToWardrobe"><Check v-if="added" :size="15" /><Plus v-else :size="15" />{{ added ? '衣装棚に追加しました' : '衣装棚に追加して着用' }}</button>
        <a v-if="device.preview" :href="device.preview" class="text-link generation-download" :download="`${name || 'fashfolio-clothing'}.png`"><Download :size="13" />PNGを保存</a>
      </div>
    </div>
    <div v-if="device.busy || device.message" class="generation-progress" role="status" aria-live="polite"><span>{{ device.message }}</span><progress v-if="device.busy" :value="device.progress ?? undefined" max="1" /></div>
    <p v-if="device.error || addError" class="generation-error" role="alert">{{ device.error || addError }}</p>
    <p v-if="device.warning" class="field-help">{{ device.warning }}</p>
    <div class="generation-actions">
      <button v-if="device.busy" class="button secondary" @click="device.cancel()"><Square :size="13" />停止してメモリを解放</button>
      <button v-else-if="!device.ready" class="button primary" :disabled="device.supported !== true" @click="device.prepare()"><Download :size="15" />モデルを準備（初回 約2.5GB）</button>
      <button v-else class="button primary" :disabled="!description.trim() || !base" @click="generate"><Sparkles :size="15" />{{ device.preview ? 'もう一度生成する' : 'この端末で生成する' }}</button>
      <button class="text-link" :disabled="device.busy" @click="device.clearCache()">モデルのキャッシュを削除</button>
    </div>
    <p class="generation-footnote">モデルはHugging Faceから取得し、次回用にキャッシュします。生成処理と画像保存は端末内で行います。GPU・メモリの空き容量が必要です（メモリ8GB以上を推奨）。生成画像の配色は生成時に確定します。<a href="https://huggingface.co/stabilityai/sd-turbo" target="_blank" rel="noopener noreferrer">モデルの詳細・ライセンス<ArrowUpRight :size="10" /></a></p>
  </dialog>
</template>
<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { X, Cpu, Sparkles, Download, Plus, Check, Shuffle, Square, LoaderCircle, ArrowUpRight } from "lucide-vue-next";
import { useWardrobe } from "~/composables/useWardrobe";
import { useDeviceGeneration } from "~/composables/useDeviceGeneration";
const props = defineProps<{ open: boolean }>();
defineEmits<{ close: [] }>();
const wardrobe = useWardrobe();
const device = useDeviceGeneration();
const dialog = ref<HTMLDialogElement | null>(null);
const baseId = ref("");
const name = ref("");
const description = ref("");
const seed = ref(1);
const cutout = ref(true);
const adding = ref(false), added = ref(false), addError = ref("");
const run = computed(() => device.context);
const baseOptions = computed(() => wardrobe.catalog.items.filter((i) => i.category === wardrobe.activeCategory && !i.source));
const base = computed(() => wardrobe.catalog.items.find((i) => i.id === baseId.value));
function randomSeed() { seed.value = crypto.getRandomValues(new Uint32Array(1))[0]! || 1; }
watch(baseId, () => {
  if (!base.value || device.busy) return;
  name.value = `オリジナル${base.value.name}`;
  description.value = `${base.value.name_en}, ${base.value.material_en}, ${base.value.tags.slice(0, 2).join(', ')}`;
});
watch(() => props.open, async (open) => {
  await nextTick();
  if (open) {
    if (!device.busy) {
      baseId.value = baseOptions.value.find((i) => i.id === wardrobe.selections[wardrobe.activeCategory])?.id || baseOptions.value[0]?.id || "";
      if (!device.preview) randomSeed();
    }
    dialog.value?.showModal(); device.detect();
  } else dialog.value?.close();
}, { immediate: true });
function generate() {
  if (!base.value) return;
  randomizeInvalidSeed(); added.value = false; addError.value = "";
  const palette = wardrobe.catalog.palettes.find((p) => p.id === wardrobe.paletteId);
  const color = palette?.names[{ tops: 0, outer: 1, bottoms: 2, shoes: 4, head: 3, bag: 0, jewelry: 3 }[base.value.category]] || "soft pastel colors";
  // Keep the clothing description first so CLIP's 77-token limit preserves it.
  const prompt = `${description.value.trim()}, ${color}, anime dress up game clothing asset, front view, cel shading, crisp outline, isolated garment only, plain white background`;
  device.generate(prompt, seed.value, cutout.value, { base: { ...base.value, name_en: description.value.trim() }, prompt, name: name.value || base.value.name, colors: [...wardrobe.palette] });
}
function randomizeInvalidSeed() { if (!Number.isInteger(seed.value) || seed.value < 1 || seed.value > 4294967295) randomSeed(); }
async function addToWardrobe() {
  if (!device.image || !run.value) return;
  adding.value = true; addError.value = "";
  try {
    await wardrobe.addGenerated({ ...run.value.base, id: `local-${crypto.randomUUID()}`, baseId: run.value.base.id, source: "local-diffusion", name: run.value.name, colors: run.value.colors, generationPrompt: run.value.prompt, seed: device.resultSeed, description: "このブラウザで生成したオリジナル衣装。" }, device.image);
    added.value = true;
  } catch { addError.value = "衣装を保存できませんでした。空き容量を確認するか、PNGで保存してください。"; }
  finally { adding.value = false; }
}
function closeOnBackdrop(event: MouseEvent) {
  if (event.target !== dialog.value) return;
  const rect = dialog.value!.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.value?.close();
}
</script>
