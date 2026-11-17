import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useStudioCanvas } from "../composables/useStudioCanvas";
import { useCanvasTransform } from "../composables/useCanvasTransform";

beforeEach(() => setActivePinia(createPinia()));

describe("studio canvas editing", () => {
  it("undoes a complete drag in one step and discards redo after a new edit", () => {
    const canvas = useStudioCanvas();
    const note = canvas.placeNote("袖の形を確認")!;
    for (const x of [10, 20, 30]) canvas.updateMany({ [note.id]: { x } });
    canvas.commit();
    canvas.undo();
    expect(canvas.items[0]!.x).toBe(0);
    canvas.redo();
    expect(canvas.items[0]!.x).toBe(30);
    canvas.undo();
    canvas.update(note.id, { text: "袖口を広げる" });
    expect(canvas.canRedo).toBe(false);
    expect(canvas.items[0]!.text).toBe("袖口を広げる");
  });

  it("restores notes, background and the same viewport after remounting", () => {
    const canvas = useStudioCanvas();
    canvas.placeNote("配色の候補");
    canvas.backdrop = "grid";
    let saved = "";
    canvas.persist(123, -45, 1.8, { setItem: (_key, value) => { saved = value; } });
    canvas.clear();
    const result = canvas.hydrate({ getItem: () => saved });
    expect(result?.viewport).toEqual({ panX: 123, panY: -45, zoom: 1.8 });
    expect(canvas.items[0]!.text).toBe("配色の候補");
    expect(canvas.backdrop).toBe("grid");
    expect(canvas.canUndo).toBe(false);
    expect(canvas.selectedIds).toEqual([]);
    canvas.persist(0, 0, 1, { setItem: (_key, value) => { saved = value; } });
    expect(canvas.hydrate({ getItem: () => saved })?.viewport.zoom).toBe(1);
  });

  it("ignores invalid stored geometry and does not duplicate the character", () => {
    const canvas = useStudioCanvas();
    const mannequin = canvas.ensureMannequin()!;
    canvas.duplicate([mannequin.id]);
    expect(canvas.items).toHaveLength(1);
    const snapshot = canvas.serialize();
    snapshot.items.push({ ...mannequin, id: "bad-size", width: -10 });
    snapshot.items.push({ ...mannequin, id: "bad-number", x: "12" as never });
    snapshot.items.push({ ...mannequin });
    canvas.restore(snapshot);
    expect(canvas.items).toHaveLength(1);
    expect(canvas.restore({ ...snapshot, version: 99 })).toBeNull();
  });

  it("keeps the point under the cursor stationary when zooming and respects bounds", () => {
    const transform = useCanvasTransform({ minZoom: .15, maxZoom: 6 });
    const rect = { left: 100, top: 50, width: 800, height: 600 } as DOMRect;
    transform.setViewport({ panX: 37, panY: -20, zoom: .8 });
    const before = transform.screenToWorld(350, 250, rect);
    transform.zoomAt(350, 250, rect, 2);
    expect(transform.screenToWorld(350, 250, rect)).toEqual(before);
    transform.zoomAt(350, 250, rect, 100);
    expect(transform.zoom.value).toBe(6);
    transform.setViewport({ panX: Infinity, panY: NaN, zoom: NaN });
    expect(transform.panX.value).toBe(0);
    expect(transform.zoom.value).toBe(1);
  });
});
