import "fake-indexeddb/auto";
import { Blob as NodeBlob } from "node:buffer";
import { describe, expect, it } from "vitest";
import { latentNoise, eulerStep, decodePixels, removeWhiteBackdrop, SIGMA, VAE_SCALE } from "../utils/diffusion";
import { writeLocalGarment, readLocalGarments, deleteLocalGarment } from "../utils/localWardrobe";
import { localPrompt } from "../utils/localPrompt";
import catalogJSON from "../data/wardrobe.json";
import type { Catalog, Garment } from "../types/wardrobe";
const catalog = catalogJSON as Catalog;
describe("on-device diffusion processing", () => {
  it("reproduces noise by seed and applies SD-Turbo's single Euler step", () => {
    const a = latentNoise(42);
    expect(a).toEqual(latentNoise(42));
    expect(a).not.toEqual(latentNoise(43));
    expect(a.every(Number.isFinite)).toBe(true);
    const noise = Float32Array.from([1, 2, -3]);
    const prediction = Float32Array.from([0.1, 0, -0.5]);
    const output = eulerStep(noise, prediction);
    expect(output[0]).toBeCloseTo((1 - SIGMA * prediction[0]!) / VAE_SCALE, 5);
    expect(output[1]).toBeCloseTo(2 / VAE_SCALE, 5);
    expect(() => eulerStep(noise, new Float32Array(1))).toThrow();
  });
  it("decodes planar RGB output and clamps values", () => {
    expect([...decodePixels(Float32Array.from([-2, 2, 0]), 1, 1)]).toEqual([0, 255, 128, 255]);
  });
  it("removes the border background while preserving enclosed white fabric", () => {
    const width = 7, height = 7;
    const input = new Uint8ClampedArray(width * height * 4).fill(255);
    for (let y = 1; y <= 5; y++) for (let x = 1; x <= 5; x++) {
      if (x === 1 || x === 5 || y === 1 || y === 5) {
        const i = (y * width + x) * 4; input[i] = 60; input[i + 1] = 60; input[i + 2] = 70;
      }
    }
    const { pixels, crop } = removeWhiteBackdrop(input, width, height);
    expect(pixels[3]).toBe(0);
    expect(pixels[(3 * width + 3) * 4 + 3]).toBe(255);
    expect(crop).toEqual({ x: 1, y: 1, width: 5, height: 5 });
    expect(input[3]).toBe(255);
    expect(() => removeWhiteBackdrop(new Uint8ClampedArray(16).fill(255), 2, 2)).toThrow("輪郭");
  });
  it("persists PNG blobs and metadata without persisting expired object URLs", async () => {
    const item: Garment = { ...catalog.items[0]!, id: "local-test", source: "local-diffusion", baseId: catalog.items[0]!.id, imageUrl: "blob:temporary", seed: 42 };
    const image = new NodeBlob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }) as Blob;
    await writeLocalGarment({ item, image });
    const saved = (await readLocalGarments()).find((r) => r.item.id === item.id)!;
    expect(saved.item.seed).toBe(42);
    expect(saved.item.imageUrl).toBeUndefined();
    expect(saved.image.size).toBe(image.size);
    expect(saved.image.type).toBe("image/png");
    await deleteLocalGarment(item.id);
    expect((await readLocalGarments()).some((r) => r.item.id === item.id)).toBe(false);
  });
  it("composes custom clothing prompts and source links without a server", () => {
    const item = { ...catalog.items[0]!, id: "local-generated", name: "生成したブラウス", name_en: "pink blouse with star buttons" };
    const result = localPrompt([item], catalog.palettes[0]!.colors, "星のコーデ", "袖は短く", "girly", catalog);
    expect(result.brief_ja).toContain("生成したブラウス");
    expect(result.brief_ja).toContain("袖は短く");
    expect(result.positive).toContain("star buttons");
    expect(result.positive).toContain("dusty pink");
    expect(result.references[0]!.item_id).toBe("local-generated");
    expect(result.references[0]!.danbooru).toContain("rating%3Ag");
  });
});
