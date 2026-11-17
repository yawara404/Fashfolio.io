import "fake-indexeddb/auto";
import { Blob as NodeBlob } from "node:buffer";
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, enableAutoUnmount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import StudioCanvas from "../components/canvas/StudioCanvas.vue";
import { useStudioCanvas } from "../composables/useStudioCanvas";
import {
  cloudCanvasRevision,
  cloudStorageState,
  flushCloudWorkspace,
  hydrateCloudWorkspace,
  markCloudGarmentDeleted,
  resetCloudStorageForTests,
  storageDigest,
} from "../utils/cloudStorage";
import { deleteLocalGarment, readLocalGarments, writeLocalGarment } from "../utils/localWardrobe";
import { readPoseRender, writePoseRender } from "../utils/poseRenderCache";
import { modelRange } from "../server/utils/modelRange";
import { DIFFUSION_MODELS, DIFFUSION_REVISION, cachedModelPath, mirrorModelToR2, syncCachedModelsToR2 } from "../server/utils/diffusionModels";
import catalog from "../data/wardrobe.json";
import type { Garment } from "../types/wardrobe";

enableAutoUnmount(afterEach);

function pngBytes(tag = "1") {
  const header = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const body = new TextEncoder().encode(tag);
  const bytes = new Uint8Array(header.length + body.length);
  bytes.set(header, 0);
  bytes.set(body, header.length);
  return bytes;
}

function pngBlob(tag = "1") {
  return new NodeBlob([pngBytes(tag)], { type: "image/png" }) as Blob;
}

beforeEach(async () => {
  localStorage.clear();
  resetCloudStorageForTests();
  setActivePinia(createPinia());
  vi.stubGlobal("crypto", webcrypto);
  for (const record of await readLocalGarments().catch(() => [])) {
    await deleteLocalGarment(record.item.id).catch(() => {});
  }
  resetCloudStorageForTests();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Cloudflare R2 workspace and cache sync", () => {
  it("stays in local mode when R2 is not configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ configured: false, provider: "local" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const restored = await hydrateCloudWorkspace();
    expect(restored).toEqual([]);
    expect(cloudStorageState.value.configured).toBe(false);
    expect(cloudStorageState.value.phase).toBe("local");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("restores workspace, canvas and generated garments without overwriting existing local data or triggering redundant PUT", async () => {
    const base = catalog.items[0] as Garment;
    const garment: Garment = { ...base, id: "local-cloud-1", source: "local-diffusion", baseId: base.id };
    const image = pngBlob("cloud-garment");
    const assetDigest = await storageDigest(image);
    const remoteWorkspace = {
      version: 1,
      updatedAt: "2026-11-17T00:00:00Z",
      draft: { item_ids: [garment.id], palette: ["#FFFFFF"], style: "girly", name: "クラウド下書き", notes: "" },
      saved: [{ id: "saved-1", name: "保存コーデ", item_ids: [base.id], palette: ["#FFFFFF"], style: "girly", notes: "", createdAt: "2026-11-17T00:00:00Z" }],
      canvas: { version: 1, items: [{ id: "note-1", kind: "note", x: 50, y: 60, width: 220, height: 132, rotation: 0, z: 1, label: "メモ", text: "雲メモ" }], viewport: { panX: 0, panY: 0, zoom: 1 }, backdrop: "dots" },
      garments: [{ item: garment, asset: assetDigest }],
    };
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/storage/status") return new Response(JSON.stringify({ configured: true }), { status: 200 });
      if (url === "/api/storage/workspace" && (!init?.method || init.method === "GET")) {
        return new Response(JSON.stringify(remoteWorkspace), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (url === `/api/storage/assets/${assetDigest}`) {
        return new Response(pngBytes("cloud-garment"), { status: 200, headers: { "Content-Type": "image/png" } });
      }
      return new Response("unexpected", { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const restored = await hydrateCloudWorkspace();
    expect(cloudStorageState.value.configured).toBe(true);
    expect(cloudStorageState.value.phase).toBe("synced");
    expect(cloudCanvasRevision.value).toBe(1);
    expect(JSON.parse(localStorage.getItem("fashfolio.outfits.v2")!)).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem("fashfolio.draft.v1")!).name).toBe("クラウド下書き");
    expect(restored).toHaveLength(1);
    expect(restored[0]!.item.id).toBe(garment.id);
    expect(localStorage.getItem("fashfolio.r2.vault.v1")).toMatch(/^[a-f0-9]{64}$/);

    vi.useFakeTimers();
    await vi.advanceTimersByTimeAsync(2500);
    const methods = fetchMock.mock.calls.map(([, init]) => init?.method || "GET");
    expect(methods).not.toContain("PUT");
  });

  it("uploads local garments, deletes removed assets and recovers from sync errors", async () => {
    const base = catalog.items[0] as Garment;
    const oldItem: Garment = { ...base, id: "local-old", source: "local-diffusion", baseId: base.id };
    const newItem: Garment = { ...base, id: "local-new", source: "local-diffusion", baseId: base.id };
    const oldDigest = "a".repeat(64);
    const newImage = pngBlob("new-garment");
    const newDigest = await storageDigest(newImage);
    await writeLocalGarment({ item: newItem, image: newImage });

    let failPut = true;
    const deletedUrls: string[] = [];
    const uploadedDigests: string[] = [];
    let savedWorkspace: unknown = null;

    const remoteWorkspace = {
      version: 1,
      updatedAt: "2026-11-17T00:00:00Z",
      draft: null,
      saved: [],
      canvas: null,
      garments: [{ item: oldItem, asset: oldDigest }],
    };

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/storage/status") return new Response(JSON.stringify({ configured: true }), { status: 200 });
      if (url === "/api/storage/workspace" && (!init?.method || init.method === "GET")) {
        return new Response(JSON.stringify(remoteWorkspace), { status: 200 });
      }
      if (url === `/api/storage/assets/${oldDigest}` && (!init?.method || init.method === "GET")) {
        return new Response(pngBytes("old-garment"), { status: 200, headers: { "Content-Type": "image/png" } });
      }
      if (url === `/api/storage/assets/${newDigest}` && init?.method === "PUT") {
        uploadedDigests.push(newDigest);
        return new Response(JSON.stringify({ saved: true }), { status: 200 });
      }
      if (url === "/api/storage/workspace" && init?.method === "PUT") {
        if (failPut) return new Response("error", { status: 503 });
        savedWorkspace = JSON.parse(String(init.body));
        return new Response(JSON.stringify({ saved: true }), { status: 200 });
      }
      if (url === `/api/storage/assets/${oldDigest}` && init?.method === "DELETE") {
        deletedUrls.push(url);
        return new Response(JSON.stringify({ deleted: true }), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await hydrateCloudWorkspace();
    markCloudGarmentDeleted(oldItem.id);
    await deleteLocalGarment(oldItem.id);
    await flushCloudWorkspace();
    expect(cloudStorageState.value.phase).toBe("error");
    expect(uploadedDigests).toEqual([newDigest]);
    expect(deletedUrls).toEqual([]);

    failPut = false;
    await flushCloudWorkspace();
    expect(cloudStorageState.value.phase).toBe("synced");
    expect(deletedUrls).toEqual([`/api/storage/assets/${oldDigest}`]);
    expect((savedWorkspace as { garments: { item: { id: string } }[] }).garments.map((g) => g.item.id)).toEqual([newItem.id]);
  });

  it("reads missing pose renders from R2 and trims local cache after cloud backup", async () => {
    const key = "pose-r2-test";
    const digest = await storageDigest(key);
    const bounds = { x: 10, y: 20, width: 480, height: 480 };
    const image = pngBlob("pose-img");
    const puts: string[] = [];

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/storage/status") return new Response(JSON.stringify({ configured: true }), { status: 200 });
      if (url === "/api/storage/workspace") return new Response("", { status: 404 });
      if (/^\/api\/storage\/assets\/[a-f0-9]{64}\?cache=true$/.test(url) && init?.method === "PUT") {
        puts.push(url);
        return new Response(JSON.stringify({ saved: true }), { status: 200 });
      }
      if (url === `/api/storage/assets/${digest}?cache=true`) {
        return new Response(pngBytes("pose-img"), {
          status: 200,
          headers: { "Content-Type": "image/png", "X-Fashfolio-Bounds": JSON.stringify(bounds) },
        });
      }
      return new Response("", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    await hydrateCloudWorkspace();

    const fetched = await readPoseRender(key);
    expect(fetched?.bounds).toEqual(bounds);
    expect(fetched?.image.size).toBe(image.size);

    for (let i = 0; i < 7; i++) {
      await writePoseRender({ key: `pose-write-${i}`, image, bounds, createdAt: i + 10 });
    }
    await vi.waitFor(() => expect(puts.length).toBe(7));
    await vi.waitFor(async () => {
      expect(await readPoseRender("pose-write-0")).toBeUndefined();
    });
  });

  it("does not overwrite cloud canvas with the auto-seeded mannequin and applies restored canvas", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600,
      toJSON: () => ({}),
    });
    const remoteWorkspace = {
      version: 1,
      updatedAt: "2026-11-17T00:00:00Z",
      draft: null,
      saved: [],
      canvas: {
        version: 1,
        items: [{ id: "note-cloud", kind: "note", x: 100, y: 120, width: 220, height: 132, rotation: 0, z: 1, label: "メモ", text: "R2のメモ" }],
        viewport: { panX: 0, panY: 0, zoom: 1 },
        backdrop: "grid",
      },
      garments: [],
    };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === "/api/storage/status") return new Response(JSON.stringify({ configured: true }), { status: 200 });
      if (url === "/api/storage/workspace") return new Response(JSON.stringify(remoteWorkspace), { status: 200 });
      return new Response("", { status: 404 });
    }));

    const wrapper = mount(StudioCanvas, {
      props: { heads: 5, gender: "girl", dressed: true, guides: true },
      global: { stubs: { MannequinPreview: { template: '<svg data-character="unchanged" />' } } },
      attachTo: document.body,
    });
    await flushPromises();
    const canvas = useStudioCanvas();
    expect(canvas.mannequin).not.toBeNull();
    expect(localStorage.getItem("fashfolio-tryon-canvas-v1")).toBeNull();

    await hydrateCloudWorkspace();
    await flushPromises();
    expect(canvas.backdrop).toBe("grid");
    expect(canvas.items.some((item) => item.id === "note-cloud" && item.text === "R2のメモ")).toBe(true);
    wrapper.unmount();
  });

  it("parses byte ranges for R2 model streaming", () => {
    expect(modelRange(undefined, 1000)).toBeNull();
    expect(modelRange("bytes=0-99", 1000)).toEqual({ start: 0, end: 99 });
    expect(modelRange("bytes=900-", 1000)).toEqual({ start: 900, end: 999 });
    expect(modelRange("bytes=-100", 1000)).toEqual({ start: 900, end: 999 });
    expect(modelRange("bytes=1000-1001", 1000)).toBe("invalid");
    expect(modelRange("bytes=200-100", 1000)).toBe("invalid");
    expect(modelRange("items=0-10", 1000)).toBe("invalid");
  });

  it("mirrors locally cached ONNX models to R2 without requiring browser credentials", async () => {
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "fashfolio-model-sync-"));
    const vaePath = path.join(tmpdir, `${DIFFUSION_REVISION}-vae.onnx`);
    fs.writeFileSync(vaePath, Buffer.alloc(0));
    fs.truncateSync(vaePath, DIFFUSION_MODELS.vae.size);
    const partialPath = path.join(tmpdir, `${DIFFUSION_REVISION}-text.onnx`);
    fs.writeFileSync(partialPath, Buffer.from("incomplete"));

    try {
      expect(await cachedModelPath("vae", tmpdir)).toBe(vaePath);
      expect(await cachedModelPath("text", tmpdir)).toBeNull();

      const mirroredCalls: string[] = [];
      vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          mirroredCalls.push(url);
          return new Response(JSON.stringify({ queued: true, status: "syncing" }), { status: 200 });
        }
        return new Response("", { status: 404 });
      }));

      const synced = await syncCachedModelsToR2("http://127.0.0.1:8085", tmpdir);
      expect(synced).toEqual(["vae"]);
      expect(mirroredCalls).toEqual([`http://127.0.0.1:8085/api/storage/models/${DIFFUSION_REVISION}/vae`]);
      // Subsequent call hits the in-process deduplicated mirror cache.
      expect(await mirrorModelToR2("http://127.0.0.1:8085", "vae", tmpdir)).toBe(true);
      expect(mirroredCalls).toHaveLength(1);
    } finally {
      fs.rmSync(tmpdir, { recursive: true, force: true });
    }
  });
});
