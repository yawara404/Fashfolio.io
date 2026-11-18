import { hasCachedModel } from "./modelCache";

export const DIFFUSION_MODEL_URL = "https://huggingface.co/schmuell/sd-turbo-ort-web/resolve/ace89b7d2cd849f9a73914cdbb8a3ea60c853dd1";
export const DIFFUSION_TOKENIZER_URL = "https://huggingface.co/Xenova/clip-vit-base-patch16/resolve/342fdf2f67aded64d138ff074745fb4a5d2bba5f";

export const DIFFUSION_MODEL_FILES = [
  { key: "text", path: "text_encoder/model.onnx", size: 681393168, dimensions: { batch_size: 1 } },
  { key: "unet", path: "unet/model.onnx", size: 1733430199, dimensions: { batch_size: 1, num_channels: 4, height: 64, width: 64, sequence_length: 77 } },
  { key: "vae", path: "vae_decoder/model.onnx", size: 99094314, dimensions: { batch_size: 1, num_channels_latent: 4, height_latent: 64, width_latent: 64 } },
] as const;

export const DIFFUSION_ENCODER_FILE = {
  key: "encoder",
  path: "vae_encoder/model.onnx",
  size: 68430468,
} as const;

/**
 * The generation pipeline cannot start without these weights. The tokenizer is
 * intentionally excluded because it is tiny and can be fetched again when
 * Cache Storage is unavailable.
 */
export async function hasCachedDiffusionModel(): Promise<boolean> {
  for (const file of DIFFUSION_MODEL_FILES) {
    if (!(await hasCachedModel(`${DIFFUSION_MODEL_URL}/${file.path}`, file.size))) {
      return false;
    }
  }
  return true;
}
