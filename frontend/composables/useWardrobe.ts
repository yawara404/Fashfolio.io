import { computed, ref } from "vue";
import { defineStore } from "pinia";
import builtInCatalog from "~/data/wardrobe.json";
import { readLocalGarments, writeLocalGarment, deleteLocalGarment } from "~/utils/localWardrobe";
import { localPrompt } from "~/utils/localPrompt";
import { catalogArtworkUrl } from "~/utils/catalogArtwork";
import type {
  Garment,
  Category,
  Catalog,
  Integrations,
  PromptResult,
  SavedOutfit,
} from "~/types/wardrobe";

export const useWardrobe = defineStore("wardrobe", () => {
  const catalog = ref<Catalog>({
    items: [],
    categories: [],
    styles: [],
    palettes: [],
  });
  const activeCategory = ref<Category>("tops");
  const selections = ref<Partial<Record<Category, string>>>({});
  const locks = ref<Category[]>([]);
  const style = ref("girly");
  const palette = ref(["#E8BFCB", "#FAF7EF", "#BECDE0", "#B7ADC8", "#555164"]);
  const paletteId = ref("petal");
  const previewPaletteColors = ref(true);
  const previewImage = (item: Garment) => catalogArtworkUrl(item, palette.value, previewPaletteColors.value);
  const title = ref("春色のガーリーコーデ");
  const notes = ref("");
  const idea = ref("春のお出かけ。甘すぎない、やさしいガーリーコーデ。");
  const query = ref("");
  const styleFilter = ref(false);
  const loading = ref(false);
  const error = ref("");
  const toast = ref("");
  const integrations = ref<Integrations | null>(null);
  const result = ref<PromptResult | null>(null);
  const generating = ref(false);
  const recommending = ref(false);
  const lastRecommendation = ref<{
    reason: string;
    engine: string;
    model: string | null;
    notice: string | null;
  } | null>(null);
  const generatedSignature = ref("");
  const saved = ref<SavedOutfit[]>([]);
  let localLoaded = false;
  const selectedItems = computed(() =>
    catalog.value.categories.flatMap((c) => {
      const item = catalog.value.items.find(
        (i) => i.id === selections.value[c.id],
      );
      return item ? [item] : [];
    }),
  );
  const visibleItems = computed(() =>
    catalog.value.items.filter((item) => {
      if (item.category !== activeCategory.value) return false;
      if (styleFilter.value && !item.styles.includes(style.value)) return false;
      const text = [item.name, item.name_en, item.material, ...item.tags]
        .join(" ")
        .toLowerCase();
      return !query.value || text.includes(query.value.trim().toLowerCase());
    }),
  );
  const request = computed(() => ({
    item_ids: selectedItems.value.map((i) => i.id),
    custom_items: selectedItems.value.filter((i) => i.source === "local-diffusion").map(({ imageUrl, source, baseId, seed, generationPrompt, ...metadata }) => metadata),
    palette: [...palette.value],
    title: title.value,
    notes: notes.value,
    style: style.value,
  }));
  const signature = computed(() => JSON.stringify(request.value));
  const resultIsStale = computed(
    () => !!result.value && generatedSignature.value !== signature.value,
  );
  const activeDefinition = computed(() =>
    catalog.value.categories.find((c) => c.id === activeCategory.value),
  );

  function notify(message: string) {
    toast.value = message;
    setTimeout(() => {
      if (toast.value === message) toast.value = "";
    }, 3200);
  }
  function choose(item: Garment) {
    selections.value = { ...selections.value, [item.category]: item.id };
  }
  function remove(category: Category) {
    if (locks.value.includes(category))
      return notify("ロックを解除すると外せます。");
    const next = { ...selections.value };
    delete next[category];
    selections.value = next;
  }
  function toggleLock(category: Category) {
    locks.value = locks.value.includes(category)
      ? locks.value.filter((c) => c !== category)
      : [...locks.value, category];
  }
  function choosePalette(id: string) {
    const p = catalog.value.palettes.find((p) => p.id === id);
    if (p) {
      palette.value = [...p.colors];
      paletteId.value = id;
    }
  }
  function updateColor(index: number, value: string) {
    if (/^#[0-9a-f]{6}$/i.test(value)) {
      palette.value[index] = value.toUpperCase();
      paletteId.value = "";
    }
  }
  async function refreshIntegrations() {
    try {
      integrations.value = await $fetch<Integrations>("/api/integrations");
    } catch {
      integrations.value = null;
    }
  }
  async function initialize() {
    loading.value = true;
    error.value = "";
    try {
      const local = catalog.value.items.filter((i) => i.source);
      catalog.value = { ...builtInCatalog as Catalog, items: [...builtInCatalog.items as Garment[], ...local] };
      // Select the starter coordinate immediately so the avatar is never
      // shown undressed while IndexedDB is still opening.
      if (!selectedItems.value.length)
        selections.value = {
          tops: "ribbon-blouse",
          outer: "short-blouson",
          bottoms: "pleated-skirt",
          shoes: "mary-janes",
          head: "ribbon-clip",
          bag: "handbag",
          jewelry: "pearl-necklace",
        };
      // Basic dressing and prompts remain usable without Python or an external API.
      loading.value = false;
      await generate(false);
      if (import.meta.client && !localLoaded) {
        try {
          for (const record of await readLocalGarments()) {
            if (!catalog.value.items.some((i) => i.id === record.item.id))
              catalog.value.items.push({ ...record.item, imageUrl: URL.createObjectURL(record.image) });
          }
          localLoaded = true;
        } catch { notify("ブラウザの衣装保存を利用できません。標準の衣装はそのまま使えます。"); }
      }
      if (import.meta.client) {
        try {
          const stored = JSON.parse(
            localStorage.getItem("fashfolio.outfits.v2") || "[]",
          );
          if (Array.isArray(stored))
            saved.value = stored
              .filter(
                (s) =>
                  typeof s?.id === "string" &&
                  typeof s?.name === "string" &&
                  Array.isArray(s?.item_ids) &&
                  Array.isArray(s?.palette),
              )
              .slice(0, 20);
        } catch {}
      }
    } catch {
      error.value =
        "衣装データを読み込めませんでした。ページを再読み込みしてください。";
    } finally {
      loading.value = false;
    }
    refreshIntegrations();
  }
  async function generate(useAI = false) {
    if (!selectedItems.value.length)
      return notify("衣装パーツを1つ以上選んでください。");
    if (generating.value) return;
    generating.value = true;
    const snapshot = signature.value;
    try {
      result.value = useAI ? await $fetch<PromptResult>("/api/prompts", {
        method: "POST",
        body: { ...request.value, use_ai: useAI },
        timeout: 105000,
      }) : localPrompt(selectedItems.value, palette.value, title.value, notes.value, style.value, catalog.value);
      generatedSignature.value = snapshot;
      if (result.value.notice) notify(result.value.notice);
    } catch {
      notify(
        "生成できませんでした。Python APIの接続を確認して再試行してください。",
      );
    } finally {
      generating.value = false;
    }
  }
  async function recommend(useAI: boolean) {
    if (recommending.value) return;
    recommending.value = true;
    const snapshot = signature.value;
    try {
      const response = await $fetch<{
        item_ids: string[];
        reason: string;
        engine: string;
        model: string | null;
        notice: string | null;
      }>("/api/recommend", {
        method: "POST",
        body: {
          ...request.value,
          idea: idea.value,
          locked_ids: selectedItems.value
            .filter((i) => locks.value.includes(i.category))
            .map((i) => i.id),
          use_ai: useAI,
        },
        timeout: 105000,
      });
      if (signature.value !== snapshot)
        return notify(
          "編集中のコーデを残しました。提案をもう一度実行できます。",
        );
      lastRecommendation.value = response;
      selections.value = Object.fromEntries(
        response.item_ids.flatMap((id) => {
          const item = catalog.value.items.find((i) => i.id === id);
          return item ? [[item.category, item.id]] : [];
        }),
      );
      notify(
        response.notice ||
          (response.engine === "ollama" ? "Ollamaからの提案：" : "") +
            response.reason,
      );
    } catch {
      notify("衣装を提案できませんでした。接続を確認して再試行してください。");
    } finally {
      recommending.value = false;
    }
  }
  function save() {
    if (!selectedItems.value.length)
      return notify("衣装パーツを選んでから保存してください。");
    const item: SavedOutfit = {
      id: crypto.randomUUID(),
      name: title.value || "無題のコーデ",
      ...request.value,
      createdAt: new Date().toISOString(),
    };
    saved.value = [item, ...saved.value].slice(0, 20);
    try {
      localStorage.setItem("fashfolio.outfits.v2", JSON.stringify(saved.value));
      notify("このブラウザにコーデを保存しました。");
    } catch {
      notify("保存できませんでした。ブラウザの保存容量を確認してください。");
    }
  }
  function load(outfit: SavedOutfit) {
    selections.value = Object.fromEntries(
      outfit.item_ids.flatMap((id) => {
        const item = catalog.value.items.find((i) => i.id === id);
        return item ? [[item.category, id]] : [];
      }),
    );
    palette.value = outfit.palette
      .filter((c) => /^#[0-9a-f]{6}$/i.test(c))
      .slice(0, 5);
    if (palette.value.length !== 5)
      palette.value = [...catalog.value.palettes[0]!.colors];
    paletteId.value = "";
    style.value = outfit.style;
    notes.value = outfit.notes;
    title.value = outfit.name;
    locks.value = [];
    notify("保存したコーデを読み込みました。");
  }
  function deleteSaved(id: string) {
    saved.value = saved.value.filter((s) => s.id !== id);
    try {
      localStorage.setItem("fashfolio.outfits.v2", JSON.stringify(saved.value));
    } catch {
      notify("保存一覧を更新できませんでした。");
    }
  }
  async function addGenerated(item: Garment, image: Blob) {
    await writeLocalGarment({ item, image });
    const stored = { ...item, imageUrl: URL.createObjectURL(image) };
    catalog.value.items.push(stored);
    activeCategory.value = item.category;
    query.value = ""; styleFilter.value = false;
    choose(stored);
    notify("生成した衣装をこのブラウザの衣装棚に保存しました。");
  }
  async function removeGenerated(id: string) {
    const item = catalog.value.items.find((i) => i.id === id && i.source);
    if (!item) return;
    try {
      await deleteLocalGarment(id);
      catalog.value.items = catalog.value.items.filter((i) => i.id !== id);
      if (selections.value[item.category] === id) {
        const next = { ...selections.value }; delete next[item.category]; selections.value = next;
      }
      if (item.imageUrl) URL.revokeObjectURL(item.imageUrl);
      notify("生成した衣装を衣装棚から削除しました。");
    } catch { notify("衣装を削除できませんでした。ブラウザの保存設定を確認してください。"); }
  }
  return {
    catalog,
    activeCategory,
    selections,
    locks,
    style,
    palette,
    paletteId,
    previewPaletteColors,
    previewImage,
    title,
    notes,
    idea,
    query,
    styleFilter,
    loading,
    error,
    toast,
    integrations,
    result,
    generating,
    recommending,
    lastRecommendation,
    selectedItems,
    visibleItems,
    activeDefinition,
    resultIsStale,
    saved,
    choose,
    remove,
    toggleLock,
    choosePalette,
    updateColor,
    refreshIntegrations,
    initialize,
    generate,
    recommend,
    save,
    load,
    deleteSaved,
    addGenerated,
    removeGenerated,
    notify,
  };
});
