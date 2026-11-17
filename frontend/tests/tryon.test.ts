import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, enableAutoUnmount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, ref, type Ref } from "vue";
import MannequinPreview from "../components/MannequinPreview.vue";
import TryOnStudio from "../components/TryOnStudio.vue";
import { useWardrobe } from "../composables/useWardrobe";
import { useAvatar } from "../composables/useAvatar";
import type { Garment } from "../types/wardrobe";
import { characterArtwork } from "../data/characterArtwork";
import { catalogArtworkUrl, catalogArtworkLayers } from "../utils/catalogArtwork";

const items = JSON.parse(
  readFileSync(resolve(process.cwd(), "../backend/data/catalog.json"), "utf8"),
) as Garment[];
const initialIds = [
  "ribbon-blouse",
  "short-blouson",
  "pleated-skirt",
  "mary-janes",
  "ribbon-clip",
  "handbag",
  "pearl-necklace",
];
enableAutoUnmount(afterEach);
beforeEach(() => {
  setActivePinia(createPinia());
  const state = new Map<string, Ref>();
  vi.stubGlobal("useState", (key: string, initial: () => unknown) => {
    if (!state.has(key)) state.set(key, ref(initial()));
    return state.get(key);
  });
  const wardrobe = useWardrobe();
  wardrobe.catalog.items = items;
  wardrobe.catalog.categories = [
    "inner",
    "underwear",
    "socks",
    "tops",
    "outer",
    "bottoms",
    "shoes",
    "head",
    "bag",
    "jewelry",
  ].map((id) => ({
    id,
    name: id,
    en: id,
  })) as typeof wardrobe.catalog.categories;
  wardrobe.selections = Object.fromEntries(
    items
      .filter((i) => initialIds.includes(i.id))
      .map((i) => [i.category, i.id]),
  );
});
afterEach(() => vi.unstubAllGlobals());

function fittingRoom() {
  return mount(TryOnStudio, { global: { components: { MannequinPreview } } });
}

describe("anime dress-up fitting room", () => {
  it("starts in gray without an outer layer, bag or necklace, and keeps them available in the library", async () => {
    const wardrobe = useWardrobe();
    wardrobe.selections = {};
    vi.stubGlobal("$fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await wardrobe.initialize();
    expect(wardrobe.selections.outer).toBeUndefined();
    expect(wardrobe.selections.bag).toBeUndefined();
    expect(wardrobe.selections.jewelry).toBeUndefined();
    expect(wardrobe.selections.inner).toBe("cotton-camisole");
    expect(wardrobe.selectedItems.some(item => item.category === "tops")).toBe(true);
    expect(wardrobe.catalog.items.some(item => item.category === "outer")).toBe(true);
    expect(wardrobe.catalog.items.some(item => item.id === "canvas-tote" && item.category === "bag")).toBe(true);
    expect(wardrobe.paletteId).toBe("gray");
  });

  it("shares the selected pose between fitting and the canvas", async () => {
    const avatar = useAvatar();
    const wrapper = mount(TryOnStudio, { global: { components: { MannequinPreview }, stubs: { StudioCanvas: { props: ["pose"], template: '<div class="pose-canvas" :data-pose="pose" />' } } } });
    avatar.setPose("t-pose");
    await nextTick();
    expect(wrapper.find('.mannequin-viewport svg').attributes("data-pose")).toBe("t-pose");
    await wrapper.findAll('.fitting-view-switch button')[1]!.trigger("click");
    expect(wrapper.find('.pose-canvas').attributes("data-pose")).toBe("t-pose");
    avatar.setPose("relax");
    await nextTick();
    expect(wrapper.find('.pose-canvas').attributes("data-pose")).toBe("relax");
  });
  it("places inner shorts, spats, white tights and socks on the base body below the skirt and shoes while keeping them independently switchable",async()=>{
    const selected=items.filter(item=>["cotton-camisole","inner-spats","crew-socks","pleated-skirt","mary-janes"].includes(item.id));
    const wrapper=mount(MannequinPreview,{props:{heads:5,selected,palette:[],dressed:true,guides:false,paletteColors:false}});
    expect(wrapper.find('[data-layer="base"] [data-base-bottom="inner-spats"] image[data-artwork="lower-patch"]').attributes("href")).toBe(characterArtwork.innerBase);
    expect(wrapper.find('[data-layer="base"] [data-base-bottom="inner-spats"] image[data-spats-legs]').attributes("href")).toBe(characterArtwork.lowerBase);
    expect(wrapper.find('[data-layer="clothes"] [data-part="underwear"]').exists()).toBe(false);
    expect(wrapper.find('[data-layer="base-hosiery"] [data-hosiery="crew-socks"]').exists()).toBe(true);
    expect(wrapper.html().indexOf('data-layer="base"')).toBeLessThan(wrapper.html().indexOf('data-layer="base-hosiery"'));
    expect(wrapper.html().indexOf('data-layer="base-hosiery"')).toBeLessThan(wrapper.html().indexOf('data-layer="clothes"'));
    await wrapper.setProps({selected:selected.filter(item=>item.category!=="socks")});
    expect(wrapper.find('[data-layer="clothes"] [data-part="socks"]').exists()).toBe(false);
    expect(wrapper.find('[data-layer="base-hosiery"]').exists()).toBe(false);
    expect(wrapper.find('[data-layer="base"] [data-base-bottom="inner-spats"]').exists()).toBe(true);
    const whiteTights=items.find(item=>item.id==="white-tights")!;
    const blackTights=items.find(item=>item.id==="black-tights")!;
    expect(whiteTights.category).toBe("underwear");
    expect(blackTights.category).toBe("underwear");
    await wrapper.setProps({selected:[whiteTights,items.find(item=>item.id==="ankle-socks")!]});
    expect(wrapper.find('[data-layer="base"] [data-base-bottom="tights"] image[data-artwork="lower-patch"]').attributes("href")).toBe(characterArtwork.innerBase);
    expect(wrapper.find('[data-layer="base"] [data-base-bottom="tights"] image[data-spats-legs]').exists()).toBe(false);
    expect(wrapper.find('[data-layer="base-hosiery"]').exists()).toBe(false);
    await wrapper.setProps({selected:[blackTights,items.find(item=>item.id==="ankle-socks")!]});
    expect(wrapper.find('[data-layer="base"] [data-base-bottom="tights"] image[data-artwork="lower-patch"]').attributes("href")).toBe(characterArtwork.innerBase);
    expect(wrapper.find('[data-layer="base"] [data-base-bottom="tights"] image[data-artwork="lower-patch"]').attributes("filter")).toMatch(/-tights-tint\)$/);
    expect(wrapper.find('[data-layer="base-hosiery"]').exists()).toBe(false);
  });
  it("replaces the source cycling shorts and socks even when all wardrobe overlays are hidden",()=>{
    for(const gender of ["girl","boy"] as const){
      const wrapper=mount(MannequinPreview,{props:{heads:5,gender,selected:[],palette:[],dressed:false,guides:false,paletteColors:true}});
      const lower=wrapper.find('image[data-artwork="lower-patch"]');
      expect(lower.attributes("href")).toBe(characterArtwork.lowerBase);
      const rect=wrapper.find('clipPath[id$="-lower-patch"] rect');
      const top=Number(rect.attributes("y")),bottom=top+Number(rect.attributes("height"));
      expect(top).toBeLessThan(130);
      expect(bottom).toBeGreaterThan(380);
      expect(wrapper.find('mask[id$="-inner-base"]').findAll('rect[fill="black"]')).toHaveLength(2);
      expect(wrapper.find('image[data-artwork="head"]').attributes("href")).toBe(characterArtwork[gender]);
      wrapper.unmount();
    }
  });
  it("switches to the men's blazer coordinate with a tank inner and exposes all three preset audiences", async () => {
    const wardrobe=useWardrobe(),avatar=useAvatar();
    wardrobe.locks=["outer"];
    avatar.setGender("boy");
    expect(wardrobe.selections).toEqual({underwear:"cotton-inner-shorts",socks:"ankle-socks",inner:"cotton-tank",tops:"mens-shirt",outer:"mens-blazer",bottoms:"straight-slacks",shoes:"loafers"});
    expect(wardrobe.locks).toEqual([]);
    expect(wardrobe.presetAudience).toBe("mens");
    expect(wardrobe.visibleItems.some(item=>item.id === "mens-shirt")).toBe(true);
    expect(wardrobe.visibleItems.some(item=>item.id === "ribbon-blouse")).toBe(false);
    wardrobe.presetAudience="unisex";
    expect(wardrobe.visibleItems.every(item=>item.audience === "unisex")).toBe(true);
    const wrapper=mount(MannequinPreview,{props:{heads:5,gender:"boy",selected:[],palette:[],dressed:false,guides:false,paletteColors:true}});
    expect(wrapper.find('image[data-artwork="inner-patch"]').attributes("href")).toBe(characterArtwork.boyInnerBase);
    expect(wrapper.find('image[data-artwork="head"]').attributes("href")).toBe(characterArtwork.boy);
    avatar.setGender("girl");
    expect(wardrobe.selections.inner).toBe("cotton-camisole");
    expect(wardrobe.selections.outer).toBeUndefined();
    expect(wardrobe.selections.bag).toBeUndefined();
    expect(wardrobe.selections.jewelry).toBeUndefined();
  });
  it("fits locally generated PNG clothing to all three body proportions", async () => {
    const generated = { ...items.find((i) => i.id === "ribbon-blouse")!, id: "local-test", source: "local-diffusion" as const, imageUrl: "blob:generated-clothing" };
    const wrapper = mount(MannequinPreview, { props: { heads: 5, selected: [generated], palette: [], dressed: true, guides: false, paletteColors: true } });
    const widths = new Set<number>();
    for (const heads of [5, 6, 7] as const) {
      await wrapper.setProps({ heads });
      const image = wrapper.find('image[data-part="tops"]');
      expect(image.attributes("href")).toBe(generated.imageUrl);
      widths.add(Number(image.attributes("width")) * 612 / heads);
      expect(Number(image.attributes("height"))).toBeGreaterThan(0);
      expect(wrapper.html()).not.toMatch(/NaN|Infinity|undefined/);
      expect(wrapper.find('[data-layer="clothes"]').attributes("transform")).toBe(wrapper.find('[data-layer="base"]').attributes("transform"));
    }
    expect(widths.size).toBe(3);
    await wrapper.setProps({ dressed: false });
    expect(wrapper.findAll('image[data-part]')).toHaveLength(0);
    expect(wrapper.findAll('image[data-artwork]')).toHaveLength(4);
    expect(wrapper.find('image[data-artwork="inner-patch"]').attributes('href')).toBe(characterArtwork.innerBase);
  });
  it("switches all three proportions, resizes the fitted garments, and keeps the outfit unchanged", async () => {
    const wardrobe = useWardrobe();
    const selections = JSON.stringify(wardrobe.selections);
    const palette = [...wardrobe.palette];
    const wrapper = fittingRoom();
    const silhouettes = new Set<string>();
    for (const [button, heads] of [
      [0, 5],
      [1, 6],
      [2, 7],
    ]) {
      await wrapper
        .findAll(".proportion-switch button")
        [button!]!.trigger("click");
      const preview = wrapper.find('svg[role="img"]');
      expect(preview.attributes("data-heads")).toBe(String(heads));
      expect(
        wrapper.findAll('.proportion-switch [aria-pressed="true"]'),
      ).toHaveLength(1);
      const transform = wrapper.find('[data-layer="base"]').attributes("transform")!;
      silhouettes.add(transform);
      expect(transform).toBe(wrapper.find('[data-layer="clothes"]').attributes("transform"));
      expect(transform).not.toMatch(/NaN|Infinity|undefined/);
      expect(JSON.stringify(wardrobe.selections)).toBe(selections);
      expect(wardrobe.palette).toEqual(palette);
    }
    /* Both the body and clothing use the same canonical transform. */
    expect(silhouettes.size).toBe(3);
  });

  it("renders the accepted generated character artwork as the actual fitting avatar", async () => {
    const wrapper = fittingRoom();
    await wrapper.findAll(".tryon-options input")[1]!.setValue(false);
    expect(wrapper.find('[data-layer="base"]').attributes("fill")).toBe(
      "#FFFFFF",
    );
    expect(wrapper.find('[data-layer="clothes"]').exists()).toBe(false);
    expect(wrapper.find('image[data-artwork="head"]').attributes("href")).toBe(characterArtwork.girl);
    expect(wrapper.find('image[data-artwork="body"]').attributes("href")).toBe(characterArtwork.body);
    expect(wrapper.find('[data-layer="base"] path').exists()).toBe(false);
    expect(wrapper.find('[data-layer="face"]').exists()).toBe(false);
    expect(wrapper.find('svg[role="img"]').attributes("aria-label")).toContain(
      "デフォルメキャラクター",
    );
    expect(wrapper.findAll('image[data-artwork]')).toHaveLength(4);
    expect(wrapper.find('image[data-artwork="inner-patch"]').attributes('href')).toBe(characterArtwork.innerBase);
    expect(wrapper.find("linearGradient").exists()).toBe(false);
    expect(wrapper.find('[data-layer="hand-drawn"]').attributes("filter")).toMatch(/^url\(#/);
    // The published girl image must be the actual accepted reference, not a replacement drawing.
    const referenceAsset = resolve(process.cwd(), "../docs/design/character-jito-generated-v1.png");
    if (existsSync(referenceAsset)) {
      expect(readFileSync(resolve(process.cwd(), "public" + characterArtwork.girl))).toEqual(
        readFileSync(referenceAsset),
      );
    }
    for (const asset of [characterArtwork.girl, characterArtwork.boy, characterArtwork.body]) {
      const png = readFileSync(resolve(process.cwd(), "public" + asset));
      expect(png.subarray(1, 4).toString()).toBe("PNG");
      expect(png.readUInt32BE(16)).toBe(1024);
      expect(png.readUInt32BE(20)).toBe(1536);
      expect(png[25]).toBe(6); // RGBA assets preserve the real transparent background.
    }
  });

  it("keeps the original face pixels without overlays when gender, view, and proportion change", async () => {
    const wrapper = mount(MannequinPreview, { props: {
      heads: 5, gender: "girl", selected: [], palette: [], dressed: false,
      guides: false, paletteColors: true,
    } });
    for (const gender of ["girl", "boy"] as const)
      for (const heads of [5, 6, 7])
        for (const view of ["fitting", "illustration"] as const) {
          await wrapper.setProps({ gender, heads, view });
          expect(wrapper.attributes("data-character-style")).toBe("generated-jito");
          const face = wrapper.find('[data-layer="generated-face"]');
          expect(face.find('image').attributes("href")).toBe(characterArtwork[gender]);
          expect(face.findAll('path, ellipse, circle, linearGradient, radialGradient')).toHaveLength(0);
          expect(wrapper.find('[data-layer="head"]').attributes("transform")).toBe(`translate(240 42) scale(${612 / heads})`);
        }
  });

  it("does not let a selected head accessory overwrite the face clipping region", () => {
    const wrapper = fittingRoom();
    const ids = wrapper.findAll('[id]').map((node) => node.attributes("id"));
    expect(new Set(ids).size).toBe(ids.length);
    const faceClip = wrapper.find('[data-layer="generated-face"]').attributes("clip-path");
    expect(faceClip).toMatch(/-art-head\)$/);
    expect(wrapper.find('[data-part="head"]').exists()).toBe(true);
  });

  it("keeps the neutral palette even when legacy colourful preferences are supplied", async () => {
    const wrapper = mount(MannequinPreview, {
      props: {
        heads: 7,
        selected: [],
        palette: [],
        dressed: false,
        guides: false,
        paletteColors: true,
        avatar: {
          preset: "custom",
          hair: "long",
          hairColor: "#2F2B3A",
          skin: "#EFCBBA",
          eye: "#5D6F92",
          eyeShape: "jito",
          browShape: "soft",
          mouthShape: "smile",
          blush: "hatch",
          body: "soft",
          pose: "relax",
          winkSide: "none",
        },
      },
    });
    expect(wrapper.find('[data-layer="base"]').attributes("fill")).toBe("#FFFFFF");
    expect(wrapper.find('image[data-artwork="head"]').attributes("href")).toBe(characterArtwork.girl);
    expect(wrapper.html()).not.toContain("#2F2B3A");
    expect(wrapper.html()).not.toContain("#5D6F92");
    expect(wrapper.findAll("ellipse")).not.toHaveLength(0);
    await wrapper.setProps({ view: "illustration" });
    expect(wrapper.find('[data-layer="illustration"]').exists()).toBe(true);
    expect(wrapper.find("linearGradient").exists()).toBe(true);
  });

  it("updates the actual fitted garment and color immediately when the shared wardrobe changes", async () => {
    const wardrobe = useWardrobe();
    const wrapper = fittingRoom();
    const before = wrapper.find('[data-layer="clothes"] [data-part="tops"]').html();
    wardrobe.choose(items.find((i) => i.id === "graphic-tee")!);
    wardrobe.updateColor(0, "#ABCDEF");
    wardrobe.remove("outer");
    await nextTick();
    expect(wrapper.find('[data-layer="clothes"] [data-part="tops"]').html()).not.toBe(before);
    expect(wrapper.find('[data-layer="clothes"] [data-part="tops"]').attributes("fill")).toBe(
      "#ABCDEF",
    );
    expect(wrapper.find('[data-part="outer"]').exists()).toBe(false);
    expect(wardrobe.selections.tops).toBe("graphic-tee");
    expect(wrapper.find('[data-layer="clothes"] [data-part="tops"] image[data-catalog-art]').attributes("href")).toBe(catalogArtworkUrl(items.find(i=>i.id==="graphic-tee")!,wardrobe.palette,true,"body"));
    await wrapper.findAll(".tryon-options input")[2]!.setValue(false);
    expect(wardrobe.previewPaletteColors).toBe(false);
    expect(wrapper.find('[data-layer="clothes"] [data-part="tops"] image[data-catalog-art]').attributes("href")).toBe(catalogArtworkUrl(items.find(i=>i.id==="graphic-tee")!,wardrobe.palette,false,"body"));
  });

  it("fits a blouse at the waist while keeping its complete hem and original artwork intact", async () => {
    const wrapper=mount(MannequinPreview, { props: { heads:5, selected:items.filter(item=>["ribbon-blouse","pleated-skirt"].includes(item.id)), palette:[], dressed:true, guides:false, paletteColors:false } });
    const top=wrapper.find('[data-layer="clothes"] [data-part="tops"]');
    expect(top.find('[data-waist-fit="true"]').exists()).toBe(true);
    expect(top.find('clipPath[id$="-waist"]').exists()).toBe(false);
    expect(top.find('image[data-catalog-art]').attributes('href')).toBe(catalogArtworkUrl(items.find(item=>item.id==="ribbon-blouse")!,[],false,"body"));
    await wrapper.setProps({ selected: items.filter(item=>item.id==="ribbon-blouse") });
    expect(wrapper.find('[data-part="tops"] [data-waist-fit]').exists()).toBe(false);
  });

  it("fits every catalogue garment at all three proportions without invalid coordinates", async () => {
    const wrapper = mount(MannequinPreview, {
      props: {
        heads: 5,
        selected: [],
        palette: ["#FFF0F6", "#FFFFFF", "#DBEAFE", "#C4B5FD", "#374151"],
        dressed: true,
        guides: false,
        paletteColors: true,
      },
    });
    for (const heads of [5, 6, 7] as const)
      for (const item of items) {
        await wrapper.setProps({ heads, selected: [item] });
        expect(wrapper.html()).not.toMatch(/NaN|Infinity|undefined/);
        expect(wrapper.attributes("data-heads")).toBe(String(heads));
        expect(wrapper.find(`[data-art-source="${item.id}"]`).exists()).toBe(true);
        if (item.id === "cotton-camisole" || item.category === "underwear") {
          const lower=item.category === "underwear";
          const expectedHref=item.id === "cotton-inner-shorts" ? characterArtwork.lowerBase : characterArtwork.innerBase;
          expect(wrapper.find(lower ? '[data-base-bottom] image[data-artwork="lower-patch"]' : '[data-base-inner] image').attributes("href")).toBe(expectedHref);
          continue;
        }
        if (item.category === "socks") {
          expect(wrapper.find('[data-hosiery-artwork]').attributes("href")).toBe(characterArtwork.lowerBase);
          continue;
        }
        const parts=catalogArtworkLayers(item);
        const palette=["#FFF0F6", "#FFFFFF", "#DBEAFE", "#C4B5FD", "#374151"];
        const expected=parts.length ? ["body" as const,...parts].map(part=>catalogArtworkUrl(item,palette,true,part)) : [catalogArtworkUrl(item,palette,true)];
        expect(new Set(wrapper.findAll('image[data-catalog-art]').map(node=>node.attributes("href")))).toEqual(new Set(expected));
      }
  }, 20000);
});
