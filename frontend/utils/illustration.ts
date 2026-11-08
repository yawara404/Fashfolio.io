import type { AvatarConfig } from "~/types/avatar";
import type { Garment } from "~/types/wardrobe";

/**
 * Compose an SD-style prompt for the current dress-up illustration.
 * SD-Turbo itself does not use a negative prompt, but the same tokens are
 * useful when the illustration is refined in another local diffusion tool.
 */
export function illustrationPrompt(
  items: Garment[],
  palette: string[],
  avatar: AvatarConfig,
) {
  const garments = items.map(
    (item) => `${item.name_en} (${item.material_en})`,
  );
  const hairToken =
    {
      bob: "bob hair",
      long: "long hair",
      twin: "twintails",
      pony: "ponytail",
      short: "short hair",
      mush: "mushroom hair",
    }[avatar.hair] || "long hair";
  const positive = [
    "1girl, solo, anime dress-up game character, full body, front view",
    hairToken,
    `hair color ${avatar.hairColor}`,
    `skin tone ${avatar.skin}`,
    `eyes ${avatar.eye}`,
    ...garments,
    `color palette ${palette.join(", ")}`,
    "cel shading, crisp lineart, soft pastel lighting, clean white background, high quality illustration",
  ].join(", ");
  const negative = [
    "lowres",
    "bad anatomy",
    "extra limbs",
    "text",
    "watermark",
    "blurry",
    "photorealistic",
  ].join(", ");
  return { positive, negative };
}

/** A stable, filesystem-safe name for the on-device PNG export. */
export function illustrationFilename(title: string, now = new Date()) {
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const safe = (title.trim() || "coordinate")
    .replace(/[\\/:*?"<>|\s]+/g, "-")
    .slice(0, 40);
  return `fashfolio-${safe}-${stamp}.png`;
}
