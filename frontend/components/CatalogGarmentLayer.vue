<template>
  <g :data-art-source="item.id" :data-pose-generated="rig.pose.id" :data-waist-fit="tucked || undefined">
    <FittedHosiery v-if="rasterHosiery" :item="item" />
    <template v-else>
    <defs>
      <image v-for="part in parts" :key="part.key" :id="`${id}-image-${part.key}`" data-catalog-art="" :data-part="item.imageUrl ? item.category : undefined" :href="part.url" width="240" height="260" preserveAspectRatio="none" />
      <clipPath v-for="(piece,i) in pieces" :id="`${id}-tile-${i}`" :key="i"><polygon :points="piece.clip" /></clipPath>
      <template v-for="(piece,i) in pieces" :key="`region-${i}`"><clipPath v-if="piece.region" :id="`${id}-region-${i}`"><polygon :points="piece.region" /></clipPath></template>
    </defs>
    <g v-for="(piece,i) in pieces" :key="i" :transform="piece.transform" :data-fabric-layer="piece.layer">
      <g :clip-path="piece.region ? `url(#${id}-region-${i})` : undefined">
        <use :href="`#${id}-image-${piece.layer || 'body'}`" :clip-path="`url(#${id}-tile-${i})`" />
      </g>
    </g>
    </template>
  </g>
</template>
<script setup lang="ts">
import { computed, useId } from "vue";
import FittedHosiery from "~/components/FittedHosiery.vue";
import { catalogArtworkUrl, catalogArtworkLayers } from "~/utils/catalogArtwork";
import { fitCatalogArtwork } from "~/utils/catalogFitting";
import type { AvatarRig } from "~/utils/avatarRig";
import type { Garment } from "~/types/wardrobe";
import type { GarmentArtworkLayer } from "~/utils/garmentLayers";
const props=defineProps<{item:Garment; rig:AvatarRig; palette:string[]; paletteColors:boolean; tucked?:boolean; plane?:"back"|"front"}>();
const id=`catalog-${useId().replace(/[^a-zA-Z0-9_-]/g,"")}`;
const rasterHosiery=computed(()=>props.item.category === "socks" && !props.item.imageUrl);
const pieces=computed(()=>rasterHosiery.value?[]:fitCatalogArtwork(props.rig,props.item,{waistFit:props.tucked}).filter(piece=>props.plane === "back" ? piece.layer?.endsWith("-back") : props.plane === "front" ? !piece.layer?.endsWith("-back") : true));
const parts=computed(()=> {
  const layered=catalogArtworkLayers(props.item).length>0;
  return [...new Set(pieces.value.map(piece=>piece.layer || "body"))].map(key=>({ key, url:catalogArtworkUrl(props.item,props.palette,props.paletteColors,layered?key as GarmentArtworkLayer:undefined) }));
});
</script>
