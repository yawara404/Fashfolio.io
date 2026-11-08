import { describe, expect, it } from "vitest";
import catalogJSON from "../data/wardrobe.json";
import { defaultAvatar } from "../data/avatarPresets";
import type { Catalog } from "../types/wardrobe";
import { illustrationFilename, illustrationPrompt } from "../utils/illustration";

const catalog = catalogJSON as Catalog;
const avatar = {
  ...defaultAvatar,
  preset: "ink",
  hair: "long" as const,
  hairColor: "#2F2B3A",
  skin: "#EFCBBA",
  eye: "#5D6F92",
  eyeShape: "tsuri" as const,
  browShape: "sharp" as const,
};

describe("on-device illustration composition", () => {
  it("builds an SD-style prompt from the selected dress-up pieces", () => {
    const items = catalog.items.slice(0, 3);
    const prompt = illustrationPrompt(items, catalog.palettes[0]!.colors, avatar);
    expect(prompt.positive).toContain("anime dress-up game character");
    expect(prompt.positive).toContain("long hair");
    for (const item of items) expect(prompt.positive).toContain(item.name_en);
    expect(prompt.positive).toContain("cel shading");
    expect(prompt.negative).toContain("bad anatomy");
  });

  it("makes a filesystem-safe PNG name without a server round trip", () => {
    expect(
      illustrationFilename("春の コーデ", new Date("2026-01-02T00:00:00Z")),
    ).toBe("fashfolio-春の-コーデ-20260102.png");
    expect(illustrationFilename("", new Date("2026-01-02T00:00:00Z"))).toBe(
      "fashfolio-coordinate-20260102.png",
    );
  });
});
