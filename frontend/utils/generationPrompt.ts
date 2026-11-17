import { translateJaToEnPrompt } from "./jaEnPrompt";

/**
 * Helpers for the on-device clothing generator.
 *
 * SD-Turbo has a 77-token CLIP window and does not accept a negative prompt,
 * so the "no people" instruction is kept as a short, fixed suffix that is
 * always included in the prompt. Keeping it near the start of the suffix
 * (rather than after a long free-form description) makes it survive the
 * token limit.
 */
export const HUMAN_FREE_GUARD =
  "clothing only, no humans, no person, no face, no hands, no body, plain white background, no scenery, flat lay";

export interface ArtStylePreset {
  id: string;
  name: string;
  hint: string;
  tokens: string;
}

/**
 * Drawing styles that keep generated garments close to the existing SVG
 * wardrobe presets. "auto" reads the coordinate name for a style keyword and
 * otherwise falls back to the simple default look.
 */
export const ART_STYLE_PRESETS: ArtStylePreset[] = [
  {
    id: "simple",
    name: "シンプル絵柄",
    hint: "線と面を絞った、すっきりした既定スタイル",
    tokens:
      "simple illustration, clean lineart, flat colors, minimal shading",
  },
  {
    id: "preset",
    name: "プリセット絵柄",
    hint: "衣装棚の図案に近い、くっきりセル画",
    tokens:
      "flat clothing asset, soft cel shading, crisp clean outline, flat pastel colors",
  },
  {
    id: "watercolor",
    name: "やわらか水彩",
    hint: "淡いにじみと手描きの質感",
    tokens:
      "soft watercolor illustration, gentle color washes, hand-painted paper texture",
  },
  {
    id: "anime",
    name: "アニメ塗り",
    hint: "鮮やかな色と強い線",
    tokens: "anime cel shading, bold lineart, vivid flat colors",
  },
  {
    id: "retro",
    name: "レトロ少女漫画",
    hint: "繊細な線とスクリーントーン",
    tokens: "retro shoujo manga illustration, screentone shading, delicate ink lines",
  },
  {
    id: "flat",
    name: "フラットデザイン",
    hint: "図形でまとめるミニマルな絵柄",
    tokens: "modern flat illustration, geometric shapes, minimal shading",
  },
];

export const DEFAULT_ART_STYLE = "simple";

export interface PromptSuggestion {
  label: string;
  token: string;
  recommended?: boolean;
}

export interface PromptSuggestionGroup {
  id: string;
  label: string;
  hint: string;
  items: PromptSuggestion[];
}

/** Click-to-add English prompt vocabulary for people who do not write English. */
export const PROMPT_SUGGESTIONS: PromptSuggestionGroup[] = [
  {
    id: "art",
    label: "絵柄",
    hint: "シンプルがおすすめ",
    items: [
      {
        label: "シンプル",
        token: "simple illustration, clean lineart, flat colors, minimal shading",
        recommended: true,
      },
      {
        label: "線画",
        token: "clean monochrome lineart, white background",
      },
      {
        label: "水彩",
        token: "soft watercolor illustration, gentle color washes",
      },
      {
        label: "アニメ塗り",
        token: "anime cel shading, bold lineart, vivid flat colors",
      },
      {
        label: "レトロ",
        token: "retro shoujo manga, screentone shading, delicate ink lines",
      },
      {
        label: "フラット",
        token: "modern flat illustration, geometric shapes, minimal shading",
      },
    ],
  },
  {
    id: "silhouette",
    label: "形",
    hint: "シルエット・丈",
    items: [
      { label: "パフスリーブ", token: "puff sleeves" },
      { label: "長袖", token: "long sleeves" },
      { label: "ノースリーブ", token: "sleeveless" },
      { label: "Aライン", token: "A-line silhouette" },
      { label: "プリーツ", token: "pleated skirt" },
      { label: "ワイドパンツ", token: "wide-leg pants" },
      { label: "ショート丈", token: "cropped length" },
      { label: "オーバーサイズ", token: "oversized fit" },
      { label: "ハイウエスト", token: "high waist" },
    ],
  },
  {
    id: "material",
    label: "素材",
    hint: "布の質感",
    items: [
      { label: "コットン", token: "soft cotton" },
      { label: "リネン", token: "linen" },
      { label: "サテン", token: "satin" },
      { label: "レース", token: "lace" },
      { label: "チュール", token: "tulle" },
      { label: "デニム", token: "denim" },
      { label: "コーデュロイ", token: "corduroy" },
      { label: "リブニット", token: "ribbed knit" },
      { label: "ツイード", token: "tweed" },
      { label: "シフォン", token: "sheer chiffon" },
    ],
  },
  {
    id: "detail",
    label: "ディテール",
    hint: "飾り・金具",
    items: [
      { label: "リボン", token: "ribbon tie" },
      { label: "フリル", token: "frills" },
      { label: "レース飾り", token: "lace trim" },
      { label: "刺しゅう", token: "embroidery" },
      { label: "ポケット", token: "patch pockets" },
      { label: "金ボタン", token: "gold buttons" },
      { label: "パールボタン", token: "pearl buttons" },
      { label: "ベルト", token: "belted waist" },
      { label: "プリント柄", token: "graphic print" },
    ],
  },
  {
    id: "color",
    label: "色",
    hint: "配色のヒント",
    items: [
      { label: "パステルピンク", token: "pastel pink" },
      { label: "アイボリー", token: "ivory" },
      { label: "セージグリーン", token: "sage green" },
      { label: "ネイビー", token: "navy" },
      { label: "バーガンディ", token: "burgundy" },
      { label: "スカイブルー", token: "sky blue" },
      { label: "ラベンダー", token: "lavender" },
      { label: "チャコール", token: "charcoal" },
      { label: "モノトーン", token: "monochrome palette" },
    ],
  },
  {
    id: "mood",
    label: "雰囲気",
    hint: "コーデ名に入れてもOK",
    items: [
      { label: "ガーリー", token: "girly" },
      { label: "カジュアル", token: "casual" },
      { label: "クラシック", token: "classic" },
      { label: "ストリート", token: "street" },
      { label: "ファンタジー", token: "fantasy" },
      { label: "春", token: "spring" },
      { label: "夏", token: "summer" },
      { label: "秋", token: "autumn" },
      { label: "冬", token: "winter" },
      { label: "カフェ", token: "cafe" },
      { label: "海", token: "marine" },
      { label: "お花", token: "floral print" },
    ],
  },
];

const NAME_KEYWORD_TOKENS: Array<[RegExp, string]> = [
  [/春|spring|さくら|桜|sakura/i, "spring"],
  [/夏|summer|海|marine|beach/i, "summer marine"],
  [/秋|autumn|fall|紅葉/i, "autumn"],
  [/冬|winter|雪|snow/i, "winter"],
  [/カフェ|cafe|喫茶|tea time/i, "cafe"],
  [/ガーリー|girly|少女|リボン|ribbon|bow/i, "girly"],
  [/カジュアル|casual|デイリー|daily/i, "casual"],
  [/クラシック|classic|レトロ|retro|昭和/i, "classic"],
  [/ストリート|street|スポーツ|sporty|スポーティ/i, "street"],
  [/ファンタジー|fantasy|魔法|magic|星|starry/i, "fantasy"],
  [/森|forest|自然|nature|ボタニカル|botanical/i, "botanical"],
  [/夜|night|ナイト|midnight/i, "night"],
  [/モノトーン|monotone|白黒|black and white/i, "monochrome palette"],
  [/パステル|pastel/i, "pastel colors"],
  [/リボン|ribbon|bow/i, "ribbon accents"],
  [/レース|lace/i, "lace trim"],
  [/フリル|frill|ruffle/i, "frills"],
  [/花|floral|フラワー|flower/i, "floral print"],
  [/チェック|plaid|gingham|格子/i, "check pattern"],
  [/ニット|knit|編み/i, "knit texture"],
];

const ART_STYLE_BY_NAME: Array<[RegExp, string]> = [
  [/水彩|watercolor|にじみ/i, "watercolor"],
  [/レトロ|retro|昭和|少女漫画|shoujo/i, "retro"],
  [/アニメ|anime|セル画|cel/i, "anime"],
  [/シンプル|simple|線画|lineart/i, "simple"],
  [/フラット|flat|ミニマル|minimal/i, "flat"],
];

/** Read Japanese or English mood words from a coordinate name. */
export function derivePresetTokens(name: string, limit = 6): string {
  const tokens: string[] = [];
  for (const [pattern, token] of NAME_KEYWORD_TOKENS) {
    if (pattern.test(name) && !tokens.includes(token)) tokens.push(token);
    if (tokens.length >= limit) break;
  }
  return tokens.join(", ");
}

export function resolveArtStyleId(selected: string, name = ""): string {
  if (selected !== "auto") return selected;
  for (const [pattern, id] of ART_STYLE_BY_NAME) {
    if (pattern.test(name)) return id;
  }
  return DEFAULT_ART_STYLE;
}

export function artStyleTokens(selected: string, name = ""): string {
  const id = resolveArtStyleId(selected, name);
  return (
    ART_STYLE_PRESETS.find((preset) => preset.id === id)?.tokens ||
    ART_STYLE_PRESETS.find((preset) => preset.id === DEFAULT_ART_STYLE)!.tokens
  );
}

export function artStyleHint(selected: string, name = ""): string {
  const id = resolveArtStyleId(selected, name);
  return ART_STYLE_PRESETS.find((preset) => preset.id === id)?.hint || "";
}

/** Translate a Japanese coordinate name/notes into English prompt tags. */
export function translateCoordinatePrompt(...parts: Array<string | undefined>): string {
  return translateJaToEnPrompt(parts.filter(Boolean).join(" ")).text;
}

function uniqueTokens(parts: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    for (const token of part.split(",")) {
      const value = token.trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(value);
    }
  }
  return result;
}

/** Merge comma-separated prompt parts while removing exact duplicates. */
export function mergePromptTokens(...parts: Array<string | undefined>): string {
  return uniqueTokens(parts).join(", ");
}

/** Keep complete comma-separated tags inside a character budget. */
export function limitPromptTokens(value: string, maxChars: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxChars) return trimmed;
  const parts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  const kept: string[] = [];
  let length = 0;
  for (const part of parts) {
    const addition = kept.length ? part.length + 2 : part.length;
    if (length + addition > maxChars) break;
    kept.push(part);
    length += addition;
  }
  return kept.length ? kept.join(", ") : trimmed.slice(0, maxChars).trim();
}

/**
 * Build the clothing prompt. The description stays first so it is preserved
 * by CLIP, and the human-free guard follows it before the style tuning.
 */
export function composeClothingPrompt(options: {
  description: string;
  name?: string;
  paletteColor?: string;
  artStyle?: string;
}): string {
  const description = options.description.trim();
  const subject = [options.name || "", description].join(" ");
  const preset = derivePresetTokens(subject);
  const translated = translateCoordinatePrompt(subject);
  return uniqueTokens([
    description,
    translated,
    preset,
    artStyleTokens(options.artStyle || "auto", subject),
    "single garment, front view",
    options.paletteColor,
    HUMAN_FREE_GUARD,
  ]).join(", ");
}

/** Append a suggestion chip without creating duplicates. */
export function appendPromptToken(current: string, token: string): string {
  const words = current
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const additions = token
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !words.includes(part.toLowerCase()));
  if (!additions.length) return current.trim();
  const trimmed = current.trim().replace(/,\s*$/, "");
  return trimmed ? `${trimmed}, ${additions.join(", ")}` : additions.join(", ");
}
