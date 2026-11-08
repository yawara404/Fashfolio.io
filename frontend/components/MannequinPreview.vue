<template>
  <svg ref="root" class="mannequin-preview" :class="{ 'is-illustration': isIllustration }"
    :data-heads="geometry.heads" :data-gender="gender" :data-view="view" data-character-style="generated-jito" viewBox="0 0 480 720"
    role="img" :aria-label="`${geometry.heads}頭身の手描き風デフォルメキャラクター（${gender === 'boy' ? '少年' : '少女'}）${dressed ? 'に選択した衣装を着用' : ''}`"
    xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter :id="`${id}-ink`" filterUnits="userSpaceOnUse" x="0" y="0" width="480" height="720" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".018 .026" numOctaves="2" seed="17" result="paper" />
        <feDisplacementMap in="SourceGraphic" in2="paper" scale=".55" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <!-- Crop the original face and hair, excluding the fixed outfit. -->
      <clipPath :id="`${id}-art-head`"><path d="M-1-.2H1V1.14H.28V1H-.28V1.14H-1Z" /></clipPath>
      <clipPath :id="`${id}-art-body`"><path :d="`M-13 ${artworkBodyY(290)}H13V0H205V381H-205V0H-13Z`" /></clipPath>
      <linearGradient v-if="isIllustration" :id="`${id}-backdrop`" x2="0" y2="1">
        <stop :stop-color="background.base" /><stop offset="1" :stop-color="background.accent" stop-opacity=".25" />
      </linearGradient>
    </defs>
    <g v-if="isIllustration" data-layer="illustration">
      <rect width="480" height="720" :fill="`url(#${id}-backdrop)`" />
      <circle cx="365" cy="170" r="160" :fill="background.accent" opacity=".13" />
      <rect x="18" y="18" width="444" height="684" rx="16" fill="none" :stroke="background.ink" opacity=".12" />
    </g>
    <ellipse cx="240" :cy="geometry.ground + 10" :rx="geometry.unit * .65" ry="7" fill="#524C60" opacity=".08" data-export-hide />
    <g v-if="guides && !isIllustration" data-layer="guides" data-export-hide fill="none" stroke="#8D879B" stroke-width=".65">
      <path d="M80 42V654M76 42H84M76 654H84" />
      <g v-for="n in Math.floor(geometry.heads) + 1" :key="n">
        <path :d="`M80 ${42 + (n - 1) * geometry.unit}H400`" stroke-dasharray="3 7" opacity=".25" />
        <text v-if="n <= geometry.heads" x="66" :y="42 + (n - .5) * geometry.unit + 3" stroke="none" fill="#8D879B" font-size="9" text-anchor="middle">{{ n }}</text>
      </g>
    </g>

    <g v-if="dressed" data-layer="clothes-back" :transform="geometry.body" :stroke="line" :stroke-width="geometry.stroke" stroke-linejoin="round">
      <g transform="scale(.01)" :stroke-width="geometry.stroke * 100">
        <g v-for="layer in backLayers" :key="layer.item.id" :data-part="layer.item.category" :fill="fabric(layer.item)">
          <CatalogGarmentLayer :item="layer.item" :rig="rig" :palette="palette" :palette-colors="paletteColors" />
        </g>
      </g>
    </g>

    <g data-layer="base" :transform="geometry.body" fill="#FFFFFF">
      <g transform="scale(.01)" :clip-path="`url(#${id}-art-body)`">
        <image data-artwork="body" :href="characterArtwork.body" :x="artworkBodyX(0)" :y="artworkBodyY(0)"
          :width="characterArtwork.width * .4" :height="artworkBodyY(characterArtwork.height) - artworkBodyY(0)" preserveAspectRatio="none" />
      </g>
    </g>

    <g :filter="`url(#${id}-ink)`" data-layer="hand-drawn">
      <g v-if="dressed" data-layer="clothes" :transform="geometry.body" :stroke="line" :stroke-width="geometry.stroke" stroke-linecap="round" stroke-linejoin="round">
        <g transform="scale(.01)" :stroke-width="geometry.stroke * 100">
          <g v-for="layer in bodyLayers" :key="layer.item.id" :data-part="layer.item.category" :fill="fabric(layer.item)">
            <CatalogGarmentLayer v-if="!layer.item.imageUrl" :item="layer.item" :rig="rig" :palette="palette" :palette-colors="paletteColors" />
            <image v-for="(box, index) in layer.boxes" v-else :key="`image-${index}`" :data-part="layer.item.category" :href="layer.item.imageUrl" v-bind="box" preserveAspectRatio="none" />
          </g>
          <g v-if="backLayers.length" data-layer="backpack-straps" fill="none" :stroke="palette[3] || '#B6A6B7'" stroke-width="5">
            <path v-for="side in [-1,1]" :key="side" :d="`M${side*rig.torso.shoulderHalfW*.8} ${rig.torso.shoulderY+5}Q${side*rig.torso.chestHalfW*.75} ${rig.torso.chestY} ${side*rig.torso.waistHalfW*.85} ${rig.torso.waistY}`" />
          </g>
        </g>
      </g>
    </g>

    <!-- The face scales uniformly; the illustrated body and garments share a rig. -->
    <g data-layer="head" :transform="geometry.head">
      <g :clip-path="`url(#${id}-art-head)`" data-layer="generated-face">
        <image data-artwork="head" :href="characterArtwork[gender]" x="-2.048" y="-.16" width="4.096" height="6.144" preserveAspectRatio="none" />
      </g>
      <g v-if="dressed" data-layer="head-clothes" transform="scale(.01)" :stroke="line" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
        <g v-for="layer in headLayers" :key="layer.item.id" :data-part="layer.item.category" :fill="fabric(layer.item)">
          <CatalogGarmentLayer v-if="!layer.item.imageUrl" :item="layer.item" :rig="headRig" :palette="palette" :palette-colors="paletteColors" />
          <image v-for="(box, index) in layer.boxes" v-else :key="index" :href="layer.item.imageUrl" :data-part="layer.item.category" v-bind="box" preserveAspectRatio="xMidYMid meet" />
        </g>
      </g>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed, ref, useId } from "vue";
import CatalogGarmentLayer from "~/components/CatalogGarmentLayer.vue";
import { characterGeometry, characterHeadRig } from "~/utils/mannequinGeometry";
import { characterArtwork, artworkBodyX, artworkBodyY } from "~/data/characterArtwork";
import { garmentImagePlacements } from "~/utils/garmentShapes";
import { illustrationBackdrops } from "~/data/avatarPresets";
import type { AvatarConfig, MannequinGender } from "~/types/avatar";
import type { Garment, Category } from "~/types/wardrobe";

const props = withDefaults(defineProps<{
  heads: number; gender?: MannequinGender; selected: Garment[]; palette: string[];
  dressed: boolean; guides: boolean; paletteColors: boolean;
  avatar?: Partial<AvatarConfig>; view?: "fitting" | "illustration"; backdrop?: string;
}>(), { view: "fitting", backdrop: "atelier" });
const root = ref<SVGSVGElement | null>(null);
defineExpose({ svg: root });
const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
const gender = computed<MannequinGender>(() => props.gender ?? (props.avatar?.gender === "boy" || props.avatar?.preset === "boy" ? "boy" : "girl"));
const geometry = computed(() => characterGeometry(props.heads, gender.value));
const rig = computed(() => geometry.value.rig);
const headRig = computed(() => characterHeadRig(rig.value));
const isIllustration = computed(() => props.view === "illustration");
const background = computed(() => illustrationBackdrops.find((b) => b.id === props.backdrop) || illustrationBackdrops[0]!);
const line = "#777080";
const indexes: Record<Category, number> = { tops: 0, outer: 1, bottoms: 2, shoes: 4, head: 3, bag: 0, jewelry: 3 };
function fabric(item: Garment) { return (props.paletteColors ? props.palette[indexes[item.category]] : item.colors[0]) || "#D6CCD9"; }
const layers = computed(() => {
  if (!props.dressed) return [];
  const order: Category[] = ["bottoms", "tops", "shoes", "outer", "jewelry", "bag", "head"];
  return order.flatMap((category) => {
    const item = props.selected.find((i) => i.category === category);
    if (!item) return [];
    const head = category === "head" || (category === "jewelry" && ["earrings", "hoops"].includes(item.kind));
    const r = head ? headRig.value : rig.value;
    let boxes = item.imageUrl ? garmentImagePlacements(r, category).map((p) => p.box) : [];
    if (category === "shoes" && boxes.length === 2) {
      const left = Math.min(...boxes.map((b) => b.x)), top = Math.min(...boxes.map((b) => b.y));
      boxes = [{ x: left, y: top, width: Math.max(...boxes.map((b) => b.x + b.width)) - left, height: Math.max(...boxes.map((b) => b.y + b.height)) - top }];
    }
    if (head && category === "jewelry" && item.imageUrl) boxes = [{ x: -68, y: 65, width: 136, height: 28 }];
    return [{ item, head, boxes, back: category === 'bag' && item.kind === 'backpack' && !item.imageUrl }];
  });
});
const bodyLayers = computed(() => layers.value.filter((l) => !l.head && !l.back));
const backLayers = computed(() => layers.value.filter((l) => l.back));
const headLayers = computed(() => layers.value.filter((l) => l.head));
</script>
