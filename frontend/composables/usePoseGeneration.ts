import { ref, watch } from "vue";
import { defineStore } from "pinia";
import { useDeviceGeneration } from "~/composables/useDeviceGeneration";
import { poseRenderKey, poseRenderPrompt, preparePoseReference, type PoseRenderInput } from "~/utils/poseReference";
import { readPoseRender, writePoseRender } from "~/utils/poseRenderCache";
import type { PoseRender, PoseRenderRecord } from "~/types/poseRender";

export const usePoseGeneration = defineStore("pose-generation", () => {
  const device = useDeviceGeneration();
  const enabled = ref(false), preparing = ref(false), generating = ref(false), error = ref("");
  const render = ref<PoseRender | null>(null);
  let wanted: { key: string; input: PoseRenderInput; svg: () => SVGSVGElement | null } | null = null;
  let version = 0, timer: ReturnType<typeof setTimeout> | undefined;
  const urls = new Map<string, PoseRender>();
  let ownsPreparation = false;
  function show(record: PoseRenderRecord) {
    let cached = urls.get(record.key);
    if (!cached) { cached = { imageUrl: URL.createObjectURL(record.image), bounds: record.bounds }; urls.set(record.key, cached); }
    render.value = cached;
    if (urls.size > 20) { const key = urls.keys().next().value!; if (key !== record.key) { URL.revokeObjectURL(urls.get(key)!.imageUrl); urls.delete(key); } }
  }
  async function update(input: PoseRenderInput, svg: () => SVGSVGElement | null) {
    const key = poseRenderKey(input), mine = ++version;
    wanted = { key, input, svg }; render.value = null; error.value = "";
    if (!enabled.value) return;
    if (urls.has(key)) { render.value = urls.get(key)!; return; }
    try { const cached = await readPoseRender(key); if (mine !== version) return; if (cached) { show(cached); return; } } catch { /* Cache is optional. */ }
    if (device.dialogOpen) return;
    if (!device.ready && !device.busy && device.supported) { ownsPreparation = true; device.prepare(); }
    schedule();
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(() => { void generate(); }, 450); }
  async function generate() {
    if (!enabled.value || device.dialogOpen || !wanted || render.value || device.busy || !device.ready || preparing.value || generating.value) return;
    if (!wanted.input.selected.some(item => item.category === "tops" || item.category === "outer")) return;
    const request = wanted, mine = version, svg = request.svg();
    if (!svg) return;
    preparing.value = true; error.value = "";
    try {
      const reference = await preparePoseReference(svg, request.input);
      if (mine !== version || !enabled.value) return;
      preparing.value = false; generating.value = true;
      let seed = 2166136261;
      for (const char of request.key) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
      const image = await device.renderTryOn(reference.reference, reference.mask, poseRenderPrompt(request.input), seed >>> 0 || 1);
      const record = { key: request.key, image, bounds: reference.bounds, createdAt: Date.now() };
      try { await writePoseRender(record); } catch { /* The generated image still displays when storage is full. */ }
      if (mine === version && enabled.value) show(record);
    } catch (reason) { if (mine === version) error.value = reason instanceof Error ? reason.message : "服を生成できませんでした。"; }
    finally { preparing.value = false; generating.value = false; if (mine !== version) schedule(); }
  }
  async function enable() {
    enabled.value = true; error.value = "";
    try { localStorage.setItem("fashfolio-pose-generation", "on"); } catch { /* Optional. */ }
    if (wanted) await update(wanted.input, wanted.svg);
    await device.detect();
    if (render.value) return;
    if (!device.supported) { error.value = "WebGPU対応のChrome / Edgeで利用できます。"; return; }
    if (!device.ready && !device.busy) { ownsPreparation = true; device.prepare(); }
    else schedule();
  }
  function disable() {
    enabled.value = false; ++version; clearTimeout(timer); render.value = null;
    if (device.phase === "tryon" || ownsPreparation && device.phase === "prepare") device.cancel();
    try { localStorage.removeItem("fashfolio-pose-generation"); } catch { /* Optional. */ }
  }
  async function hydrate() {
    await device.detect();
    try { if (localStorage.getItem("fashfolio-pose-generation") === "on") await enable(); } catch { /* Optional. */ }
  }
  function retry() { error.value = ""; if (!device.ready) void enable(); else schedule(); }
  watch(() => [device.ready, device.busy, device.dialogOpen], () => { if (device.ready) ownsPreparation = false; if (device.ready && !device.busy && !device.dialogOpen && !error.value) schedule(); });
  return { enabled, preparing, generating, error, render, update, enable, disable, hydrate, retry };
});
