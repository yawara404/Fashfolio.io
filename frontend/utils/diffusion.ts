/** SD-Turbo's single Euler step, following Microsoft's ONNX WebGPU example. */
export const SIGMA = 14.6146;
export const VAE_SCALE = 0.18215;
export function latentNoise(seed: number, size = 4 * 64 * 64) {
  let state = seed >>> 0 || 1;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) + 1) / 4294967297;
  };
  return Float32Array.from({ length: size }, () =>
    Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random()) * SIGMA,
  );
}
export function scaleLatents(data: Float32Array) {
  return data.map((v) => v / Math.sqrt(SIGMA * SIGMA + 1));
}
export function eulerStep(noise: Float32Array, prediction: Float32Array) {
  if (noise.length !== prediction.length) throw new Error("Latent shape mismatch");
  return noise.map((v, i) => (v - SIGMA * prediction[i]!) / VAE_SCALE);
}
export function decodePixels(data: Float32Array, width = 512, height = 512) {
  const size = width * height;
  const rgba = new Uint8ClampedArray(size * 4);
  for (let i = 0; i < size; i++) {
    for (let c = 0; c < 3; c++)
      rgba[i * 4 + c] = Math.round(Math.max(0, Math.min(1, data[c * size + i]! / 2 + 0.5)) * 255);
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

/** Remove only near-white pixels connected to the border. White fabric stays opaque. */
export function removeWhiteBackdrop(input: Uint8ClampedArray, width: number, height: number, threshold = 238) {
  const pixels = new Uint8ClampedArray(input);
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let start = 0, end = 0;
  function visit(index: number) {
    if (visited[index]) return;
    visited[index] = 1;
    const p = index * 4;
    const r = pixels[p]!, g = pixels[p + 1]!, b = pixels[p + 2]!;
    if (Math.min(r, g, b) < threshold || Math.max(r, g, b) - Math.min(r, g, b) > 20) return;
    pixels[p + 3] = 0;
    queue[end++] = index;
  }
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
  while (start < end) {
    const i = queue[start++]!, x = i % width;
    if (x > 0) visit(i - 1);
    if (x < width - 1) visit(i + 1);
    if (i >= width) visit(i - width);
    if (i < width * (height - 1)) visit(i + width);
  }
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (pixels[(y * width + x) * 4 + 3]! > 0) {
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  }
  if (right < left) throw new Error("衣装の輪郭が見つかりませんでした。説明を変えて再生成してください。");
  return { pixels, crop: { x: left, y: top, width: right - left + 1, height: bottom - top + 1 } };
}
