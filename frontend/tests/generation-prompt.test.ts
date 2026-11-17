import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import PromptSuggestionGuide from "../components/PromptSuggestionGuide.vue";
import {
  HUMAN_FREE_GUARD,
  appendPromptToken,
  artStyleTokens,
  composeClothingPrompt,
  derivePresetTokens,
  limitPromptTokens,
  resolveArtStyleId,
  translateCoordinatePrompt,
} from "../utils/generationPrompt";
import { translateJaToEnPrompt } from "../utils/jaEnPrompt";

describe("clothing generation prompt", () => {
  it("keeps the free-form description first and always guards against people and backgrounds", () => {
    const prompt = composeClothingPrompt({
      description: "pastel spring cafe, ribbon-tie blouse, soft cotton",
      name: "春のカフェ",
      paletteColor: "dusty pink",
      artStyle: "preset",
    });
    expect(prompt.startsWith("pastel spring cafe, ribbon-tie blouse, soft cotton")).toBe(true);
    expect(prompt).toContain("no humans");
    expect(prompt).toContain("no person");
    expect(prompt).toContain("plain white background");
    expect(prompt).toContain("no scenery");
    expect(prompt).toContain("single garment");
    expect(prompt.endsWith(HUMAN_FREE_GUARD)).toBe(true);
  });

  it("derives English theme tokens from a Japanese coordinate name", () => {
    expect(derivePresetTokens("春のカフェ")).toContain("spring");
    expect(derivePresetTokens("春のカフェ")).toContain("cafe");
    expect(derivePresetTokens("夏の海コーデ")).toContain("summer marine");
    expect(derivePresetTokens("モノトーン")).toContain("monochrome palette");
  });

  it("keeps complete tags when trimming a long Ollama translation", () => {
    const limited = limitPromptTokens(
      "spring, cafe, girly, coordinate, ribbon-tie blouse, puff sleeves, soft cotton",
      42,
    );
    expect(limited).toBe("spring, cafe, girly, coordinate");
    expect(limited.length).toBeLessThanOrEqual(42);
    expect(limitPromptTokens("black, pleated skirt", 160)).toBe("black, pleated skirt");
  });

  it("translates a whole Japanese coordinate into English prompt tags", () => {
    expect(translateCoordinatePrompt("春のカフェのガーリーコーデ")).toBe(
      "spring, cafe, girly, coordinate",
    );
    expect(translateCoordinatePrompt("黒のプリーツスカート")).toBe(
      "black, pleated skirt",
    );
    expect(translateCoordinatePrompt("白いパフスリーブのブラウス")).toBe(
      "white, puff sleeves, blouse",
    );
    expect(translateCoordinatePrompt("大きめリボンのシフォンワンピース")).toContain(
      "oversized",
    );
    expect(translateCoordinatePrompt("pastel pink, ribbon tie")).toBe(
      "pastel pink, ribbon tie",
    );
    const unknown = translateJaToEnPrompt("春の謎素材コーデ");
    expect(unknown.text).toContain("spring");
    expect(unknown.untranslated.join("")).toContain("謎素材");
  });

  it("includes coordinate-derived tags in the composed prompt", () => {
    const prompt = composeClothingPrompt({
      description: "ribbon-tie blouse",
      name: "春のカフェのガーリーコーデ",
      artStyle: "simple",
    });
    expect(prompt).toContain("spring");
    expect(prompt).toContain("cafe");
    expect(prompt).toContain("girly");
    expect(prompt.endsWith(HUMAN_FREE_GUARD)).toBe(true);
  });

  it("picks a preset-like art style automatically from the coordinate name", () => {
    expect(resolveArtStyleId("auto", "水彩のワンピース")).toBe("watercolor");
    expect(resolveArtStyleId("auto", "レトロ少女漫画コーデ")).toBe("retro");
    expect(resolveArtStyleId("auto", "春のカフェ")).toBe("simple");
    expect(resolveArtStyleId("auto", "シンプルなワンピース")).toBe("simple");
    expect(
      resolveArtStyleId(
        "auto",
        "simple illustration, clean lineart, flat colors, minimal shading",
      ),
    ).toBe("simple");
    expect(
      resolveArtStyleId("auto", "modern flat illustration, geometric shapes"),
    ).toBe("flat");
    expect(artStyleTokens("watercolor")).toContain("watercolor");
    expect(artStyleTokens("auto", "春のカフェ")).toContain("simple illustration");
  });

  it("appends suggestion tokens without duplicates", () => {
    expect(appendPromptToken("puff sleeves", "ribbon tie")).toBe("puff sleeves, ribbon tie");
    expect(appendPromptToken("puff sleeves, ribbon tie", "ribbon tie")).toBe("puff sleeves, ribbon tie");
    expect(
      appendPromptToken(
        "simple illustration, clean lineart",
        "simple illustration, clean lineart, flat colors",
      ),
    ).toBe("simple illustration, clean lineart, flat colors");
  });

  it("renders Japanese suggestion chips that emit their English token", async () => {
    const wrapper = mount(PromptSuggestionGuide);
    const simple = wrapper
      .findAll("button")
      .find((button) => button.text().includes("シンプル"));
    expect(simple).toBeDefined();
    expect(simple!.classes()).toContain("recommended");
    const ribbon = wrapper
      .findAll("button")
      .find((button) => button.text().includes("リボン"));
    expect(ribbon).toBeDefined();
    await ribbon!.trigger("click");
    expect(wrapper.emitted("pick")?.[0]).toEqual(["ribbon tie"]);
    wrapper.unmount();
  });
});
