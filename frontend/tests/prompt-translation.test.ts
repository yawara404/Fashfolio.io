import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPromptTranslationCache,
  usePromptTranslation,
  type OllamaPromptTranslation,
} from "../composables/usePromptTranslation";

describe("Ollama prompt translation", () => {
  beforeEach(() => {
    clearPromptTranslationCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearPromptTranslationCache();
  });

  it("replaces the instant dictionary preview with an Ollama translation", async () => {
    const response: OllamaPromptTranslation = {
      positive: "spring, cafe, girly, coordinate",
      untranslated: [],
      engine: "ollama",
      model: "gemma3:4b",
      notice: null,
    };
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("$fetch", fetchMock);

    const translator = usePromptTranslation();
    const localResults: string[] = [];
    const ollamaResults: OllamaPromptTranslation[] = [];
    await translator.translate("春のカフェのガーリーコーデ", {
      enabled: true,
      delay: 0,
      onLocal: (result) => localResults.push(result.text),
      onOllama: (result) => ollamaResults.push(result),
    });

    expect(localResults[0]).toContain("spring");
    await vi.waitFor(() => expect(ollamaResults).toHaveLength(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/translate-prompt",
      expect.objectContaining({
        method: "POST",
        body: { text: "春のカフェのガーリーコーデ" },
      }),
    );
    expect(translator.engine.value).toBe("ollama");
    expect(translator.loading.value).toBe(false);
  });

  it("keeps the dictionary result when Ollama is offline", async () => {
    vi.stubGlobal("$fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const translator = usePromptTranslation();
    const ollamaResults: OllamaPromptTranslation[] = [];
    await translator.translate("春のカフェ", {
      enabled: true,
      delay: 0,
      onLocal: () => {},
      onOllama: (result) => ollamaResults.push(result),
    });

    await vi.waitFor(() => expect(translator.loading.value).toBe(false));
    expect(ollamaResults).toHaveLength(0);
    expect(translator.engine.value).toBe("dictionary");
  });

  it("does not call Ollama when the integration is not ready and caches successful results", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      positive: "black, pleated skirt",
      untranslated: [],
      engine: "ollama",
      model: "gemma3:4b",
      notice: null,
    } satisfies OllamaPromptTranslation);
    vi.stubGlobal("$fetch", fetchMock);

    const translator = usePromptTranslation();
    await translator.translate("黒のプリーツスカート", {
      enabled: false,
      delay: 0,
      onLocal: () => {},
      onOllama: () => {},
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(translator.engine.value).toBe("dictionary");

    const results: OllamaPromptTranslation[] = [];
    await translator.translate("黒のプリーツスカート", {
      enabled: true,
      delay: 0,
      onLocal: () => {},
      onOllama: (result) => results.push(result),
    });
    await vi.waitFor(() => expect(results).toHaveLength(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const cached: OllamaPromptTranslation[] = [];
    await translator.translate("黒のプリーツスカート", {
      enabled: true,
      delay: 0,
      onLocal: () => {},
      onOllama: (result) => cached.push(result),
    });
    expect(cached).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(translator.engine.value).toBe("ollama");
  });
});
