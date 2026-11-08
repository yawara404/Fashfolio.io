import type { Garment, Catalog, PromptResult } from "~/types/wardrobe";
export function localPrompt(items: Garment[], palette: string[], title: string, notes: string, style: string, catalog: Catalog): PromptResult {
  const definition = catalog.styles.find((s) => s.id === style);
  const namedColors = catalog.palettes.flatMap((p) => p.colors.map((hex, i) => ({ hex, name: p.names[i]! })));
  const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const names = palette.map((hex) => {
    const a = rgb(hex);
    return [...namedColors].sort((c, d) => {
      const distance = (h: string) => rgb(h).reduce((s, n, i) => s + (n - a[i]!) ** 2, 0);
      return distance(c.hex) - distance(d.hex);
    })[0]?.name || hex;
  });
  const tags = [...new Set(items.flatMap((i) => i.tags))];
  return {
    brief_ja: [title + "｜" + (definition?.name || style) + "の衣装設定", ...items.map((i) => `・${i.name}（${i.material}）：${i.description}`), "配色：" + palette.join(" / "), ...(notes.trim() ? ["作画メモ：" + notes.trim()] : [])].join("\n"),
    positive: [(definition?.en || style) + " fashion", "full body outfit reference", ...items.map((i) => `${i.name_en}, ${i.material_en} texture`), ...tags.map((t) => t.replaceAll("_", " ")), "color palette: " + names.join(", "), "clear garment construction"].join(", "),
    negative: "blurry clothing details, inconsistent garment construction, missing accessories, distorted buttons, text, watermark",
    references: items.map((i) => ({ item_id: i.id, label: i.name, danbooru: "https://danbooru.donmai.us/posts?" + new URLSearchParams({ tags: `${i.tags[0] || "clothes"} rating:g` }), pinterest: "https://www.pinterest.com/search/pins/?" + new URLSearchParams({ q: i.name_en + " outfit reference" }) })),
    tags, palette: [...palette], engine: "template", model: null, notice: null,
  };
}
