import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, enableAutoUnmount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, ref, type Ref } from "vue";
import MannequinPreview from "../components/MannequinPreview.vue";
import TryOnStudio from "../components/TryOnStudio.vue";
import { useWardrobe } from "../composables/useWardrobe";
import type { Garment } from "../types/wardrobe";
import { characterArtwork } from "../data/characterArtwork";
import { catalogArtworkUrl } from "../utils/catalogArtwork";

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
    expect(wrapper.findAll('image[data-artwork]')).toHaveLength(2);
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
    expect(wrapper.findAll('image[data-artwork]')).toHaveLength(2);
    expect(wrapper.find("linearGradient").exists()).toBe(false);
    expect(wrapper.find('[data-layer="hand-drawn"]').attributes("filter")).toMatch(/^url\(#/);
    // The published girl image must be the actual accepted reference, not a replacement drawing.
    expect(readFileSync(resolve(process.cwd(), "public" + characterArtwork.girl))).toEqual(
      readFileSync(resolve(process.cwd(), "../docs/design/character-jito-generated-v1.png")),
    );
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
    const before = wrapper.find('[data-part="tops"]').html();
    wardrobe.choose(items.find((i) => i.id === "graphic-tee")!);
    wardrobe.updateColor(0, "#ABCDEF");
    wardrobe.remove("outer");
    await nextTick();
    expect(wrapper.find('[data-part="tops"]').html()).not.toBe(before);
    expect(wrapper.find('[data-part="tops"]').attributes("fill")).toBe(
      "#ABCDEF",
    );
    expect(wrapper.find('[data-part="outer"]').exists()).toBe(false);
    expect(wardrobe.selections.tops).toBe("graphic-tee");
    expect(wrapper.find('[data-part="tops"] image[data-catalog-art]').attributes("href")).toBe(wardrobe.previewImage(items.find(i=>i.id==="graphic-tee")!));
    await wrapper.findAll(".tryon-options input")[2]!.setValue(false);
    expect(wardrobe.previewPaletteColors).toBe(false);
    expect(wrapper.find('[data-part="tops"] image[data-catalog-art]').attributes("href")).toBe(wardrobe.previewImage(items.find(i=>i.id==="graphic-tee")!));
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
        expect(wrapper.find('image[data-catalog-art]').attributes("href")).toBe(catalogArtworkUrl(item,["#FFF0F6", "#FFFFFF", "#DBEAFE", "#C4B5FD", "#374151"],true));
      }
  });
});
