import { computed, nextTick, onScopeDispose, ref, watch } from "vue";
import { defineStore } from "pinia";
import builtInCatalog from "~/data/wardrobe.json";
import { readLocalGarments, writeLocalGarment, deleteLocalGarment } from "~/utils/localWardrobe";
import { localPrompt } from "~/utils/localPrompt";
import { catalogArtworkUrl } from "~/utils/catalogArtwork";
import { useAvatar } from "~/composables/useAvatar";
import { resolveStudioPose } from "~/data/studioPoses";
import { garmentPaint, isHexColor, canPaintGarment, sanitizeGarmentColors } from "~/utils/garmentColors";
import { hydrateCloudWorkspace, scheduleCloudSync } from "~/utils/cloudStorage";
import type {
  Garment,
  Category,
  Catalog,
  Integrations,
  PromptResult,
  SavedOutfit,
  PresetAudience,
} from "~/types/wardrobe";

const defaultPalette = builtInCatalog.palettes.find(p => p.id === "gray")!;

export const useWardrobe = defineStore("wardrobe", () => {
  const catalog = ref<Catalog>({
    items: [],
    categories: [],
    styles: [],
    palettes: [],
  });
  const activeCategory = ref<Category>("tops");
  const presetAudience = ref<PresetAudience>("womens");
  const selections = ref<Partial<Record<Category, string>>>({});
  const locks = ref<Category[]>([]);
  const style = ref("girly");
  const palette = ref([...defaultPalette.colors]);
  const paletteId = ref(defaultPalette.id);
  const previewPaletteColors = ref(true);
  const garmentColors = ref<Record<string, string[]>>({});
  const heads = ref(5);
  const paintedItem = (item: Garment): Garment => garmentColors.value[item.id] ? { ...item, paint: garmentColors.value[item.id] } : item;
  const previewImage = (item: Garment) => catalogArtworkUrl(paintedItem(item), palette.value, previewPaletteColors.value);
  const paintOf = (item: Garment) => garmentPaint(paintedItem(item), palette.value, previewPaletteColors.value);
  const title = ref("グレーのガーリーコーデ");
  const notes = ref("");
  const idea = ref("グレーを基調にした、やさしいガーリーコーデ。");
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
      return item ? [paintedItem(item)] : [];
    }),
  );
  const visibleItems = computed(() =>
    catalog.value.items.filter((item) => {
      if (item.category !== activeCategory.value && !(activeCategory.value === "socks" && item.kind === "tights")) return false;
      if (!matchesAudience(item)) return false;
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
    garment_colors: Object.fromEntries(selectedItems.value.map(item => [item.id, paintOf(item)])),
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
  function matchesAudience(item: Garment) {
    const audience=item.audience || "unisex";
    return !!item.source || audience === "unisex" || audience === presetAudience.value;
  }
  function applyDefault(gender: "girl" | "boy") {
    selections.value = gender === "boy" ? {
      underwear: "cotton-inner-shorts", socks: "ankle-socks", inner: "cotton-tank", tops: "mens-shirt", outer: "mens-blazer", bottoms: "straight-slacks", shoes: "loafers",
    } : {
      underwear: "cotton-inner-shorts", socks: "ankle-socks", inner: "cotton-camisole", tops: "ribbon-blouse", bottoms: "pleated-skirt", shoes: "mary-janes", head: "ribbon-clip",
    };
    locks.value=[];
    presetAudience.value=gender === "boy" ? "mens" : "womens";
    style.value=gender === "boy" ? "classic" : "girly";
    if (paletteId.value === "gray") palette.value=gender === "boy" ? ["#F1F0ED","#5C616A","#70747E","#92909C","#4D4C57"] : [...defaultPalette.colors];
    if (["グレーのガーリーコーデ","グレーのブレザーコーデ"].includes(title.value))
      title.value=gender === "boy" ? "グレーのブレザーコーデ" : "グレーのガーリーコーデ";
  }
  const avatar=useAvatar();
  const snapshot = computed(() => JSON.stringify({
    item_ids: selectedItems.value.map(item => item.id), palette: palette.value, style: style.value,
    name: title.value, notes: notes.value, gender: avatar.config.gender || "girl", pose: avatar.pose.id,
    heads: heads.value, garmentColors: garmentColors.value, paletteColors: previewPaletteColors.value,
    locks: locks.value,
  }));
  const history = ref<string[]>([]);
  const historyIndex = ref(-1);
  const draftStatus = ref("");
  let ready = false, restoring = false;
  let draftTimer: ReturnType<typeof setTimeout> | undefined;
  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(() => historyIndex.value < history.value.length - 1);
  function persistDraft() {
    try { localStorage.setItem("fashfolio.draft.v1", snapshot.value); draftStatus.value = "このブラウザに自動保存済み"; scheduleCloudSync(); }
    catch { draftStatus.value = "自動保存できません。ブラウザの保存設定を確認してください。"; }
  }
  watch(snapshot, value => {
    if (!ready || restoring) return;
    if (history.value[historyIndex.value] !== value) {
      history.value = [...history.value.slice(0, historyIndex.value + 1), value].slice(-60);
      historyIndex.value = history.value.length - 1;
    }
    draftStatus.value = "保存中…";
    clearTimeout(draftTimer);
    draftTimer = setTimeout(persistDraft, 250);
  });
  async function travelHistory(delta: number) {
    const index = historyIndex.value + delta;
    if (index < 0 || index >= history.value.length) return;
    restoring = true;
    restore(JSON.parse(history.value[index]!));
    historyIndex.value = index;
    await nextTick(); restoring = false;
    persistDraft();
  }
  const undo = () => travelHistory(-1);
  const redo = () => travelHistory(1);
  onScopeDispose(() => {
    clearTimeout(draftTimer);
    if (typeof window !== "undefined") window.removeEventListener("pagehide", persistDraft);
  });
  watch(() => avatar.config.gender, gender => {
    if (catalog.value.items.length) applyDefault(gender || "girl");
  }, {flush:"sync"});
  function choose(item: Garment) {
    if (locks.value.includes(item.category)) return notify("ロックを解除すると変更できます。");
    selections.value = { ...selections.value, [item.category]: item.id };
  }
  function updateGarmentColor(item: Garment, index: number, color: string) {
    if (!canPaintGarment(item) || !isHexColor(color) || index < 0 || index > 2) return;
    const colors = [...paintOf(item)]; colors[index] = color.toUpperCase();
    garmentColors.value = { ...garmentColors.value, [item.id]: colors };
  }
  function resetGarmentColor(id: string) {
    const next = { ...garmentColors.value }; delete next[id]; garmentColors.value = next;
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
    let allowDraftRestore = true;
    try {
      const local = catalog.value.items.filter((i) => i.source);
      catalog.value = { ...builtInCatalog as Catalog, items: [...builtInCatalog.items as Garment[], ...local] };
      // Select the starter coordinate immediately so the avatar is never
      // shown undressed while IndexedDB is still opening.
      if (!selectedItems.value.length) applyDefault(avatar.config.gender || "girl");
      // Basic dressing and prompts remain usable without Python or an external API.
      loading.value = false;
      await generate(false);
      if (import.meta.client && !localLoaded) {
        const beforeCloud = snapshot.value;
        const restored = await hydrateCloudWorkspace();
        allowDraftRestore = snapshot.value === beforeCloud;
        try {
          for (const record of [...await readLocalGarments(),...restored]) {
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
      if (!ready) {
        try {
          const draft = JSON.parse(localStorage.getItem("fashfolio.draft.v1") || "null");
          if (allowDraftRestore && draft && Array.isArray(draft.item_ids)) restore(draft);
        } catch { /* A damaged or unavailable draft never prevents dressing. */ }
        await nextTick();
        history.value = [snapshot.value]; historyIndex.value = 0; ready = true;
        if (typeof window !== "undefined") window.addEventListener("pagehide", persistDraft);
        draftStatus.value = "変更はこのブラウザに自動保存";
        await generate(false);
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
          audience: presetAudience.value,
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
      if (signature.value !== snapshot) return notify("編集中のコーデを残しました。");
      const next = { ...selections.value };
      for (const category of catalog.value.categories) {
        if (locks.value.includes(category.id)) continue;
        const compatible = catalog.value.items.filter(item => item.category === category.id && matchesAudience(item));
        const styled = compatible.filter(item => item.styles.includes(style.value));
        const pool = styled.length ? styled : compatible;
        if (pool.length) next[category.id] = pool[Math.floor(Math.random() * pool.length)]!.id;
        else delete next[category.id];
      }
      selections.value = next;
      notify("端末内の衣装から組み合わせました。ロックした服はそのままです。");
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
      pose: useAvatar().pose.id,
      gender: avatar.config.gender || "girl",
      heads: heads.value,
      garmentColors: JSON.parse(JSON.stringify(garmentColors.value)),
      paletteColors: previewPaletteColors.value,
      createdAt: new Date().toISOString(),
    };
    const next = [item, ...saved.value].slice(0, 20);
    try {
      localStorage.setItem("fashfolio.outfits.v2", JSON.stringify(next));
      saved.value = next;
      scheduleCloudSync();
      notify("このブラウザにコーデを保存しました。");
    } catch {
      notify("保存できませんでした。ブラウザの保存容量を確認してください。");
    }
  }
  function load(outfit: SavedOutfit) {
    restore(outfit);
    notify("保存したコーデを読み込みました。");
  }
  function restore(outfit: Partial<SavedOutfit>) {
    if (outfit.gender === "boy" || outfit.gender === "girl") avatar.setGender(outfit.gender);
    avatar.setPose(resolveStudioPose(outfit.pose).id);
    if ([5,6,7].includes(outfit.heads!)) heads.value = outfit.heads!;
    selections.value = Object.fromEntries(
      (outfit.item_ids || []).flatMap((id) => {
        const item = catalog.value.items.find((i) => i.id === id);
        return item ? [[item.category, id]] : [];
      }),
    );
    palette.value = (Array.isArray(outfit.palette) ? outfit.palette : [])
      .filter(isHexColor)
      .slice(0, 5);
    if (palette.value.length !== 5)
      palette.value = [...defaultPalette.colors];
    paletteId.value = catalog.value.palettes.find(p => JSON.stringify(p.colors) === JSON.stringify(palette.value))?.id || "";
    style.value = typeof outfit.style === "string" ? outfit.style.slice(0,40) : "girly";
    notes.value = typeof outfit.notes === "string" ? outfit.notes.slice(0,1000) : "";
    title.value = typeof outfit.name === "string" ? outfit.name.slice(0,100) : "無題のコーデ";
    garmentColors.value = sanitizeGarmentColors(outfit.garmentColors);
    previewPaletteColors.value = outfit.paletteColors !== false;
    presetAudience.value = avatar.config.gender === "boy" ? "mens" : "womens";
    locks.value = Array.isArray(outfit.locks) ? outfit.locks.filter(category => catalog.value.categories.some(entry => entry.id === category)) : [];
  }
  function deleteSaved(id: string) {
    const next = saved.value.filter((s) => s.id !== id);
    try {
      localStorage.setItem("fashfolio.outfits.v2", JSON.stringify(next));
      saved.value = next;
      scheduleCloudSync();
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
    presetAudience,
    matchesAudience,
    selections,
    locks,
    style,
    palette,
    paletteId,
    previewPaletteColors,
    previewImage,
    paintOf,
    garmentColors,
    heads,
    updateGarmentColor,
    resetGarmentColor,
    draftStatus,
    canUndo,
    canRedo,
    undo,
    redo,
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
