import { ref } from "vue";
import { defineStore } from "pinia";
import type { Garment } from "~/types/wardrobe";
export const useDeviceGeneration = defineStore("device-generation", () => {
  const supported = ref<boolean | null>(null);
  const ready = ref(false);
  const busy = ref(false);
  const phase = ref<"idle" | "prepare" | "generate">("idle");
  const message = ref("");
  const progress = ref<number | null>(null);
  const error = ref("");
  const warning = ref("");
  const image = ref<Blob | null>(null);
  const preview = ref("");
  const resultSeed = ref(0);
  const duration = ref(0);
  const context = ref<{ base: Garment; prompt: string; name: string; colors: string[] } | null>(null);
  let worker: Worker | null = null;
  async function detect() {
    try {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } }).gpu;
      const adapter = await gpu?.requestAdapter();
      supported.value = !!adapter?.features.has("shader-f16") && "OffscreenCanvas" in window;
    } catch { supported.value = false; }
  }
  function clearResult() {
    if (preview.value) URL.revokeObjectURL(preview.value);
    preview.value = ""; image.value = null;
  }
  function getWorker() {
    if (worker) return worker;
    worker = new Worker(new URL("../workers/diffusion.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => {
      if (data.type === "status") { message.value = data.message; progress.value = data.progress ?? null; }
      if (data.type === "warning") warning.value = data.message;
      if (data.type === "ready") { ready.value = true; busy.value = false; phase.value = "idle"; message.value = "この端末で生成できます"; progress.value = null; }
      if (data.type === "result") {
        clearResult(); image.value = data.image; preview.value = URL.createObjectURL(data.image);
        resultSeed.value = data.seed; duration.value = data.duration;
        busy.value = false; phase.value = "idle"; message.value = "生成しました"; progress.value = null;
      }
      if (data.type === "error") {
        error.value = data.message; busy.value = false; phase.value = "idle"; progress.value = null;
        // Release partially initialized GPU sessions after failures as well.
        worker?.terminate(); worker = null; ready.value = false;
      }
    };
    worker.onerror = () => {
      error.value = "生成処理を起動できませんでした。ページを再読み込みしてお試しください。";
      worker?.terminate(); worker = null; busy.value = false; ready.value = false; phase.value = "idle";
    };
    return worker;
  }
  function prepare() {
    if (busy.value || supported.value !== true) return;
    error.value = ""; warning.value = ""; busy.value = true; phase.value = "prepare"; message.value = "モデルを準備中";
    try { getWorker().postMessage({ type: "prepare" }); }
    catch { cancel(); error.value = "生成処理を起動できませんでした。ページを再読み込みしてください。"; }
  }
  function generate(prompt: string, seed: number, cutout: boolean, metadata: NonNullable<typeof context.value>) {
    if (!ready.value || busy.value) return;
    clearResult(); error.value = ""; busy.value = true; phase.value = "generate";
    context.value = metadata;
    message.value = "生成を開始しています";
    try { getWorker().postMessage({ type: "generate", prompt, seed, cutout }); }
    catch { cancel(); error.value = "生成処理を開始できませんでした。モデル準備から再試行してください。"; }
  }
  function cancel() {
    worker?.terminate(); worker = null; busy.value = false; ready.value = false;
    phase.value = "idle"; progress.value = null; message.value = "処理を停止しました。取得済みモデルはキャッシュに残ります。";
  }
  async function clearCache() {
    cancel(); clearResult();
    try { await caches.delete("fashfolio-sd-turbo-v1"); message.value = "モデルのキャッシュを削除しました"; }
    catch { error.value = "キャッシュを削除できませんでした。ブラウザのサイトデータ設定をご確認ください。"; }
  }
  return { supported, ready, busy, phase, message, progress, error, warning, image, preview, resultSeed, duration, context, detect, prepare, generate, cancel, clearCache, clearResult };
});
