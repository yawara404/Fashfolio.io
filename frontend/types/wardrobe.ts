export type Category =
  "tops" | "outer" | "bottoms" | "shoes" | "head" | "bag" | "jewelry";
export interface Garment {
  id: string;
  name: string;
  name_en: string;
  category: Category;
  kind: string;
  description: string;
  material: string;
  material_en: string;
  tags: string[];
  styles: string[];
  colors: string[];
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
}
