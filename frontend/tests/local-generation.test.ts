import "fake-indexeddb/auto";
import { Blob as NodeBlob } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import LocalGenerationDialog from "../components/LocalGenerationDialog.vue";
import { useWardrobe } from "../composables/useWardrobe";
import { useDeviceGeneration } from "../composables/useDeviceGeneration";
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
    const result = localPrompt([item], catalog.palettes.find(p => p.id === "petal")!.colors, "星のコーデ", "袖は短く", "girly", catalog);
    expect(result.brief_ja).toContain("生成したブラウス");
    expect(result.brief_ja).toContain("袖は短く");
    expect(result.positive).toContain("star buttons");
    expect(result.positive).toContain("dusty pink");
    expect(result.references[0]!.item_id).toBe("local-generated");
    expect(result.references[0]!.danbooru).toContain("rating%3Ag");
  });
  it("initializes base garment, name and description and keeps inputs editable even when opened during background preparation", async () => {
    setActivePinia(createPinia());
    const wardrobe = useWardrobe();
    wardrobe.catalog = JSON.parse(JSON.stringify(catalog)) as Catalog;
    wardrobe.activeCategory = "tops";
    wardrobe.selections.tops = "ribbon-blouse";
    const device = useDeviceGeneration();
    device.supported = true;
    device.busy = true;
    device.phase = "prepare";
    device.message = "モデルを準備中";
    vi.spyOn(device, "detect").mockResolvedValue(undefined);
    const wrapper = mount(LocalGenerationDialog, { props: { open: false } });
    await wrapper.setProps({ open: true });
    await nextTick();
    expect(device.dialogOpen).toBe(true);
    const baseTrigger = wrapper.find<HTMLButtonElement>("#generation-base");
    const nameInput = wrapper.find<HTMLInputElement>("#generation-name");
    const descInput = wrapper.find<HTMLTextAreaElement>("#generation-description");
    expect(baseTrigger.attributes("data-base-id")).toBe("ribbon-blouse");
    expect(baseTrigger.text()).toContain("リボンタイブラウス");
    expect(baseTrigger.element.disabled).toBe(false);
    expect(nameInput.element.value).toBe("オリジナルリボンタイブラウス");
    expect(nameInput.element.disabled).toBe(false);
    expect(descInput.element.value).toContain("ribbon-tie blouse");
    expect(descInput.element.disabled).toBe(false);

    await baseTrigger.trigger("click");
    await nextTick();
    const bottomsTab = wrapper.findAll(".base-picker-categories button").find((btn) => btn.text().includes("ボトムス"));
    expect(bottomsTab).toBeDefined();
    await bottomsTab!.trigger("click");
    await nextTick();
    const skirtCard = wrapper.find('[data-picker-item="pleated-skirt"]');
    expect(skirtCard.exists()).toBe(true);
    await skirtCard.trigger("click");
    await nextTick();
    expect(baseTrigger.attributes("data-base-id")).toBe("pleated-skirt");
    expect(nameInput.element.value).toContain("プリーツ");
    expect(descInput.element.value).toContain("pleated");
    wrapper.unmount();
  });

  it("supports batch coordinate slot configuration, theme editing, and per-slot base picking", async () => {
    setActivePinia(createPinia());
    const wardrobe = useWardrobe();
    wardrobe.catalog = JSON.parse(JSON.stringify(catalog)) as Catalog;
    wardrobe.style = "girly";
    wardrobe.selections = { tops: "ribbon-blouse", bottoms: "pleated-skirt", shoes: "mary-janes", head: "ribbon-clip" };
    const device = useDeviceGeneration();
    device.supported = true;

    const wrapper = mount(LocalGenerationDialog, { props: { open: true } });
    await nextTick();

    const batchTab = wrapper.findAll('.generation-mode-tabs button').find((btn) => btn.text().includes("1コーデまとめて生成"));
    expect(batchTab).toBeDefined();
    await batchTab!.trigger("click");
    await nextTick();

    const topsRow = wrapper.find('[data-batch-slot="tops"]');
    const bottomsRow = wrapper.find('[data-batch-slot="bottoms"]');
    const outerRow = wrapper.find('[data-batch-slot="outer"]');
    expect(topsRow.find<HTMLInputElement>('input[type="checkbox"]').element.checked).toBe(true);
    expect(bottomsRow.find<HTMLInputElement>('input[type="checkbox"]').element.checked).toBe(true);
    expect(outerRow.find<HTMLInputElement>('input[type="checkbox"]').element.checked).toBe(false);

    // Toggle outer on and swap its base via the scoped base picker dialog.
    await outerRow.find('.batch-slot-base').trigger("click");
    await nextTick();
    const pickerTabs = wrapper.findAll<HTMLButtonElement>(".base-picker-categories button");
    const topsPickerTab = pickerTabs.find((btn) => btn.text().includes("トップス"));
    expect(topsPickerTab?.element.disabled).toBe(true);
    const outerItem = wrapper.find('[data-picker-item]');
    expect(outerItem.exists()).toBe(true);
    await outerItem.trigger("click");
    await nextTick();
    expect(outerRow.find<HTMLInputElement>('input[type="checkbox"]').element.checked).toBe(true);

    // Disable shoes so 4 parts (outer, tops, bottoms, head) remain enabled.
    const shoesCheck = wrapper.find<HTMLInputElement>('[data-batch-slot="shoes"] input[type="checkbox"]');
    await shoesCheck.setValue(false);
    await nextTick();
    expect(wrapper.find(".batch-slots-header small").text()).toContain("4点");
    wrapper.unmount();
  });

  it("runs sequential batch generation, survives recoverable cutout errors, regenerates items, cancels cleanly, and equips the full outfit", async () => {
    const postedPrompts: Array<{ prompt: string; seed: number; cutout: boolean }> = [];
    const createdUrls: string[] = [];
    const revokedUrls: string[] = [];
    let workerInstanceCount = 0;
    let terminated = false;

    class MockWorker {
      onmessage: ((event: { data: Record<string, unknown> }) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      constructor() { workerInstanceCount++; }
      postMessage(msg: { type: string; prompt?: string; seed?: number; cutout?: boolean }) {
        if (msg.type === "generate") {
          postedPrompts.push({ prompt: msg.prompt || "", seed: msg.seed || 1, cutout: !!msg.cutout });
          const callIndex = postedPrompts.length;
          queueMicrotask(() => {
            if (callIndex === 2) {
              this.onmessage?.({ data: { type: "error", message: "白背景の透過に失敗しました。", recoverable: true } });
              return;
            }
            const blob = new NodeBlob([`png-${callIndex}`], { type: "image/png" }) as unknown as Blob;
            this.onmessage?.({ data: { type: "result", image: blob, seed: msg.seed || 1, duration: 1.2 } });
          });
        }
      }
      terminate() { terminated = true; }
    }

    vi.stubGlobal("Worker", MockWorker);
    vi.stubGlobal("OffscreenCanvas", class {});
    Object.defineProperty(navigator, "gpu", {
      configurable: true,
      value: { requestAdapter: async () => ({ features: new Set(["shader-f16"]) }) },
    });
    let blobSeq = 0;
    vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
      const url = `blob:batch-${++blobSeq}`;
      createdUrls.push(url);
      return url;
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation((url) => {
      revokedUrls.push(url);
    });

    try {
      setActivePinia(createPinia());
      const wardrobe = useWardrobe();
      wardrobe.catalog = JSON.parse(JSON.stringify(catalog)) as Catalog;
      wardrobe.style = "girly";
      wardrobe.activeCategory = "bag";
      wardrobe.selections = { tops: "ribbon-blouse", bottoms: "pleated-skirt", shoes: "mary-janes" };
      wardrobe.locks = ["shoes"];
      const device = useDeviceGeneration();
      device.supported = true;

      const wrapper = mount(LocalGenerationDialog, { props: { open: true } });
      await nextTick();
      await wrapper.findAll('.generation-mode-tabs button').find((btn) => btn.text().includes("1コーデまとめて生成"))!.trigger("click");
      await nextTick();

      await wrapper.find<HTMLInputElement>("#batch-outfit-name").setValue("春のカフェ");
      await wrapper.find<HTMLTextAreaElement>("#batch-theme").setValue("pastel spring cafe");
      await wrapper.find<HTMLInputElement>("#batch-seed").setValue(100);
      await nextTick();

      const runBtn = wrapper.findAll(".generation-primary-actions button").find((btn) => btn.text().includes("1コーデまとめて生成"));
      expect(runBtn).toBeDefined();
      await runBtn!.trigger("click");

      // Wait for all 3 queued microtask completions.
      await vi.waitFor(() => {
        expect(device.busy).toBe(false);
        expect(device.batchResults).toHaveLength(3);
      });

      expect(workerInstanceCount).toBe(1);
      expect(terminated).toBe(false);
      expect(device.ready).toBe(true);
      expect(postedPrompts.map((p) => p.seed)).toEqual([100, 101, 102]);
      expect(postedPrompts[0]!.prompt.startsWith("pastel spring cafe")).toBe(true);
      expect(device.batchResults[0]!.preview).toBe("blob:batch-1");
      expect(device.batchResults[1]!.error).toContain("白背景の透過に失敗");
      expect(device.batchResults[2]!.preview).toBe("blob:batch-2");

      // Regenerate the failed second card (bottoms).
      const regenButtons = wrapper.findAll(".batch-result-card .batch-result-actions button");
      expect(regenButtons).toHaveLength(3);
      await regenButtons[1]!.trigger("click");
      await vi.waitFor(() => {
        expect(device.busy).toBe(false);
        expect(device.batchResults[1]!.preview).toBe("blob:batch-3");
      });

      // Add & wear all 3 generated items together (shoes is locked, so saved without overriding lock).
      const addAllBtn = wrapper.find(".batch-result-panel .generation-add");
      expect(addAllBtn.exists()).toBe(true);
      await addAllBtn.trigger("click");
      await vi.waitFor(() => {
        expect(device.batchResults.every((r) => r.added)).toBe(true);
      });

      const localItems = wardrobe.catalog.items.filter((i) => i.source === "local-diffusion");
      expect(localItems).toHaveLength(3);
      expect(localItems.every((i) => i.name.startsWith("春のカフェ・"))).toBe(true);
      expect(wardrobe.selections.tops).toBe(localItems[0]!.id);
      expect(wardrobe.selections.bottoms).toBe(localItems[1]!.id);
      expect(wardrobe.selections.shoes).toBe("mary-janes");
      expect(wardrobe.activeCategory).toBe("tops");
      expect(wardrobe.toast).toContain("3点");

      // Cancel mid-batch tears down worker & clears progress cleanly, and clearBatchResults revokes URLs.
      const prevRevokedCount = revokedUrls.length;
      device.clearBatchResults();
      expect(revokedUrls.length).toBe(prevRevokedCount + 3);
      expect(createdUrls.length).toBeGreaterThanOrEqual(3);

      device.generateBatch([{
        base: catalog.items[0]!,
        name: "テスト",
        prompt: "test garment",
        seed: 7,
        cutout: true,
        colors: ["#FFFFFF"],
      }]);
      expect(device.busy).toBe(true);
      device.cancel();
      expect(terminated).toBe(true);
      expect(device.busy).toBe(false);
      expect(device.phase).toBe("idle");

      wrapper.unmount();
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });
});
