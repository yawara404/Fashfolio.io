import sources from "~/data/garmentArtwork.json";
import type { Garment } from "~/types/wardrobe";
import { garmentArtworkLayer, type GarmentArtworkLayer } from "~/utils/garmentLayers";
import { garmentPaint } from "~/utils/garmentColors";

const cache = new Map<string, string>();

export function catalogArtworkLayers(item: Garment): GarmentArtworkLayer[] {
  if (item.imageUrl) return [];
  const source = (sources as Record<string,string>)[item.id] || "";
  return [...new Set([...source.matchAll(/data-garment-layer="([^"]+)"/g)].map(match=>match[1] as GarmentArtworkLayer))];
}

export function catalogArtworkAnchor(item: Garment, layer: GarmentArtworkLayer) {
  const source=(sources as Record<string,string>)[item.id] || "";
  const match=source.match(new RegExp(`<g\\b[^>]*data-garment-layer="${layer}"[^>]*data-anchor="([^"]+)"`));
  if (!match) return;
  const [x,y]=match[1]!.split(" ").map(Number);
  return {x:x!,y:y!};
}

/** The same authored illustration and paint slots are used in cards and on the body. */
export function catalogArtworkSvg(item: Garment, palette: string[], recolor: boolean, layer?: GarmentArtworkLayer) {
  const source = (sources as Record<string, string>)[item.id];
  if (!source) return "";
  let svg = source;
  if (!recolor && !item.paint) return layer ? garmentArtworkLayer(svg,layer) : svg;
  const colors = garmentPaint(item, palette, recolor);
  const paints: Record<string, string> = {
    [item.colors[0]!.toUpperCase()]: colors[0]!,
    [item.colors[1]!.toUpperCase()]: colors[1]!,
    [item.colors[2]!.toUpperCase()]: colors[2]!,
  };
  if (item.kind === "sailor") paints["#D4E2EC"] = colors[1] || "#D4E2EC";
  svg = source.replace(/#[0-9a-f]{6}/gi, (color) => paints[color.toUpperCase()] || color);
  return layer ? garmentArtworkLayer(svg,layer) : svg;
}

export function catalogArtworkUrl(item: Garment, palette: string[], recolor = true, layer?: GarmentArtworkLayer) {
  if (item.imageUrl) return item.imageUrl;
  const key = JSON.stringify([item.id, recolor ? palette : [],item.paint,layer]);
  const cached = cache.get(key);
  if (cached) return cached;
  const svg = catalogArtworkSvg(item, palette, recolor,layer);
  if (!svg) return `/garments/${item.id}.svg`;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  if (cache.size > 250) cache.clear();
  cache.set(key, url);
  return url;
}
