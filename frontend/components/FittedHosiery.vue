<template>
  <g :data-hosiery="item.kind" :data-hosiery-color="color" :data-hosiery-coverage="item.kind === 'tights' ? 'legs' : 'socks'">
    <defs>
      <filter :id="`${id}-alpha`" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncA type="linear" slope="6" intercept="-4" /></feComponentTransfer></filter>
      <filter :id="`${id}-tint`" color-interpolation-filters="sRGB">
        <feComponentTransfer><feFuncA type="linear" slope="6" intercept="-4" /></feComponentTransfer>
        <feColorMatrix type="matrix" :values="tint" />
      </filter>
      <filter :id="`${id}-foot-tint`" color-interpolation-filters="sRGB">
        <feComponentTransfer><feFuncA type="linear" slope="6" intercept="-4" /></feComponentTransfer>
        <feColorMatrix type="matrix" :values="footTint" />
      </filter>
      <clipPath :id="`${id}-length`"><path :d="cuffClip" /></clipPath>
      <clipPath :id="`${id}-sock-foot`"><rect :x="artworkBodyX(350)" :y="artworkBodyY(1430)" :width="330*.4" :height="artworkBodyY(1536)-artworkBodyY(1430)" /></clipPath>
      <mask :id="`${id}-silhouette`" maskUnits="userSpaceOnUse" x="-205" y="-110" width="410" height="500" style="mask-type:alpha"><image :href="characterArtwork.lowerBase" :filter="`url(#${id}-alpha)`" v-bind="bounds" preserveAspectRatio="none" /></mask>
    </defs>
    <!-- The same source pixels as the base keep calves, heels and toes aligned. -->
    <g :clip-path="`url(#${id}-length)`">
      <image data-hosiery-artwork="" :href="characterArtwork.lowerBase" :filter="`url(#${id}-tint)`" v-bind="bounds" preserveAspectRatio="none" />
      <g :clip-path="`url(#${id}-sock-foot)`">
        <image :href="characterArtwork.body" :filter="`url(#${id}-foot-tint)`" v-bind="bounds" preserveAspectRatio="none" />
      </g>
      <g v-if="item.kind !== 'tights'" :mask="`url(#${id}-silhouette)`" stroke="#777080" stroke-width=".7" fill="none" opacity=".8">
        <path v-for="offset in [0,2.2]" :key="offset" :d="`M${artworkBodyX(350)} ${top+offset}Q${artworkBodyX(435)} ${top+offset+1.1} ${artworkBodyX(510)} ${top+offset}M${artworkBodyX(514)} ${top+offset}Q${artworkBodyX(590)} ${top+offset+1.1} ${artworkBodyX(680)} ${top+offset}`" />
      </g>
    </g>
  </g>
</template>
<script setup lang="ts">
import {computed,useId} from "vue";
import type {Garment} from "~/types/wardrobe";
import {characterArtwork,artworkBodyX,artworkBodyY} from "~/data/characterArtwork";
const props=defineProps<{item:Garment}>();
const id=`hosiery-${useId().replace(/[^a-zA-Z0-9_-]/g,"")}`;
const color=computed(()=>props.item.paint?.[0]||props.item.colors[0]||"#F1F0ED");
const top=computed(()=>artworkBodyY(props.item.kind==="tights"?875:props.item.kind==="knee-socks"?1105:props.item.kind==="crew-socks"?1245:1390));
const cuffClip=computed(()=>{
  const left=artworkBodyX(350),right=artworkBodyX(680),bottom=artworkBodyY(1536),y=top.value;
  if (props.item.kind==="tights") return `M${left} ${y}H${right}V${bottom}H${left}Z`;
  return `M${left} ${y}Q${artworkBodyX(435)} ${y+1.1} ${artworkBodyX(510)} ${y}H${artworkBodyX(514)}Q${artworkBodyX(590)} ${y+1.1} ${right} ${y}V${bottom}H${left}Z`;
});
const bounds={x:artworkBodyX(0),y:artworkBodyY(0),width:characterArtwork.width*.4,height:artworkBodyY(characterArtwork.height)-artworkBodyY(0)};
const matrixFor=(whitePoint:number)=>{
  const channels=[1,3,5].map(i=>parseInt(color.value.slice(i,i+2),16)/255/whitePoint);
  return [...channels.flatMap(c=>[c*.2126,c*.7152,c*.0722,0,0]),0,0,0,1,0].join(" ");
};
const tint=computed(()=>matrixFor(.94));
const footTint=computed(()=>matrixFor(.965));
</script>
