<template>
  <g :data-art-source="item.id">
    <defs>
      <image :id="`${id}-image`" data-catalog-art="" :href="url" width="240" height="260" />
      <clipPath v-for="(piece,i) in pieces" :id="`${id}-tile-${i}`" :key="i"><polygon :points="piece.clip" /></clipPath>
      <template v-for="(piece,i) in pieces" :key="`region-${i}`"><clipPath v-if="piece.region" :id="`${id}-region-${i}`"><polygon :points="piece.region" /></clipPath></template>
    </defs>
    <g v-for="(piece,i) in pieces" :key="i" :transform="piece.transform">
      <g :clip-path="piece.region ? `url(#${id}-region-${i})` : undefined"><use :href="`#${id}-image`" :clip-path="`url(#${id}-tile-${i})`" /></g>
    </g>
  </g>
</template>
<script setup lang="ts">
import { computed, useId } from "vue";
import { catalogArtworkUrl } from "~/utils/catalogArtwork";
import { fitCatalogArtwork } from "~/utils/catalogFitting";
import type { AvatarRig } from "~/utils/avatarRig";
import type { Garment } from "~/types/wardrobe";
const props=defineProps<{item:Garment; rig:AvatarRig; palette:string[]; paletteColors:boolean}>();
const id=`catalog-${useId().replace(/[^a-zA-Z0-9_-]/g,"")}`;
const url=computed(()=>catalogArtworkUrl(props.item,props.palette,props.paletteColors));
const pieces=computed(()=>fitCatalogArtwork(props.rig,props.item));
</script>
