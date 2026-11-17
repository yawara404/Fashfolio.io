import type { StudioPoseId } from "~/types/avatar";

export type Category =
  "inner" | "underwear" | "tops" | "outer" | "bottoms" | "socks" | "shoes" | "head" | "bag" | "jewelry";
export type PresetAudience = "mens" | "womens" | "unisex";
export interface Garment {
  id: string;
  name: string;
  name_en: string;
  category: Category;
  audience?: PresetAudience;
  kind: string;
  description: string;
  material: string;
  material_en: string;
  tags: string[];
  styles: string[];
  colors: string[];
  /** User paint slots; never replace the source colors used to identify SVG fills. */
  paint?: string[];
  source?: "local-diffusion";
  baseId?: string;
  imageUrl?: string;
  seed?: number;
  generationPrompt?: string;
}
export interface CategoryDefinition {
  id: Category;
  name: string;
  en: string;
}
export interface StyleDefinition {
  id: string;
  name: string;
  en: string;
}
export interface Palette {
  id: string;
  name: string;
  colors: string[];
  names: string[];
}
export interface Catalog {
  items: Garment[];
  categories: CategoryDefinition[];
  styles: StyleDefinition[];
  palettes: Palette[];
}
export interface ReferenceLink {
  item_id: string;
  label: string;
  danbooru: string;
  pinterest: string;
}
export interface PromptResult {
  brief_ja: string;
  positive: string;
  negative: string;
  tags: string[];
  references: ReferenceLink[];
  palette: string[];
  engine: "template" | "ollama";
  model: string | null;
  notice: string | null;
}
export interface Integrations {
  ollama: {
    connected: boolean;
    ready: boolean;
    model: string;
    models: string[];
  };
  pinterest: { configured: boolean; scope: string };
  danbooru: { configured: boolean; authenticated: boolean };
  r2?: { configured: boolean; provider: "r2" | "local" };
}
export interface ReferenceImage {
  id: string;
  source: string;
  title: string;
  url: string;
  thumbnail: string | null;
  credit: string;
  tags: string[];
}
export interface ReferenceProvider {
  source: string;
  status: string;
  items: ReferenceImage[];
  message: string | null;
  has_more?: boolean;
  page?: number;
}
export interface SavedOutfit {
  id: string;
  name: string;
  item_ids: string[];
  palette: string[];
  style: string;
  notes: string;
  createdAt: string;
  pose?: StudioPoseId;
  gender?: "girl" | "boy";
  heads?: number;
  garmentColors?: Record<string, string[]>;
  paletteColors?: boolean;
  locks?: Category[];
}
