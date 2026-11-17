import { VAE_SCALE, SIGMA } from "~/utils/diffusion";

/** The pinned SD-Turbo Euler trailing schedule (scaled-linear training betas). */
export function imageSchedule(steps = 4, strength = .55) {
  if (!Number.isInteger(steps) || steps < 1 || steps > 8 || strength <= 0 || strength > 1) throw new Error("Invalid img2img schedule");
  let product = 1;
  const sigmas = Array.from({ length: 1000 }, (_, i) => {
    const beta = (Math.sqrt(.00085) + (Math.sqrt(.012) - Math.sqrt(.00085)) * i / 999) ** 2;
    product *= 1 - beta;
    return Math.sqrt((1 - product) / product);
  });
  const start = steps - Math.max(1, Math.floor(steps * strength));
  const timesteps = Array.from({ length: steps }, (_, i) => Math.round(1000 - i * 1000 / steps) - 1).slice(start);
  return timesteps.map((time, i) => ({ time, sigma: sigmas[time]!, next: i === timesteps.length - 1 ? 0 : sigmas[timesteps[i + 1]!]! }));
}
export function imageLatents(encoded: Float32Array, noise: Float32Array, sigma: number) {
  if (encoded.length !== noise.length) throw new Error("Latent shape mismatch");
  return encoded.map((v, i) => v * VAE_SCALE + noise[i]! / SIGMA * sigma);
}
export function imageEulerStep(latents: Float32Array, prediction: Float32Array, sigma: number, next: number) {
  if (latents.length !== prediction.length) throw new Error("Latent shape mismatch");
  return latents.map((v, i) => v + prediction[i]! * (next - sigma));
}
export function imageTensor(pixels: Uint8ClampedArray, width = 512, height = 512) {
  const n = width * height, tensor = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) tensor[c * n + i] = pixels[i * 4 + c]! / 127.5 - 1;
  return tensor;
}
/** ONNX's pinned encoder uses float16 IO; typed-array bits are explicit. */
export function toFloat16(input: Float32Array) {
  const f = new Float32Array(1), bits = new Uint32Array(f.buffer);
  return Uint16Array.from(input, value => {
    f[0] = value; const x = bits[0]!, sign = (x >>> 16) & 0x8000, exponent = ((x >>> 23) & 255) - 112, mantissa = x & 0x7fffff;
    if (exponent >= 31) return sign | 0x7c00 | (mantissa ? 0x200 : 0);
    if (exponent <= 0) return exponent < -10 ? sign : sign | ((mantissa | 0x800000) + (1 << (13 - exponent)) >>> (14 - exponent));
    return sign | ((exponent << 10) + ((mantissa + 0x1000) >>> 13));
  });
}
export function fromFloat16(input: Uint16Array) {
  return Float32Array.from(input, value => {
    const sign = value & 0x8000 ? -1 : 1, exponent = value >>> 10 & 31, mantissa = value & 1023;
    return exponent === 0 ? sign * mantissa * 2 ** -24 : exponent === 31 ? mantissa ? NaN : sign * Infinity : sign * (1 + mantissa / 1024) * 2 ** (exponent - 15);
  });
}
