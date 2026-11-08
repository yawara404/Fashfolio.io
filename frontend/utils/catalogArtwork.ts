import sources from "~/data/garmentArtwork.json";
import type { Category, Garment } from "~/types/wardrobe";

const index: Record<Category, number> = { tops: 0, outer: 1, bottoms: 2, shoes: 4, head: 3, bag: 0, jewelry: 3 };
const cache = new Map<string, string>();

/** The same authored illustration and paint slots are used in cards and on the body. */
export function catalogArtworkSvg(item: Garment, palette: string[], recolor: boolean) {
  const source = (sources as Record<string, string>)[item.id];
  if (!source) return "";
  if (!recolor) return source;
  const paints: Record<string, string> = {
    [item.colors[0]!.toUpperCase()]: palette[index[item.category]] || item.colors[0]!,
    [item.colors[1]!.toUpperCase()]: palette[1] || item.colors[1]!,
    [item.colors[2]!.toUpperCase()]: palette[3] || item.colors[2]!,
  };
  return source.replace(/#[0-9a-f]{6}/gi, (color) => paints[color.toUpperCase()] || color);
}

export function catalogArtworkUrl(item: Garment, palette: string[], recolor = true) {
  if (item.imageUrl) return item.imageUrl;
  const key = JSON.stringify([item.id, recolor ? palette : []]);
  const cached = cache.get(key);
  if (cached) return cached;
  const svg = catalogArtworkSvg(item, palette, recolor);
  if (!svg) return `/garments/${item.id}.svg`;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  if (cache.size > 250) cache.clear();
  cache.set(key, url);
  return url;
}
