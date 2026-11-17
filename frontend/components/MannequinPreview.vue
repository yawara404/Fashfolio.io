<template>
  <svg ref="root" class="mannequin-preview" :class="{ 'is-illustration': isIllustration }"
    :data-heads="geometry.heads" :data-gender="gender" :data-pose="poseDefinition.id" :data-view="view" data-character-style="generated-jito" :viewBox="geometry.viewBox"
    role="img" :aria-label="`${geometry.heads}頭身の手描き風デフォルメキャラクター（${gender === 'boy' ? '少年' : '少女'}・${poseDefinition.name}）${dressed ? 'に選択した衣装を着用' : ''}`"
    xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter :id="`${id}-ink`" filterUnits="userSpaceOnUse" :x="geometry.stageX" y="0" :width="geometry.stageWidth" height="720" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".018 .026" numOctaves="2" seed="17" result="paper" />
        <feDisplacementMap in="SourceGraphic" in2="paper" scale=".55" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <!-- Each garment gets a soft contact shadow on whatever lies beneath, a darker inner rim
           that gives the cloth thickness, and fine paper grain that matches the hand-drawn body. -->
      <filter :id="`${id}-cloth`" x="-12%" y="-8%" width="124%" height="118%" color-interpolation-filters="sRGB">
        <!-- Mesh seams leave hair-thin ticks beside the silhouette; a blurred threshold of the alpha removes them. -->
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.3" result="mask-blur" />
        <feComponentTransfer in="mask-blur" result="mask"><feFuncA type="linear" slope="12" intercept="-5.5" /></feComponentTransfer>
        <feComposite in="SourceGraphic" in2="mask" operator="in" result="cloth" />
        <feGaussianBlur in="mask" stdDeviation="1.5" result="shadow-blur" />
        <feOffset in="shadow-blur" dx="0" dy="1.7" result="shadow-shape" />
        <feFlood flood-color="#3D3850" flood-opacity=".2" />
        <feComposite in2="shadow-shape" operator="in" result="shadow" />
        <feComponentTransfer in="mask" result="outside"><feFuncA type="table" tableValues="1 0" /></feComponentTransfer>
        <feGaussianBlur in="outside" stdDeviation="2.3" result="outside-blur" />
        <feFlood flood-color="#3D3850" flood-opacity=".2" />
        <feComposite in2="outside-blur" operator="in" result="rim-raw" />
        <feComposite in="rim-raw" in2="mask" operator="in" result="rim" />
        <feTurbulence type="fractalNoise" baseFrequency=".38" numOctaves="3" seed="11" result="noise" />
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 .4  0 0 0 0 .38  0 0 0 0 .48  .34 0 0 0 -.155" result="speckle" />
        <feComposite in="speckle" in2="mask" operator="in" result="grain" />
        <feMerge><feMergeNode in="shadow" /><feMergeNode in="cloth" /><feMergeNode in="rim" /><feMergeNode in="grain" /></feMerge>
      </filter>
      <!-- Crop the original face and hair, excluding the fixed outfit. -->
      <clipPath :id="`${id}-art-head`"><path :d="`M-1-.2H1V1.14H.26Q.15 1.1 .1 1H.11V${geometry.neckOverlap}H-.11V1H-.1Q-.15 1.1 -.26 1.14H-1Z`" /></clipPath>
      <clipPath :id="`${id}-art-body`"><path :d="bodyArtworkClip" /></clipPath>
      <template v-if="hasInner">
        <clipPath :id="`${id}-inner-patch`"><rect v-bind="innerPatch" /></clipPath>
        <clipPath :id="`${id}-lower-patch`"><rect v-bind="lowerPatch" /></clipPath>
        <clipPath :id="`${id}-spats-top`"><path :d="spatsTopClip" /></clipPath>
        <clipPath :id="`${id}-spats-legs`"><path :d="spatsLegsClip" /></clipPath>
        <mask :id="`${id}-inner-base`" maskUnits="userSpaceOnUse" x="-210" y="-110" width="420" height="500" style="mask-type:luminance"><rect x="-210" y="-110" width="420" height="500" fill="white" /><rect v-bind="innerPatch" fill="black" /><rect v-bind="lowerPatch" fill="black" /></mask>
        <filter :id="`${id}-inner-alpha`" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncA type="linear" slope="6" intercept="-4" /></feComponentTransfer></filter>
        <filter v-if="tightsTint" :id="`${id}-tights-tint`" color-interpolation-filters="sRGB">
          <feComponentTransfer><feFuncA type="linear" slope="6" intercept="-4" /></feComponentTransfer>
          <feColorMatrix type="matrix" :values="tightsTint" />
        </filter>
      </template>
      <mask v-if="posedArms.length" :id="`${id}-stationary-body`" maskUnits="userSpaceOnUse" x="-205" y="-20" width="410" height="402" style="mask-type: luminance">
        <rect x="-205" y="-20" width="410" height="402" fill="white" />
        <polygon v-for="(arm, i) in posedArms" :key="i" :points="arm.cutout" fill="black" />
      </mask>
      <template v-for="(piece, i) in armPieces" :key="`arm-${i}`">
        <clipPath :id="`${id}-arm-${i}`"><polygon :points="piece.clip" /></clipPath>
        <clipPath :id="`${id}-arm-region-${i}`"><polygon :points="piece.region" /></clipPath>
      </template>
      <linearGradient v-if="isIllustration" :id="`${id}-backdrop`" x2="0" y2="1">
        <stop :stop-color="background.base" /><stop offset="1" :stop-color="background.accent" stop-opacity=".25" />
      </linearGradient>
    </defs>
    <g v-if="isIllustration" data-layer="illustration">
      <rect :x="geometry.stageX" :width="geometry.stageWidth" height="720" :fill="`url(#${id}-backdrop)`" />
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
        <g v-for="layer in fabricBackLayers" :key="`lining-${layer.item.id}`" :data-part="layer.item.category" :fill="fabric(layer.item)"><CatalogGarmentLayer :item="layer.item" :rig="rig" :palette="palette" :palette-colors="paletteColors" :tucked="layer.item.category === 'tops' && tuckBlouse" plane="back" /></g>
        <g v-for="layer in backLayers" :key="layer.item.id" :data-part="layer.item.category" :fill="fabric(layer.item)">
          <CatalogGarmentLayer :item="layer.item" :rig="rig" :palette="palette" :palette-colors="paletteColors" />
        </g>
      </g>
    </g>

    <g data-layer="base" :transform="geometry.body" fill="#FFFFFF">
      <g transform="scale(.01)" :clip-path="`url(#${id}-art-body)`">
        <g :mask="posedArms.length ? `url(#${id}-stationary-body)` : undefined">
          <g :id="`${id}-body-pixels`">
            <image data-artwork="body" :href="characterArtwork.body" :mask="hasInner ? `url(#${id}-inner-base)` : undefined" v-bind="bodyImageBounds" preserveAspectRatio="none" />
            <g v-if="hasInner" :clip-path="`url(#${id}-inner-patch)`" :data-art-source="baseInnerItem?.id" data-base-inner=""><image data-artwork="inner-patch" :href="innerBase" :filter="`url(#${id}-inner-alpha)`" v-bind="bodyImageBounds" preserveAspectRatio="none" /></g>
            <g :clip-path="`url(#${id}-lower-patch)`" :data-art-source="baseBottomItem?.id" :data-base-bottom="baseBottomKind" :data-bottom-color="baseBottomItem?.colors[0]">
              <template v-if="baseBottomKind === 'inner-spats'">
                <g :clip-path="`url(#${id}-spats-legs)`"><image data-spats-legs="" :href="characterArtwork.lowerBase" :filter="`url(#${id}-inner-alpha)`" v-bind="bodyImageBounds" preserveAspectRatio="none" /></g>
                <g :clip-path="`url(#${id}-spats-top)`"><image data-artwork="lower-patch" :href="characterArtwork.innerBase" :filter="`url(#${id}-inner-alpha)`" v-bind="bodyImageBounds" preserveAspectRatio="none" /></g>
              </template>
              <image v-else data-artwork="lower-patch" :href="lowerBase" :filter="`url(#${id}-${tightsTint ? 'tights-tint' : 'inner-alpha'})`" v-bind="bodyImageBounds" preserveAspectRatio="none" />
            </g>
          </g>
        </g>
        <g v-for="(piece, i) in armPieces" :key="i" :transform="piece.transform" data-artwork-arm=""><g :clip-path="`url(#${id}-arm-region-${i})`"><use :href="`#${id}-body-pixels`" :clip-path="`url(#${id}-arm-${i})`" /></g></g>
      </g>
    </g>

    <g v-if="baseHosieryItem" data-layer="base-hosiery" :transform="geometry.body"><g transform="scale(.01)"><CatalogGarmentLayer :item="baseHosieryItem" :rig="rig" :palette="palette" :palette-colors="false" /></g></g>

    <g :filter="`url(#${id}-ink)`" data-layer="hand-drawn">
      <g v-if="dressed" data-layer="clothes" :transform="geometry.body" :stroke="line" :stroke-width="geometry.stroke" stroke-linecap="round" stroke-linejoin="round">
        <g transform="scale(.01)" :stroke-width="geometry.stroke * 100">
          <g v-for="layer in bodyLayers" :key="layer.item.id" :data-part="layer.item.category" :fill="fabric(layer.item)" :filter="`url(#${id}-cloth)`">
            <CatalogGarmentLayer v-if="!layer.item.imageUrl || layer.item.category === 'inner' || layer.item.category === 'tops' || layer.item.category === 'outer'" :tucked="layer.item.category === 'tops' && tuckBlouse" :item="layer.item" :rig="rig" :palette="palette" :palette-colors="paletteColors" plane="front" />
            <image v-for="(box, index) in layer.boxes" v-else :key="`image-${index}`" :data-part="layer.item.category" :href="layer.item.imageUrl" v-bind="box" preserveAspectRatio="none" />
          </g>
          <g v-if="backLayers.length" data-layer="backpack-straps" fill="none" :stroke="palette[3] || '#B6A6B7'" stroke-width="5">
            <path v-for="side in [-1,1]" :key="side" :d="`M${side*rig.torso.shoulderHalfW*.8} ${rig.torso.shoulderY+5}Q${side*rig.torso.chestHalfW*.75} ${rig.torso.chestY} ${side*rig.torso.waistHalfW*.85} ${rig.torso.waistY}`" />
          </g>
        </g>
      </g>
    </g>

    <image v-if="dressed && generatedOutfit" data-layer="generated-outfit" :href="generatedOutfit.imageUrl" v-bind="generatedOutfit.bounds" preserveAspectRatio="none" />

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
import { resolveStudioPose } from "~/data/studioPoses";
import { posedBodyArtwork } from "~/utils/posedBodyArtwork";
import { catalogArtworkLayers } from "~/utils/catalogArtwork";
import type { AvatarConfig, MannequinGender } from "~/types/avatar";
import type { Garment, Category } from "~/types/wardrobe";
import type { PoseRender } from "~/types/poseRender";

const props = withDefaults(defineProps<{
  heads: number; gender?: MannequinGender; pose?: string; selected: Garment[]; palette: string[];
  dressed: boolean; guides: boolean; paletteColors: boolean;
  avatar?: Partial<AvatarConfig>; view?: "fitting" | "illustration"; backdrop?: string;
  generatedOutfit?: PoseRender | null;
}>(), { view: "fitting", backdrop: "atelier" });
const root = ref<SVGSVGElement | null>(null);
defineExpose({ svg: root });
const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
const gender = computed<MannequinGender>(() => props.gender ?? (props.avatar?.gender === "boy" || props.avatar?.preset === "boy" ? "boy" : "girl"));
const poseDefinition = computed(() => resolveStudioPose(props.pose ?? props.avatar?.pose));
const geometry = computed(() => characterGeometry(props.heads, gender.value, poseDefinition.value.id));
const rig = computed(() => geometry.value.rig);
// The base itself wears the default inner, including when all wardrobe layers are hidden.
const hasInner = computed(() => true);
const innerBase = computed(() => gender.value === "boy" ? characterArtwork.boyInnerBase : characterArtwork.innerBase);
// The accepted cotton inner is already drawn in the base pixels. Painting a
// second camisole over it doubled the straps and changed the approved neckline.
const baseInnerItem = computed(() => props.selected.find(item=>!item.source && item.id === (gender.value === "boy" ? "cotton-tank" : "cotton-camisole")));
const baseBottomItem = computed(() => props.selected.find(item=>!item.source && item.category === "underwear"));
const baseBottomKind = computed(() => baseBottomItem.value?.kind || "inner-shorts");
const lowerBase = computed(() => baseBottomKind.value === "tights" ? characterArtwork.innerBase : characterArtwork.lowerBase);
const tightsTint = computed(() => {
  if (baseBottomKind.value !== "tights" || (baseBottomItem.value?.id === "white-tights" && !baseBottomItem.value.paint?.[0])) return "";
  const color = baseBottomItem.value?.paint?.[0] || baseBottomItem.value?.colors[0] || "#34343B";
  const channels = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255 / .94);
  return [...channels.flatMap(c => [c * .2126, c * .7152, c * .0722, 0, 0]), 0, 0, 0, 1, 0].join(" ");
});
const baseHosieryItem = computed(() => props.selected.find(item=>item.category === "socks" && !item.imageUrl && (props.dressed || item.kind === "tights") && !(baseBottomKind.value === "tights" && item.id === "ankle-socks")));
const innerPatch = { x:artworkBodyX(300), y:artworkBodyY(315), width:420*.4, height:artworkBodyY(740)-artworkBodyY(315) };
// Replace the old cycling-short hem and socks in the source pixels as well.
const lowerPatch = { x:artworkBodyX(350), y:artworkBodyY(717), width:330*.4, height:artworkBodyY(1536)-artworkBodyY(717) };
const spatsSeam = (dy = 0) => `H${artworkBodyX(389)}Q${artworkBodyX(440)} ${artworkBodyY(921 + dy)} ${artworkBodyX(491)} ${artworkBodyY(905.5 + dy)}L${artworkBodyX(524)} ${artworkBodyY(905 + dy)}Q${artworkBodyX(576)} ${artworkBodyY(921 + dy)} ${artworkBodyX(628)} ${artworkBodyY(905 + dy)}H${artworkBodyX(680)}`;
const spatsTopClip = `M${artworkBodyX(350)} ${artworkBodyY(717)}H${artworkBodyX(680)}V${artworkBodyY(905)}H${artworkBodyX(628)}Q${artworkBodyX(576)} ${artworkBodyY(921)} ${artworkBodyX(524)} ${artworkBodyY(905)}L${artworkBodyX(491)} ${artworkBodyY(905.5)}Q${artworkBodyX(440)} ${artworkBodyY(921)} ${artworkBodyX(389)} ${artworkBodyY(904.5)}H${artworkBodyX(350)}Z`;
const spatsLegsClip = `M${artworkBodyX(350)} ${artworkBodyY(903.5)}${spatsSeam(-1)}V${artworkBodyY(1536)}H${artworkBodyX(350)}Z`;
const bodyImageBounds = { x:artworkBodyX(0), y:artworkBodyY(0), width:characterArtwork.width*.4, height:artworkBodyY(characterArtwork.height)-artworkBodyY(0) };
// The base illustration wears a crew-neck T-shirt. Keep the neck pixels, but
// hide that shirt's upper outline beneath a fitted high-neck garment.
const bodyArtworkClip = computed(() => {
  const covered = props.dressed && props.selected.some(item => item.category === "tops" && item.kind === "knit");
  const half = covered ? rig.value.torso.neckHalfW + 1 : 22;
  const shoulder = covered ? rig.value.torso.shoulderY + rig.value.torso.shoulderDrop : 0;
  const edge = rig.value.torso.shoulderHalfW + 12;
  return `M-${half} ${artworkBodyY(290)}H${half}V${shoulder}H${edge}V0H500V381H-500V0H-${edge}V${shoulder}H-${half}Z`;
});
const posedArms = computed(() => posedBodyArtwork(characterGeometry(props.heads, gender.value).rig, rig.value));
const armPieces = computed(() => posedArms.value.flatMap(arm => arm.pieces));
const headRig = computed(() => characterHeadRig(rig.value));
const isIllustration = computed(() => props.view === "illustration");
const background = computed(() => illustrationBackdrops.find((b) => b.id === props.backdrop) || illustrationBackdrops[0]!);
const line = "#777080";
const indexes: Record<Category, number> = { inner: 1, underwear: 1, socks: 1, tops: 0, outer: 1, bottoms: 2, shoes: 4, head: 3, bag: 0, jewelry: 3 };
function fabric(item: Garment) { return (props.paletteColors ? props.palette[indexes[item.category]] : item.colors[0]) || "#D6CCD9"; }
const layers = computed(() => {
  if (!props.dressed) return [];
  const order: Category[] = ["underwear", "inner", "socks", "bottoms", "tops", "shoes", "outer", "jewelry", "bag", "head"];
  return order.flatMap((category) => {
    const item = props.selected.find((i) => i.category === category);
    if (!item) return [];
    const head = category === "head" || (category === "jewelry" && ["earrings", "hoops"].includes(item.kind));
    const r = head ? headRig.value : rig.value;
    let boxes = item.imageUrl ? garmentImagePlacements(r, category).map((p) => p.box) : [];
    if ((category === "shoes" || category === "socks") && boxes.length === 2) {
      const left = Math.min(...boxes.map((b) => b.x)), top = Math.min(...boxes.map((b) => b.y));
      boxes = [{ x: left, y: top, width: Math.max(...boxes.map((b) => b.x + b.width)) - left, height: Math.max(...boxes.map((b) => b.y + b.height)) - top }];
    }
    if (head && category === "jewelry" && item.imageUrl) boxes = [{ x: -68, y: 65, width: 136, height: 28 }];
    return [{ item, head, boxes, back: category === 'bag' && item.kind === 'backpack' && !item.imageUrl }];
  });
});
// Shape a blouse to the skirt waist while retaining its complete drawn hem and sleeves.
const tuckBlouse = computed(() => props.selected.some(item=>item.category === "bottoms") && (
  props.selected.some(item=>item.id === "mens-shirt") ||
  props.selected.some(item => item.category === "bottoms" && ["skirt", "tiered", "long-skirt"].includes(item.kind)) && props.selected.some(item => item.category === "tops" && ["blouse", "lace", "sailor"].includes(item.kind))
));
const bodyLayers = computed(() => layers.value.filter((l) => !l.head && !l.back && l.item.id !== baseInnerItem.value?.id && l.item.id !== baseBottomItem.value?.id && l.item.id !== baseHosieryItem.value?.id));
const fabricBackLayers = computed(() => bodyLayers.value.filter(layer=>catalogArtworkLayers(layer.item).some(part=>part.endsWith("-back"))));
const backLayers = computed(() => layers.value.filter((l) => l.back));
const headLayers = computed(() => layers.value.filter((l) => l.head));
</script>
