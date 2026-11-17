import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import { useWardrobe } from "../composables/useWardrobe";
import { useAvatar } from "../composables/useAvatar";
import { catalogArtworkSvg, catalogArtworkUrl } from "../utils/catalogArtwork";
import { canPaintGarment, sanitizeGarmentColors } from "../utils/garmentColors";
import { poseRenderKey } from "../utils/poseReference";
import catalog from "../data/wardrobe.json";
import type { Garment } from "../types/wardrobe";
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); setActivePinia(createPinia());
  vi.stubGlobal("$fetch", vi.fn().mockRejectedValue(new Error("offline")));
});
afterEach(() => { useWardrobe().$dispose(); useAvatar().$dispose(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const garment = (id: string) => catalog.items.find(item => item.id === id)! as Garment;
const setup = async () => { const store = useWardrobe(); await store.initialize(); return store; };

describe("coordinate editing and recovery", () => {
  it("paints a single garment without changing ink, geometry or the other clothes", async () => {
    const store = await setup(), top = garment("sailor-top"), skirt = garment("pleated-skirt");
    const before = store.previewImage(top), other = store.previewImage(skirt);
    store.updateGarmentColor(top, 0, "#325577");
    expect(store.previewImage(top)).not.toBe(before);
    expect(store.previewImage(skirt)).toBe(other);
    const painted = { ...top, paint: store.garmentColors[top.id] };
    const svg = catalogArtworkSvg(painted, store.palette, true);
    expect(svg).toContain("#325577");
    const stripColors = (svg: string) => svg.replace(/#[0-9a-f]{6}/gi, "#COLOR");
    expect(stripColors(svg)).toBe(stripColors(catalogArtworkSvg(top, store.palette, true)));
    store.previewPaletteColors = false;
    expect(decodeURIComponent(store.previewImage(top))).toContain("#325577");
    store.resetGarmentColor(top.id); store.previewPaletteColors = true;
    expect(store.previewImage(top)).toBe(before);
    expect(canPaintGarment(garment("cotton-camisole"))).toBe(false);
    expect(sanitizeGarmentColors({ x: ["bad", null, 3] })).toEqual({});
  });
  it("restores the character, head count, pose and individual colors together", async () => {
    const store = await setup(), avatar = useAvatar();
    avatar.setGender("boy"); avatar.setPose("t-pose"); store.heads = 7;
    store.updateGarmentColor(garment("mens-blazer"), 0, "#325577"); store.save();
    const saved = store.saved[0]!;
    avatar.setGender("girl"); store.heads = 5; avatar.setPose("relax"); store.garmentColors = {};
    store.load(saved);
    expect(avatar.config.gender).toBe("boy"); expect(avatar.pose.id).toBe("t-pose"); expect(store.heads).toBe(7);
    expect(store.selections.outer).toBe("mens-blazer");
    expect(store.selectedItems.find(item => item.id === "mens-blazer")?.paint?.[0]).toBe("#325577");
    expect(JSON.parse(localStorage.getItem("fashfolio.outfits.v2")!)[0].gender).toBe("boy");
  });
  it("keeps changes recoverable with undo, redo, branching and a reload draft", async () => {
    const store = await setup();
    store.choose(garment("sailor-top")); await nextTick();
    store.updateGarmentColor(garment("sailor-top"), 0, "#325577"); await nextTick();
    await store.undo(); expect(store.garmentColors).toEqual({}); expect(store.selections.tops).toBe("sailor-top");
    await store.undo(); expect(store.selections.tops).toBe("ribbon-blouse");
    await store.redo(); expect(store.selections.tops).toBe("sailor-top");
    store.heads = 6; await nextTick(); expect(store.canRedo).toBe(false);
    await vi.advanceTimersByTimeAsync(300);
    const draft = JSON.parse(localStorage.getItem("fashfolio.draft.v1")!);
    expect(draft.heads).toBe(6); expect(draft.item_ids).toContain("sailor-top");
    store.$dispose(); setActivePinia(createPinia());
    const restored = await setup(); expect(restored.heads).toBe(6); expect(restored.selections.tops).toBe("sailor-top");
  });
  it("survives malformed drafts and does not pretend a failed save succeeded", async () => {
    localStorage.setItem("fashfolio.draft.v1", '{"item_ids":["missing"],"palette":[null],"heads":200,"garmentColors":{"bad":["oops"]}}');
    const store = await setup(); expect(store.heads).toBe(5); expect(store.palette).toHaveLength(5); expect(store.garmentColors).toEqual({});
    store.choose(garment("sailor-top"));
    vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("quota"); });
    store.save(); expect(store.saved).toHaveLength(0); expect(store.toast).toContain("保存できません");
  });
  it("honors locks during manual selection and offline audience-aware recommendations", async () => {
    const store = await setup(), avatar = useAvatar(); avatar.setGender("boy");
    store.toggleLock("outer"); store.choose(garment("trench")); expect(store.selections.outer).toBe("mens-blazer");
    await store.recommend(false);
    expect(store.selections.outer).toBe("mens-blazer");
    expect(store.selectedItems.every(item => item.audience !== "womens")).toBe(true);
    expect(vi.mocked($fetch).mock.calls.at(-1)?.[1]).toMatchObject({body: {audience:"mens"}});
  });
  it("invalidates the AI reference cache when only garment paint changes", () => {
    const input = {heads:5,gender:"girl" as const,pose:"relax",selected:[garment("sailor-top")],palette:[],paletteColors:false};
    const key = poseRenderKey(input);
    expect(poseRenderKey({...input,selected:[{...input.selected[0]!,paint:["#325577","#FFFFFF","#666666"]}]})).not.toBe(key);
  });
});
