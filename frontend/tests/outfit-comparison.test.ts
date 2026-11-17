import { afterEach, describe, expect, it } from "vitest";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import OutfitComparison, { type ComparisonOutfit } from "../components/OutfitComparison.vue";
import catalog from "../data/wardrobe.json";
import type { Garment } from "../types/wardrobe";
enableAutoUnmount(afterEach);
describe("illustrator coordinate comparison", () => {
  it("keeps the baseline paint separate and uses unique SVG resources in the exported composition", async () => {
    const baseline: ComparisonOutfit = { selected: [catalog.items.find(item => item.id === "sailor-top") as Garment], palette: catalog.palettes[0]!.colors, paletteColors: true, heads: 5, gender: "girl", pose: "relax", title: "基準" };
    const wrapper = mount(OutfitComparison, {props: {baseline, current: {...baseline}, dressed: true, guides:false}});
    const before = wrapper.findAll("svg.mannequin-preview")[0]!.html();
    await wrapper.setProps({current:{...baseline, heads:7, selected:baseline.selected.map(item=>({...item, paint:["#325577","#FFFFFF","#666666"]}))}});
    const previews = wrapper.findAll("svg.mannequin-preview");
    expect(previews[0]!.html()).toBe(before);
    expect(previews[1]!.attributes("data-heads")).toBe("7");
    expect(previews[1]!.findAll('image[data-catalog-art]').some(image=>decodeURIComponent(image.attributes("href")!).includes("#325577"))).toBe(true);
    const ids = wrapper.findAll("[id]").map(node=>node.attributes("id"));
    expect(new Set(ids).size).toBe(ids.length);
    expect(wrapper.attributes("viewBox")).toBe("0 0 960 760");
    await wrapper.setProps({dressed:false});
    expect(wrapper.findAll("svg.mannequin-preview")[1]!.find('[data-layer="clothes"]').exists()).toBe(false);
    expect(wrapper.findAll("svg.mannequin-preview")[0]!.find('[data-layer="clothes"]').exists()).toBe(true);
  });
});
