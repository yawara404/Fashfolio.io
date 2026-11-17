import "fake-indexeddb/auto";
import { Blob as NodeBlob } from "node:buffer";
import { describe, expect, it } from "vitest";
import { imageSchedule, imageLatents, imageEulerStep, imageTensor, toFloat16, fromFloat16 } from "../utils/img2img";
import { SIGMA, VAE_SCALE } from "../utils/diffusion";
import { poseRenderKey, poseRenderPrompt } from "../utils/poseReference";
import { readPoseRender, writePoseRender } from "../utils/poseRenderCache";
import catalog from "../data/wardrobe.json";
import type { Garment } from "../types/wardrobe";

describe("Stable Diffusion reference-image rendering", () => {
  it("uses the pinned Turbo trailing schedule and starts from a noised reference", () => {
    const full = imageSchedule(4, 1), partial = imageSchedule();
    expect(full.map(step => step.time)).toEqual([999,749,499,249]);
    expect(full[0]!.sigma).toBeCloseTo(SIGMA, 3);
    expect(partial.map(step => step.time)).toEqual([499,249]);
    expect(partial.at(-1)!.next).toBe(0);
    const initial = imageLatents(Float32Array.from([1,2]), Float32Array.from([SIGMA,0]), 2);
    expect(initial[0]).toBeCloseTo(VAE_SCALE + 2);
    expect(initial[1]).toBeCloseTo(VAE_SCALE * 2);
    expect([...imageEulerStep(Float32Array.from([1,2]),Float32Array.from([.5,0]),2,0)]).toEqual([0,2]);
    expect(() => imageSchedule(0, .5)).toThrow();
    expect(() => imageLatents(new Float32Array(1),new Float32Array(2),1)).toThrow();
  });
  it("converts RGB to the VAE planar range and preserves fp16 tensor values", () => {
    expect([...imageTensor(Uint8ClampedArray.from([255,0,128,255]),1,1)]).toEqual([1,-1,expect.closeTo(1/255,6)]);
    const source = Float32Array.from([0,-0,1,-2,.5,1.9999,65504,1e-7]);
    const result = fromFloat16(toFloat16(source));
    expect([...result.slice(0,5)]).toEqual([0,-0,1,-2,.5]);
    expect(result[5]).toBe(2);
    expect(result[6]).toBe(65504);
    expect(result[7]).toBeCloseTo(1e-7,6);
  });
  it("keys results by pose, proportions, outfit and effective palette rather than expiring URLs", () => {
    const input = { heads: 5, gender: "girl" as const, pose: "relax", selected: [catalog.items[0] as Garment], palette: ["#aaaaaa"], paletteColors: true };
    const original = poseRenderKey(input);
    expect(poseRenderKey({...input,pose:"t-pose"})).not.toBe(original);
    expect(poseRenderKey({...input,heads:6})).not.toBe(original);
    expect(poseRenderKey({...input,palette:["#bbbbbb"]})).not.toBe(original);
    expect(poseRenderKey({...input,selected:[{...input.selected[0]!,imageUrl:"blob:expired"}]})).toBe(original);
    expect(poseRenderKey({...input,paletteColors:false,palette:[]})).toBe(poseRenderKey({...input,paletteColors:false,palette:["#000000"]}));
  });
  it("persists generated PNGs and bounds, and limits the cache to twenty variants", async () => {
    const image = new NodeBlob([new Uint8Array([137,80,78,71])],{type:"image/png"}) as Blob;
    const bounds = {x:-52.5,y:20,width:585,height:585};
    for (let i=0;i<21;i++) await writePoseRender({key:`render-${i}`,image,bounds,createdAt:i});
    expect(await readPoseRender("render-0")).toBeUndefined();
    const saved = await readPoseRender("render-20");
    expect(saved?.bounds).toEqual(bounds);
    expect(saved?.image.type).toBe("image/png");
    expect(saved?.image.size).toBe(image.size);
  });
  it("conditions the fabric generation on the selected gray palette", () => {
    const input = { heads: 5, gender: "girl" as const, pose: "relax", selected: catalog.items.filter(item => ["rib-knit", "short-blouson"].includes(item.id)) as Garment[], palette: catalog.palettes.find(palette => palette.id === "gray")!.colors, paletteColors: true };
    expect(poseRenderPrompt(input)).toContain("soft gray ribbed knit sweater");
    expect(poseRenderPrompt(input)).toContain("pearl white cropped blouson");
    expect(poseRenderPrompt({ ...input, paletteColors: false })).not.toContain("soft gray");
  });
});
