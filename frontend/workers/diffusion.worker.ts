/// <reference lib="webworker" />
// Pipeline adapted from Microsoft's MIT-licensed ONNX Runtime SD-Turbo example.
// https://github.com/microsoft/onnxruntime-inference-examples/tree/main/js/sd-turbo
import * as ort from "onnxruntime-web/webgpu";
import { Tokenizer } from "@huggingface/tokenizers";
import { latentNoise, scaleLatents, eulerStep, decodePixels, removeWhiteBackdrop } from "../utils/diffusion";
import { imageSchedule, imageLatents, imageEulerStep, imageTensor, toFloat16, fromFloat16 } from "../utils/img2img";
import { VAE_SCALE } from "../utils/diffusion";
import { chunkedModel, fileModel } from "../utils/modelCache";

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
async function fetchWeight(key:string,path:string,size:number) {
  status(`${key}のモデルを準備中`);
  try {
    // Nuxt keeps one local disk copy. This also works when the browser caps
    // per-origin storage below the size of the diffusion model.
    const response=await fetch(`/model-assets/${key}?revision=ace89b7d2cd849f9a73914cdbb8a3ea60c853dd1`);
    if(!response.ok || !response.body) throw new Error("Local model unavailable");
    const bytes=new Uint8Array(size),reader=response.body.getReader();let received=0,last=0;
    try {while(true){const {done,value}=await reader.read();if(done) break;if(received+value.length>size) throw new Error("Model size mismatch");bytes.set(value,received);received+=value.length;if(performance.now()-last>200){status(`${key} ${Math.round(received/1e6)} / ${Math.round(size/1e6)} MB`,received/size);last=performance.now();}}}
    finally{reader.releaseLock();}
    if(received!==size) throw new Error("Model incomplete");
    return bytes.buffer;
  } catch {return fetchCached(`${MODEL}/${path}`,key,size);}
}
async function fetchCached(url: string, label: string, size = 0) {
  let cache: Cache | undefined;
  try { cache = await caches.open(CACHE); } catch { /* Private mode can disable Cache Storage. */ }
  if (size > 128 * 1024 * 1024) {
    const progress=(received:number,total:number,saving?:boolean)=>status(`${label} ${Math.round(received/1e6)} / ${Math.round(total/1e6)} MB${saving ? ' · 保存中' : ''}`,received/total);
    const warning=()=>send({type:"warning",message:"モデルを保存できませんでした。次回は再取得が必要です。"});
    return await fileModel(url,size,cache,progress,warning) ?? chunkedModel(url,size,cache,progress,warning);
  }
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
    const bytes = await fetchWeight(definition.key,definition.path,definition.size);
    status(`${definition.key}をGPUに準備中`);
    sessions[definition.key] = await ort.InferenceSession.create(bytes, {
      executionProviders: ["webgpu"], enableMemPattern: false, enableCpuMemArena: false,
      freeDimensionOverrides: definition.dimensions,
      ...(definition.key === "text" ? { preferredOutputLocation: { last_hidden_state: "gpu-buffer" as const } } : {}),
      extra: { session: { disable_prepacking: "1", use_device_allocator_for_initializers: "1", use_ort_model_bytes_directly: "1", use_ort_model_bytes_for_initializers: "1" } },
    });
  }
}
async function prepareEncoder() {
  await prepare();
  if (sessions.encoder) return;
  const bytes = await fetchWeight("encoder","vae_encoder/model.onnx",68430468);
  sessions.encoder = await ort.InferenceSession.create(bytes, {
    executionProviders: ["webgpu"], enableMemPattern: false, enableCpuMemArena: false,
    freeDimensionOverrides: { batch_size: 1, num_channels: 3, height: 512, width: 512 },
    extra: { session: { disable_prepacking: "1", use_device_allocator_for_initializers: "1", use_ort_model_bytes_directly: "1", use_ort_model_bytes_for_initializers: "1" } },
  });
}
function input(session: string, name: string, data: Float32Array | Int32Array, dimensions: number[]) {
  const metadata = sessions[session]!.inputMetadata[sessions[session]!.inputNames.indexOf(name)];
  const type = metadata?.isTensor ? metadata.type : undefined;
  if (type === "float16") return new ort.Tensor("float16", toFloat16(Float32Array.from(data)), dimensions);
  if (type === "int64") return new ort.Tensor("int64", BigInt64Array.from(data, v => BigInt(v)), dimensions);
  if (type === "int32") return new ort.Tensor("int32", Int32Array.from(data), dimensions);
  return new ort.Tensor("float32", Float32Array.from(data), dimensions);
}
async function floats(tensor: ort.Tensor) {
  const data = await tensor.getData();
  const view = data as Float32Array | Uint16Array;
  return tensor.type === "float16" ? fromFloat16(new Uint16Array(view.buffer, view.byteOffset, view.byteLength / 2)) : Float32Array.from(data as Float32Array);
}
async function generate(prompt: string, seed: number, cutout: boolean) {
  await prepare();
  const tensors = new Set<ort.Tensor>();
  const own = <T extends ort.Tensor>(t: T): T => { tensors.add(t); return t; };
  const started = performance.now();
  try {
    status("1 / 3 衣装の説明を読み取り中");
    const encoded = tokenizer!.encode(prompt).ids.slice(0, 77);
    if (encoded.length === 77) encoded[76] = 49407;
    const ids = new Int32Array(77); ids.set(encoded); // SD-Turbo CLIP pad token is 0.
    const text = await sessions.text!.run({ input_ids: own(input("text", "input_ids", ids, [1, 77])) });
    const hidden = own(text.last_hidden_state!);
    status("2 / 3 この端末のGPUで衣装を描画中");
    const noise = latentNoise(seed);
    const output = await sessions.unet!.run({
      sample: own(input("unet", "sample", scaleLatents(noise), [1, 4, 64, 64])),
      timestep: own(input("unet", "timestep", Int32Array.from([999]), [1])),
      encoder_hidden_states: hidden,
    });
    const prediction = own(output.out_sample!);
    const predictionData = await floats(prediction);
    status("3 / 3 色と輪郭を仕上げ中");
    const decoded = await sessions.vae!.run({ latent_sample: own(input("vae", "latent_sample", eulerStep(noise, predictionData), [1, 4, 64, 64])) });
    const sample = own(decoded.sample!);
    const rgba = decodePixels(await floats(sample));
    const { pixels, crop } = cutout ? removeWhiteBackdrop(rgba, 512, 512) : { pixels: rgba, crop: { x: 0, y: 0, width: 512, height: 512 } };
    const full = new OffscreenCanvas(512, 512);
    full.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(pixels), 512, 512), 0, 0);
    const canvas = new OffscreenCanvas(crop.width, crop.height);
    canvas.getContext("2d")!.drawImage(full, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    const image = await canvas.convertToBlob({ type: "image/png" });
    send({ type: "result", image, seed, duration: Math.round((performance.now() - started) / 1000) });
  } finally { for (const t of tensors) t.dispose(); }
}
async function renderTryOn(prompt: string, seed: number, reference: Blob, mask: Blob) {
  await prepareEncoder();
  const tensors = new Set<ort.Tensor>();
  const own = <T extends ort.Tensor>(tensor: T): T => { tensors.add(tensor); return tensor; };
  const started = performance.now();
  try {
    const canvas = new OffscreenCanvas(512, 512), ctx = canvas.getContext("2d")!;
    const bitmap = await createImageBitmap(reference);
    ctx.drawImage(bitmap, 0, 0, 512, 512); bitmap.close();
    const original = ctx.getImageData(0, 0, 512, 512).data;
    const maskBitmap = await createImageBitmap(mask);
    ctx.clearRect(0, 0, 512, 512); ctx.drawImage(maskBitmap, 0, 0, 512, 512); maskBitmap.close();
    const maskPixels = ctx.getImageData(0, 0, 512, 512).data;
    status("1 / 4 元の服の色・柄とポーズを読み取り中");
    const encoded = await sessions.encoder!.run({ sample: own(input("encoder", "sample", imageTensor(original), [1, 3, 512, 512])) });
    const source = await floats(own(encoded.latent_sample!));
    const ids = new Int32Array(77), tokens = tokenizer!.encode(prompt).ids.slice(0, 77);
    if (tokens.length === 77) tokens[76] = 49407;
    ids.set(tokens);
    const text = await sessions.text!.run({ input_ids: own(input("text", "input_ids", ids, [1, 77])) });
    const hidden = own(text.last_hidden_state!);
    const noise = latentNoise(seed), schedule = imageSchedule();
    let latents = imageLatents(source, noise, schedule[0]!.sigma);
    for (const [i, step] of schedule.entries()) {
      status(`2 / 4 ポーズに合わせて服を描き直し中（${i + 1}/${schedule.length}）`, (i + 1) / schedule.length);
      const feeds = { sample: own(input("unet", "sample", latents.map(v => v / Math.sqrt(step.sigma ** 2 + 1)), [1, 4, 64, 64])),
        timestep: own(input("unet", "timestep", Int32Array.from([step.time]), [1])), encoder_hidden_states: hidden };
      const output = await sessions.unet!.run(feeds);
      const prediction = own(output.out_sample!);
      latents = imageEulerStep(latents, await floats(prediction), step.sigma, step.next);
      // Re-noise the unchanged context at each step, so it conditions the clothes
      // without allowing the face, hands, or hair to drift between denoise steps.
      const context = imageLatents(source, noise, step.next);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        let alpha = 0;
        for (let dy = 0; dy < 8; dy++) for (let dx = 0; dx < 8; dx++) alpha += maskPixels[((y * 8 + dy) * 512 + x * 8 + dx) * 4 + 3]!;
        const weight = alpha / (64 * 255);
        for (let c = 0; c < 4; c++) { const index = c * 4096 + y * 64 + x; latents[index] = latents[index]! * weight + context[index]! * (1 - weight); }
      }
    }
    status("3 / 4 服のしわと布の落ち方を仕上げ中");
    const decoded = await sessions.vae!.run({ latent_sample: own(input("vae", "latent_sample", latents.map(v => v / VAE_SCALE), [1, 4, 64, 64])) });
    const rgba = decodePixels(await floats(own(decoded.sample!)));
    // Only garment pixels are returned. The app always keeps the original face,
    // hair, skin and background; they are never replaced by generated pixels.
    for (let i = 0; i < 512 * 512; i++) rgba[i * 4 + 3] = maskPixels[i * 4 + 3]!;
    status("4 / 4 生成した服を保存中");
    ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), 512, 512), 0, 0);
    const image = await canvas.convertToBlob({ type: "image/png" });
    send({ type: "tryon-result", image, seed, duration: Math.round((performance.now() - started) / 1000) });
  } finally { for (const tensor of tensors) tensor.dispose(); }
}
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent<{ type: string; prompt: string; seed: number; cutout: boolean; reference: Blob; mask: Blob }>) => {
  queue = queue.then(async () => {
    busy = true;
    try {
      if (event.data.type === "prepare") { await prepare(); send({ type: "ready" }); }
      else if (event.data.type === "generate") await generate(event.data.prompt, event.data.seed, event.data.cutout);
      else if (event.data.type === "tryon") await renderTryOn(event.data.prompt, event.data.seed, event.data.reference, event.data.mask);
    } catch (error) {
      send({ type: "error", message: error instanceof Error ? error.message : String(error) });
    } finally { busy = false; }
  });
};
