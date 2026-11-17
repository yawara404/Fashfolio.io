import { useIllustrationExport } from "~/composables/useIllustrationExport";
import { characterGeometry } from "~/utils/mannequinGeometry";
import type { MannequinGender } from "~/types/avatar";
import type { Garment } from "~/types/wardrobe";
import type { PoseRenderBounds } from "~/types/poseRender";
import { resolveStudioPose } from "~/data/studioPoses";
import catalog from "~/data/wardrobe.json";
import { garmentPaint } from "~/utils/garmentColors";

export interface PoseRenderInput { heads: number; gender: MannequinGender; pose: string; selected: Garment[]; palette: string[]; paletteColors: boolean }
export function poseRenderKey(input: PoseRenderInput) {
  return JSON.stringify(["sd-turbo-img2img-v7", input.heads, input.gender, input.pose, input.paletteColors ? input.palette : [],
    [...input.selected].sort((a,b) => a.category.localeCompare(b.category)).map(item => [item.id, item.kind, item.seed, item.generationPrompt, item.colors, item.paint])]);
}
export function poseRenderPrompt(input: PoseRenderInput) {
  const paints = catalog.palettes.flatMap(palette => palette.colors.map((hex, i) => ({ hex, name: palette.names[i] })));
  const clothes = input.selected.filter(item => item.category === "tops" || item.category === "outer").map(item => {
    const hex = garmentPaint(item, input.palette, input.paletteColors)[0];
    const color = paints.find(paint => paint.hex.toUpperCase() === hex?.toUpperCase())?.name;
    return `${color ? color + " " : ""}${item.name_en}, ${item.material_en}`;
  }).join(", ");
  return `hand drawn anime clothing, ${clothes}, ${resolveStudioPose(input.pose).generationPrompt}, softly relaxed fit, natural soft cloth folds, gravity draped sleeves, muted flat colors, delicate pencil outlines, same garment design and colors, illustration`;
}
export async function preparePoseReference(svg: SVGSVGElement, input: PoseRenderInput): Promise<{ reference: Blob; mask: Blob; bounds: PoseRenderBounds }> {
  const frame = characterGeometry(input.heads, input.gender, input.pose);
  const width = frame.stageWidth;
  const bounds = { x: frame.stageX, y: frame.origin + (frame.rig.torso.waistY + 30) * frame.unit * frame.sy / 100 - width / 2, width, height: width };
  const source = svg.cloneNode(true) as SVGSVGElement;
  source.removeAttribute("style");
  source.setAttribute("viewBox", `${bounds.x} ${bounds.y} ${width} ${width}`);
  source.querySelectorAll('[data-layer="generated-outfit"], [data-export-hide]').forEach(node => node.remove());
  const { renderPng } = useIllustrationExport();
  const reference = await renderPng(source, 512);
  const maskSource = source.cloneNode(true) as SVGSVGElement;
  maskSource.querySelectorAll('[data-layer="base"], [data-layer="base-hosiery"], [data-layer="head"], [data-layer="clothes-back"], [data-layer="illustration"]').forEach(node => node.remove());
  maskSource.querySelectorAll('[data-layer="clothes"] > g > [data-part]').forEach(node => {
    if (!["tops", "outer"].includes(node.getAttribute("data-part") || "")) node.remove();
  });
  maskSource.querySelectorAll('[data-layer="backpack-straps"]').forEach(node => node.remove());
  const alpha = await renderPng(maskSource, 512, true);
  const bitmap = await createImageBitmap(alpha), canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0); bitmap.close();
  const pixels = ctx.getImageData(0, 0, 512, 512);
  // Rasterize the actual independent decorations, so diffusion cannot redraw
  // any collar, cuff, ribbon, button, lace, pocket or print in either pose.
  const detailSource=maskSource.cloneNode(true) as SVGSVGElement;
  detailSource.querySelectorAll('[data-art-source]').forEach(garment => {
    for (const node of Array.from(garment.children)) {
      if (node.tagName.toLowerCase() === "defs") continue;
      const layer=node.getAttribute("data-fabric-layer");
      if (!layer || ["body","straps","waistband","lining-back"].includes(layer)) node.remove();
    }
  });
  const detailBitmap=await createImageBitmap(await renderPng(detailSource,512,true));
  ctx.clearRect(0,0,512,512);ctx.drawImage(detailBitmap,0,0);detailBitmap.close();
  const detailAlpha=ctx.getImageData(0,0,512,512).data;
  // Keep the authored collar, ribbon, buttons and central print pixel-for-pixel.
  const protectedHalf = (frame.rig.torso.shoulderHalfW - 4) * frame.unit * frame.sx / 100;
  const feather = frame.unit * frame.sx * .04;
  const world = (p: {x:number;y:number}) => ({x:240+p.x*frame.unit*frame.sx/100,y:frame.origin+p.y*frame.unit*frame.sy/100});
  const arms = Object.values(frame.rig.arms).map(arm=>({root:world(arm.root),mid:world(arm.mid),end:world(arm.end),radius:(arm.rootW+14)*frame.unit*Math.max(frame.sx,frame.sy)/100}));
  const lineDistance = (x:number,y:number,a:{x:number;y:number},b:{x:number;y:number}) => {
    const dx=b.x-a.x,dy=b.y-a.y,ratio=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));
    return Math.hypot(x-a.x-dx*ratio,y-a.y-dy*ratio);
  };
  const originalAlpha = new Uint8ClampedArray(pixels.data);
  const sailor = input.selected.some(item=>item.kind === "sailor");
  const collarBottom = frame.origin+(frame.rig.torso.chestY+22)*frame.unit*frame.sy/100;
  const collarHalf = (frame.rig.torso.shoulderHalfW+12)*frame.unit*frame.sx/100;
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const wx=bounds.x+(x+.5)/512*width,wy=bounds.y+(y+.5)/512*width;
    let weight=Math.max(0,Math.min(1,(Math.abs(wx-240)-protectedHalf)/feather));
    if (sailor && wy < collarBottom && Math.abs(wx-240) < collarHalf) weight=0;
    if (!arms.some(arm=>Math.min(lineDistance(wx,wy,arm.root,arm.mid),lineDistance(wx,wy,arm.mid,arm.end))<arm.radius)) weight=0;
    // Preserve the drawn cuffs and the crisp original outline. Only fabric
    // inside the sleeve is repainted, with a soft blend at the shoulder.
    if (arms.some(arm=>Math.hypot(wx-arm.end.x,wy-arm.end.y)<frame.unit*Math.max(frame.sx,frame.sy)*.12)) weight=0;
    let detail=0;
    for (let dy=-2;dy<=2;dy++) for (let dx=-2;dx<=2;dx++) {
      const sx=x+dx,sy=y+dy;
      if(sx>=0&&sx<512&&sy>=0&&sy<512) detail=Math.max(detail,detailAlpha[(sy*512+sx)*4+3]!);
    }
    weight*=1-detail/255;
    if (x>0 && x<511 && y>0 && y<511) {
      let edge=255;
      for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) edge=Math.min(edge,originalAlpha[((y+dy)*512+x+dx)*4+3]!);
      weight*=edge/255;
    }
    pixels.data[(y*512+x)*4+3]=Math.round(pixels.data[(y*512+x)*4+3]!*weight);
  }
  ctx.putImageData(pixels, 0, 0);
  const mask = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("服の生成範囲を準備できませんでした。")), "image/png"));
  return { reference, mask, bounds };
}
