import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, enableAutoUnmount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import StudioCanvas from "../components/canvas/StudioCanvas.vue";
import { useStudioCanvas } from "../composables/useStudioCanvas";

enableAutoUnmount(afterEach);
beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600,
    toJSON: () => ({}),
  });
});
afterEach(() => { vi.restoreAllMocks(); });

async function canvasView() {
  const wrapper = mount(StudioCanvas, {
    props: { heads: 5, gender: "girl", dressed: true, guides: true },
    global: { stubs: { MannequinPreview: { template: '<svg data-character="unchanged" />' } } },
    attachTo: document.body,
  });
  await flushPromises();
  return wrapper;
}

describe("canvas keyboard and drag controls", () => {
  it("starts the character in the viewport centre and recentres at 100 percent", async () => {
    const wrapper = await canvasView();
    const character = useStudioCanvas().mannequin!;
    const view = wrapper.vm;
    expect((character.x + character.width / 2) * view.zoom + view.panX).toBeCloseTo(400);
    expect((character.y + character.height / 2) * view.zoom + view.panY).toBeCloseTo(300);
    view.resetTo100();
    expect(view.zoom).toBe(1);
    expect(character.x + character.width / 2 + view.panX).toBeCloseTo(400);
    expect(character.y + character.height / 2 + view.panY).toBeCloseTo(300);
  });
  it("centres the restored character when the viewport size changes", async () => {
    const canvas=useStudioCanvas();
    const character=canvas.ensureMannequin({x:500,y:30})!;
    canvas.placeNote("別の資料",{x:1400,y:30});
    canvas.persist(0,0,1,undefined,{width:1600,height:900});
    const wrapper=await canvasView();
    expect((character.x+character.width/2)*wrapper.vm.zoom+wrapper.vm.panX).toBeCloseTo(400);
    expect((character.y+character.height/2)*wrapper.vm.zoom+wrapper.vm.panY).toBeCloseTo(300);
  });

  it("keeps multiple selected objects together during a drag and undoes the drag", async () => {
    const wrapper = await canvasView();
    const canvas = useStudioCanvas();
    const character = canvas.mannequin!;
    const note = canvas.placeNote("袖口", { x: 500, y: 40 })!;
    canvas.selectMany([character.id, note.id]);
    await flushPromises();
    const initial = canvas.items.map((item) => ({ id: item.id, x: item.x, y: item.y }));
    await wrapper.find('[data-item-kind="mannequin"]').trigger("pointerdown", { button: 0, pointerId: 1, clientX: 200, clientY: 200 });
    window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: 250, clientY: 220 }));
    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, clientX: 250, clientY: 220 }));
    expect(canvas.selectedIds).toHaveLength(2);
    const offsets = canvas.items.map((item, index) => item.x - initial[index]!.x);
    expect(offsets[0]).toBeGreaterThan(0);
    expect(offsets[0]).toBeCloseTo(offsets[1]!);
    canvas.undo();
    expect(canvas.items.map((item) => ({ id: item.id, x: item.x, y: item.y }))).toEqual(initial);
  });

  it("saves note text while typing and groups the edit into a single undo", async () => {
    const wrapper = await canvasView();
    const canvas = useStudioCanvas();
    const note = canvas.placeNote("")!;
    await flushPromises();
    const editor = wrapper.find('textarea');
    (editor.element as HTMLTextAreaElement).value = "袖の形";
    await editor.trigger("input");
    expect(canvas.items.find((item) => item.id === note.id)!.text).toBe("袖の形");
    await editor.trigger("change");
    canvas.undo();
    expect(canvas.items.find((item) => item.id === note.id)!.text).toBe("");
  });

  it("records keyboard moves and confines shortcuts to the canvas", async () => {
    const wrapper = await canvasView();
    const canvas = useStudioCanvas();
    const character = canvas.mannequin!;
    canvas.select(character.id);
    const originalX = character.x;
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    expect(canvas.mannequin).not.toBeNull();
    await wrapper.trigger("keydown", { key: "ArrowRight" });
    expect(canvas.mannequin!.x).toBe(originalX + 4);
    await wrapper.trigger("keydown", { key: "z", ctrlKey: true });
    expect(canvas.mannequin!.x).toBe(originalX);
  });
});
