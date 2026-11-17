import {describe,it,expect} from "vitest";
import {mount} from "@vue/test-utils";
import MannequinPreview from "../components/MannequinPreview.vue";
import catalog from "../data/wardrobe.json";
import {catalogArtworkSvg} from "../utils/catalogArtwork";
import {characterArtwork} from "../data/characterArtwork";
import type {Garment} from "../types/wardrobe";
const items=catalog.items as Garment[];
const socks=items.filter(item=>item.category === "socks");

describe("aligned socks and tights bases",()=>{
  it("uses the exact base silhouette and transform at every proportion and pose",()=>{
    for(const gender of ["girl","boy"] as const)for(const heads of [5,6,7])for(const pose of ["relax","t-pose"])for(const item of socks){
      const wrapper=mount(MannequinPreview,{props:{gender,heads,pose,selected:[item],palette:[],dressed:true,guides:false,paletteColors:true}});
      const base=wrapper.find('image[data-artwork="lower-patch"]'),sock=wrapper.find('[data-hosiery-artwork]');
      for(const attr of ["href","x","y","width","height","preserveAspectRatio"]) expect(sock.attributes(attr),`${item.id}: ${attr}`).toBe(base.attributes(attr));
      expect(wrapper.find('[data-layer="base-hosiery"]').attributes("transform")).toBe(wrapper.find('[data-layer="base"]').attributes("transform"));
      wrapper.unmount();
    }
  });
  it("switches inner spats, white tights and black tights while keeping the silhouette fixed, including with clothing hidden",async()=>{
    const spats=items.find(item=>item.id === "inner-spats")!,white=items.find(item=>item.id === "white-tights")!,black=items.find(item=>item.id === "black-tights")!;
    expect(white.category).toBe("underwear");
    expect(black.category).toBe("underwear");
    const wrapper=mount(MannequinPreview,{props:{heads:5,selected:[spats],palette:[],dressed:false,guides:false,paletteColors:true}});
    expect(wrapper.find('[data-base-bottom="inner-spats"] image[data-artwork="lower-patch"]').attributes("href")).toBe(characterArtwork.innerBase);
    expect(wrapper.find('[data-base-bottom="inner-spats"] image[data-spats-legs]').attributes("href")).toBe(characterArtwork.lowerBase);
    await wrapper.setProps({selected:[white]});
    expect(wrapper.find('[data-base-bottom="tights"]').attributes("data-bottom-color")).toBe(white.colors[0]);
    expect(wrapper.find('[data-base-bottom="tights"] image[data-artwork="lower-patch"]').attributes("href")).toBe(characterArtwork.innerBase);
    expect(wrapper.find('[data-base-bottom="tights"] image[data-artwork="lower-patch"]').attributes("filter")).toMatch(/-inner-alpha\)$/);
    expect(wrapper.find('[data-base-bottom="tights"] image[data-spats-legs]').exists()).toBe(false);
    await wrapper.setProps({selected:[black]});
    expect(wrapper.find('[data-base-bottom="tights"]').attributes("data-bottom-color")).toBe(black.colors[0]);
    expect(wrapper.find('[data-base-bottom="tights"] image[data-artwork="lower-patch"]').attributes("href")).toBe(characterArtwork.innerBase);
    expect(wrapper.find('[data-base-bottom="tights"] image[data-artwork="lower-patch"]').attributes("filter")).toMatch(/-tights-tint\)$/);
    expect(wrapper.find('filter[id$="-tights-tint"] feColorMatrix').exists()).toBe(true);
    await wrapper.setProps({selected:[socks.find(item=>item.id === "ankle-socks")!]});
    expect(wrapper.find('[data-layer="base-hosiery"]').exists()).toBe(false);
    wrapper.unmount();
  });
  it("keeps the selected white or black color when the outfit palette changes",()=>{
    for(const id of ["white-tights","black-tights"]){
      const item=items.find(item=>item.id === id)!;
      expect(catalogArtworkSvg(item,["#FF0000","#00FF00","#0000FF"],true)).toContain(`fill="${item.colors[0]}"`);
    }
  });
});
