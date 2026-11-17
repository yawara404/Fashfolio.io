import { ref } from "vue";
import { defineStore } from "pinia";
import type { Garment } from "~/types/wardrobe";
import { clearModelFiles } from "~/utils/modelCache";

export interface BatchPartInput {
  base: Garment;
  name: string;
  prompt: string;
  seed: number;
  cutout: boolean;
  colors: string[];
}

export interface BatchPartResult {
  base: Garment;
  name: string;
  prompt: string;
  colors: string[];
  seed: number;
  duration: number;
  image?: Blob;
  preview?: string;
  added?: boolean;
  error?: string;
}

class RecoverableGenerationError extends Error {}

export const useDeviceGeneration = defineStore("device-generation", () => {
  const supported = ref<boolean | null>(null);
  const ready = ref(false);
  const busy = ref(false);
  const dialogOpen = ref(false);
  const phase = ref<"idle" | "prepare" | "generate" | "batch" | "tryon">("idle");
  const message = ref("");
  const progress = ref<number | null>(null);
  const error = ref("");
  const warning = ref("");
  const image = ref<Blob | null>(null);
  const preview = ref("");
  const resultSeed = ref(0);
  const duration = ref(0);
  const context = ref<{ base: Garment; prompt: string; name: string; colors: string[] } | null>(null);
  const batchResults = ref<BatchPartResult[]>([]);
  const batchProgress = ref<{ current: number; total: number; label: string } | null>(null);
  let worker: Worker | null = null;
  let batchToken = 0;
  let pendingGenerate: { resolve: (result: { image: Blob; seed: number; duration: number }) => void; reject: (error: Error) => void } | null = null;
  let pendingTryOn: { resolve: (image: Blob) => void; reject: (error: Error) => void } | null = null;
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
  function clearBatchResults() {
    for (const entry of batchResults.value) {
      if (entry.preview) URL.revokeObjectURL(entry.preview);
    }
    batchResults.value = [];
    batchProgress.value = null;
  }
  function getWorker() {
    if (worker) return worker;
    worker = new Worker(new URL("../workers/diffusion.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => {
      if (data.type === "status") {
        message.value = batchProgress.value ? `${batchProgress.value.current} / ${batchProgress.value.total} (${batchProgress.value.label}) · ${data.message}` : data.message;
        progress.value = data.progress ?? null;
      }
      if (data.type === "warning") warning.value = data.message;
      if (data.type === "ready") {
        ready.value = true;
        if (phase.value === "prepare") {
          busy.value = false; phase.value = "idle"; message.value = "この端末で生成できます"; progress.value = null;
        }
      }
      if (data.type === "result") {
        ready.value = true;
        if (pendingGenerate) {
          pendingGenerate.resolve({ image: data.image, seed: data.seed, duration: data.duration });
          pendingGenerate = null;
          return;
        }
        clearResult(); image.value = data.image; preview.value = URL.createObjectURL(data.image);
        resultSeed.value = data.seed; duration.value = data.duration;
        busy.value = false; phase.value = "idle"; message.value = "生成しました"; progress.value = null;
      }
      if (data.type === "tryon-result") {
        ready.value = true;
        pendingTryOn?.resolve(data.image); pendingTryOn = null;
        if (phase.value === "tryon") {
          busy.value = false; phase.value = "idle"; progress.value = null; message.value = "服の描き直しが完了しました";
        }
      }
      if (data.type === "error") {
        if (data.recoverable && pendingGenerate) {
          pendingGenerate.reject(new RecoverableGenerationError(data.message));
          pendingGenerate = null;
          return;
        }
        if (data.recoverable && phase.value === "generate") {
          error.value = data.message;
          busy.value = false;
          phase.value = "idle";
          progress.value = null;
          return;
        }
        const err = new Error(data.message);
        pendingGenerate?.reject(err); pendingGenerate = null;
        pendingTryOn?.reject(err); pendingTryOn = null;
        error.value = data.message; busy.value = false; phase.value = "idle"; progress.value = null; batchProgress.value = null;
        // Release partially initialized GPU sessions after failures as well.
        worker?.terminate(); worker = null; ready.value = false;
      }
    };
    worker.onerror = () => {
      const err = new Error("生成処理が停止しました。再試行してください。");
      pendingGenerate?.reject(err); pendingGenerate = null;
      pendingTryOn?.reject(err); pendingTryOn = null;
      error.value = "生成処理を起動できませんでした。ページを再読み込みしてお試しください。";
      worker?.terminate(); worker = null; busy.value = false; ready.value = false; phase.value = "idle"; batchProgress.value = null;
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
    if (supported.value === false || (busy.value && (phase.value === "generate" || phase.value === "batch"))) return;
    clearResult(); error.value = ""; busy.value = true; phase.value = "generate";
    context.value = metadata;
    message.value = ready.value ? "生成を開始しています" : "モデルを準備中";
    try { getWorker().postMessage({ type: "generate", prompt, seed, cutout }); }
    catch { cancel(); error.value = "生成処理を開始できませんでした。モデル準備から再試行してください。"; }
  }
  function runWorkerGenerate(prompt: string, seed: number, cutout: boolean) {
    return new Promise<{ image: Blob; seed: number; duration: number }>((resolve, reject) => {
      pendingGenerate = { resolve, reject };
      try {
        getWorker().postMessage({ type: "generate", prompt, seed, cutout });
      } catch {
        pendingGenerate = null;
        reject(new Error("生成処理を開始できませんでした。"));
      }
    });
  }
  async function generateBatch(parts: BatchPartInput[]) {
    if (supported.value === false || !parts.length || (busy.value && (phase.value === "generate" || phase.value === "batch"))) return;
    const token = ++batchToken;
    clearBatchResults();
    error.value = "";
    busy.value = true;
    phase.value = "batch";
    progress.value = 0;
    try {
      for (const [index, part] of parts.entries()) {
        if (token !== batchToken) return;
        batchProgress.value = { current: index + 1, total: parts.length, label: part.base.name };
        message.value = ready.value
          ? `${index + 1} / ${parts.length} (${part.base.name}) を生成中`
          : `モデルを準備中（${index + 1} / ${parts.length}）`;
        try {
          const res = await runWorkerGenerate(part.prompt, part.seed, part.cutout);
          if (token !== batchToken) return;
          batchResults.value.push({
            base: part.base,
            name: part.name,
            prompt: part.prompt,
            colors: part.colors,
            seed: res.seed,
            duration: res.duration,
            image: res.image,
            preview: URL.createObjectURL(res.image),
          });
          progress.value = (index + 1) / parts.length;
        } catch (err) {
          if (token !== batchToken) return;
          if (err instanceof RecoverableGenerationError) {
            batchResults.value.push({
              base: part.base,
              name: part.name,
              prompt: part.prompt,
              colors: part.colors,
              seed: part.seed,
              duration: 0,
              error: err.message,
            });
            progress.value = (index + 1) / parts.length;
            continue;
          }
          error.value = err instanceof Error ? err.message : "生成に失敗しました。";
          return;
        }
      }
      if (token === batchToken) {
        const succeeded = batchResults.value.filter((entry) => entry.image).length;
        message.value = succeeded === parts.length
          ? `${succeeded}点の衣装を生成しました`
          : `${succeeded} / ${parts.length}点の衣装を生成しました`;
      }
    } finally {
      if (token === batchToken) {
        busy.value = false;
        phase.value = "idle";
        batchProgress.value = null;
        progress.value = null;
      }
    }
  }
  async function regenerateBatchItem(index: number, part: BatchPartInput) {
    if (supported.value === false || busy.value || index < 0 || index >= batchResults.value.length) return;
    const token = ++batchToken;
    error.value = "";
    busy.value = true;
    phase.value = "batch";
    batchProgress.value = { current: 1, total: 1, label: part.base.name };
    message.value = `${part.base.name}を再生成中`;
    try {
      const res = await runWorkerGenerate(part.prompt, part.seed, part.cutout);
      if (token !== batchToken) return;
      const previous = batchResults.value[index];
      if (previous?.preview) URL.revokeObjectURL(previous.preview);
      batchResults.value[index] = {
        base: part.base,
        name: part.name,
        prompt: part.prompt,
        colors: part.colors,
        seed: res.seed,
        duration: res.duration,
        image: res.image,
        preview: URL.createObjectURL(res.image),
      };
      message.value = `${part.base.name}を再生成しました`;
    } catch (err) {
      if (token !== batchToken) return;
      if (err instanceof RecoverableGenerationError) {
        const previous = batchResults.value[index];
        if (previous?.preview) URL.revokeObjectURL(previous.preview);
        batchResults.value[index] = {
          base: part.base,
          name: part.name,
          prompt: part.prompt,
          colors: part.colors,
          seed: part.seed,
          duration: 0,
          error: err.message,
        };
      } else {
        error.value = err instanceof Error ? err.message : "再生成に失敗しました。";
      }
    } finally {
      if (token === batchToken) {
        busy.value = false;
        phase.value = "idle";
        batchProgress.value = null;
        progress.value = null;
      }
    }
  }
  function cancel() {
    batchToken += 1;
    const err = new Error("生成を停止しました。");
    pendingGenerate?.reject(err); pendingGenerate = null;
    pendingTryOn?.reject(err); pendingTryOn = null;
    worker?.terminate(); worker = null; busy.value = false; ready.value = false;
    phase.value = "idle"; progress.value = null; batchProgress.value = null;
    message.value = "処理を停止しました。取得済みモデルはキャッシュに残ります。";
  }
  function renderTryOn(reference: Blob, mask: Blob, prompt: string, seed: number): Promise<Blob> {
    if (!ready.value || busy.value) return Promise.reject(new Error("生成エンジンの準備ができていません。"));
    busy.value = true; phase.value = "tryon"; error.value = ""; message.value = "参照画像から服を描き直しています";
    return new Promise((resolve, reject) => {
      pendingTryOn = { resolve, reject };
      try { getWorker().postMessage({ type: "tryon", reference, mask, prompt, seed }); }
      catch { pendingTryOn = null; busy.value = false; phase.value = "idle"; reject(new Error("生成処理を開始できませんでした。")); }
    });
  }
  async function clearCache() {
    cancel(); clearResult(); clearBatchResults();
    try { await caches.delete("fashfolio-sd-turbo-v1"); await clearModelFiles(); message.value = "モデルのキャッシュを削除しました"; }
    catch { error.value = "キャッシュを削除できませんでした。ブラウザのサイトデータ設定をご確認ください。"; }
  }
  return { supported, ready, busy, dialogOpen, phase, message, progress, error, warning, image, preview, resultSeed, duration, context, batchResults, batchProgress, detect, prepare, generate, generateBatch, regenerateBatchItem, clearBatchResults, renderTryOn, cancel, clearCache, clearResult };
});
