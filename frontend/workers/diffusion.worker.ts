/// <reference lib="webworker" />
// Pipeline adapted from Microsoft's MIT-licensed ONNX Runtime SD-Turbo example.
// https://github.com/microsoft/onnxruntime-inference-examples/tree/main/js/sd-turbo
import * as ort from "onnxruntime-web/webgpu";
import { Tokenizer } from "@huggingface/tokenizers";
import { latentNoise, scaleLatents, eulerStep, decodePixels, removeWhiteBackdrop } from "../utils/diffusion";

const MODEL = "https://huggingface.co/schmuell/sd-turbo-ort-web/resolve/ace89b7d2cd849f9a73914cdbb8a3ea60c853dd1";
const TOKENIZER = "https://huggingface.co/Xenova/clip-vit-base-patch16/resolve/342fdf2f67aded64d138ff074745fb4a5d2bba5f";
const CACHE = "fashfolio-sd-turbo-v1";
const definitions = [
  { key: "text", path: "text_encoder/model.onnx", size: 681393168, dimensions: { batch_size: 1 } },
  { key: "unet", path: "unet/model.onnx", size: 1733430199, dimensions: { batch_size: 1, num_channels: 4, height: 64, width: 64, sequence_length: 77 } },
  { key: "vae", path: "vae_decoder/model.onnx", size: 99094314, dimensions: { batch_size: 1, num_channels_latent: 4, height_latent: 64, width_latent: 64 } },
] as const;
const sessions: Record<string, ort.InferenceSession> = {};
let tokenizer: Tokenizer | undefined;
let busy = false;
const send = (data: Record<string, unknown>) => self.postMessage(data);
function status(message: string, progress?: number) { send({ type: "status", message, progress }); }
async function fetchCached(url: string, label: string, size = 0) {
  let cache: Cache | undefined;
  try { cache = await caches.open(CACHE); } catch { /* Private mode can disable Cache Storage. */ }
  const cached = await cache?.match(url);
  if (cached) { status(label + "をキャッシュから読み込み中"); return cached.arrayBuffer(); }
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`${label}を取得できません（HTTP ${response.status}）。接続を確認してください。`);
  const total = Number(response.headers.get("content-length")) || size;
  const reader = response.body.getReader();
  // Preallocate known weight sizes: avoid retaining 2 copies of a 1.7 GB model.
  let buffer = total ? new Uint8Array(total) : new Uint8Array(0);
  let received = 0, lastUpdate = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (received + value.length > buffer.length) {
      const expanded = new Uint8Array(Math.max(received + value.length, buffer.length * 2, 65536));
      expanded.set(buffer); buffer = expanded;
    }
    buffer.set(value, received); received += value.length;
    if (performance.now() - lastUpdate > 200) {
      status(`${label} ${Math.round(received / 1e6)} / ${Math.round(total / 1e6)} MB`, total ? received / total : undefined);
      lastUpdate = performance.now();
    }
  }
  if (size && received !== size) throw new Error(`${label}の取得が途中で終わりました。もう一度お試しください。`);
  const data = received === buffer.length ? buffer.buffer : buffer.buffer.slice(0, received);
  if (cache) {
    try { await cache.put(url, new Response(data, { headers: { "Content-Type": "application/octet-stream" } })); }
    catch { send({ type: "warning", message: "モデルをキャッシュできませんでした。次回は再取得が必要です。" }); }
  }
  return data;
}
async function prepare() {
  if (sessions.vae && tokenizer) return;
  const gpu = (navigator as WorkerNavigator & { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } }).gpu;
  const adapter = await gpu?.requestAdapter();
  if (!adapter?.features.has("shader-f16")) throw new Error("この端末ではWebGPU（shader-f16）が利用できません。対応するPCのChrome / Edgeで開いてください。");
  ort.env.wasm.wasmPaths = new URL("/ort/", self.location.origin).href;
  ort.env.wasm.numThreads = 1;
  const tokenizerJSON = JSON.parse(new TextDecoder().decode(await fetchCached(`${TOKENIZER}/tokenizer.json`, "語彙データ")));
  const config = JSON.parse(new TextDecoder().decode(await fetchCached(`${TOKENIZER}/tokenizer_config.json`, "語彙設定")));
  tokenizer = new Tokenizer(tokenizerJSON, config);
  for (const definition of definitions) {
    if (sessions[definition.key]) continue;
    const bytes = await fetchCached(`${MODEL}/${definition.path}`, definition.key, definition.size);
    status(`${definition.key}をGPUに準備中`);
    sessions[definition.key] = await ort.InferenceSession.create(bytes, {
      executionProviders: ["webgpu"], enableMemPattern: false, enableCpuMemArena: false,
      freeDimensionOverrides: definition.dimensions,
      ...(definition.key === "text" ? { preferredOutputLocation: { last_hidden_state: "gpu-buffer" as const } } : {}),
      extra: { session: { disable_prepacking: "1", use_device_allocator_for_initializers: "1", use_ort_model_bytes_directly: "1", use_ort_model_bytes_for_initializers: "1" } },
    });
  }
}
async function generate(prompt: string, seed: number, cutout: boolean) {
  if (!tokenizer || !sessions.vae) throw new Error("先にモデルを準備してください。");
  const tensors = new Set<ort.Tensor>();
  const own = <T extends ort.Tensor>(t: T): T => { tensors.add(t); return t; };
  const started = performance.now();
  try {
    status("1 / 3 衣装の説明を読み取り中");
    const encoded = tokenizer.encode(prompt).ids.slice(0, 77);
    if (encoded.length === 77) encoded[76] = 49407;
    const ids = new Int32Array(77); ids.set(encoded); // SD-Turbo CLIP pad token is 0.
    const text = await sessions.text!.run({ input_ids: own(new ort.Tensor("int32", ids, [1, 77])) });
    const hidden = own(text.last_hidden_state!);
    status("2 / 3 この端末のGPUで衣装を描画中");
    const noise = latentNoise(seed);
    const output = await sessions.unet!.run({
      sample: own(new ort.Tensor("float32", scaleLatents(noise), [1, 4, 64, 64])),
      timestep: own(new ort.Tensor("int64", BigInt64Array.from([999n]), [1])),
      encoder_hidden_states: hidden,
    });
    const prediction = own(output.out_sample!);
    const predictionData = await prediction.getData();
    status("3 / 3 色と輪郭を仕上げ中");
    const decoded = await sessions.vae!.run({ latent_sample: own(new ort.Tensor("float32", eulerStep(noise, predictionData as Float32Array), [1, 4, 64, 64])) });
    const sample = own(decoded.sample!);
    const rgba = decodePixels(await sample.getData() as Float32Array);
    const { pixels, crop } = cutout ? removeWhiteBackdrop(rgba, 512, 512) : { pixels: rgba, crop: { x: 0, y: 0, width: 512, height: 512 } };
    const full = new OffscreenCanvas(512, 512);
    full.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(pixels), 512, 512), 0, 0);
    const canvas = new OffscreenCanvas(crop.width, crop.height);
    canvas.getContext("2d")!.drawImage(full, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    const image = await canvas.convertToBlob({ type: "image/png" });
    send({ type: "result", image, seed, duration: Math.round((performance.now() - started) / 1000) });
  } finally { for (const t of tensors) t.dispose(); }
}
self.onmessage = async (event: MessageEvent<{ type: string; prompt: string; seed: number; cutout: boolean }>) => {
  if (busy) return;
  busy = true;
  try {
    if (event.data.type === "prepare") { await prepare(); send({ type: "ready" }); }
    else if (event.data.type === "generate") await generate(event.data.prompt, event.data.seed, event.data.cutout);
  } catch (error) {
    send({ type: "error", message: error instanceof Error ? error.message : String(error) });
  } finally { busy = false; }
};
