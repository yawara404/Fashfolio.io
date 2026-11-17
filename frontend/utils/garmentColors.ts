import type { Garment, Category } from "~/types/wardrobe";

const slots: Record<Category, number> = { inner: 1, underwear: 1, socks: 1, tops: 0, outer: 1, bottoms: 2, shoes: 4, head: 3, bag: 0, jewelry: 3 };
export const isHexColor = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

/** Paint authored fills only: ink, texture, opacity and rigid detail geometry stay intact. */
export function garmentPaint(item: Garment, palette: string[], recolor = true): string[] {
  if (!canPaintGarment(item)) return [...item.colors];
  const defaults = recolor ? [
    item.category === "socks" || item.kind === "tights" ? item.colors[0] : palette[slots[item.category]] || item.colors[0],
    palette[item.id === "mens-shirt" ? 0 : 1] || item.colors[1],
    palette[3] || item.colors[2],
  ] : item.colors;
  return item.colors.map((color, index) => isHexColor(item.paint?.[index]) ? item.paint![index]!.toUpperCase() : defaults[index] || color);
}

export function canPaintGarment(item: Garment) {
  // The approved base inner is part of the raster drawing, not a separate SVG.
  return !item.imageUrl && !["cotton-camisole", "cotton-tank"].includes(item.id) && (item.category !== "underwear" || item.kind === "tights");
}

export function sanitizeGarmentColors(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).slice(0, 200).flatMap(([id, colors]) =>
    Array.isArray(colors) && colors.length === 3 && colors.every(isHexColor)
      ? [[id, colors.map(color => color.toUpperCase())]] : []));
}
