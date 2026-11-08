import { copyFile, mkdir } from 'node:fs/promises';
const root = new URL('../frontend/', import.meta.url);
await mkdir(new URL('public/ort/', root), { recursive: true });
for (const file of ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm', 'ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']) {
  await copyFile(new URL(`node_modules/onnxruntime-web/dist/${file}`, root), new URL(`public/ort/${file}`, root));
}
