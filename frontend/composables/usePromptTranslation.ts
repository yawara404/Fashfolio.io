import { ref } from "vue";
import { translateJaToEnPrompt, type JaEnTranslation } from "~/utils/jaEnPrompt";

export interface OllamaPromptTranslation {
  positive: string;
  untranslated: string[];
  engine: "ollama" | "unavailable";
  model: string | null;
  notice: string | null;
}

const CACHE_LIMIT = 80;
const cache = new Map<string, OllamaPromptTranslation>();

function rememberTranslation(key: string, value: OllamaPromptTranslation) {
  cache.set(key, value);
  if (cache.size <= CACHE_LIMIT) return;
  const oldest = cache.keys().next().value;
  if (oldest) cache.delete(oldest);
}

export function clearPromptTranslationCache() {
  cache.clear();
}

/**
 * Translate a Japanese coordinate with Ollama, while showing the local
 * dictionary result immediately. If Ollama is unavailable the local result
 * stays in place, so the input never blocks on the model.
 */
export function usePromptTranslation() {
  const engine = ref<"idle" | "dictionary" | "ollama">("idle");
  const loading = ref(false);
  const notice = ref("");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let requestId = 0;

  function cancel() {
    if (timer) clearTimeout(timer);
    timer = undefined;
    controller?.abort();
    controller = undefined;
    loading.value = false;
    requestId += 1;
  }

  function reset() {
    cancel();
    engine.value = "idle";
    notice.value = "";
  }

  async function translate(
    text: string,
    options: {
      enabled: boolean;
      onLocal: (result: JaEnTranslation) => void;
      onOllama: (result: OllamaPromptTranslation) => void;
      delay?: number;
    },
  ) {
    const value = text.trim();
    cancel();
    notice.value = "";
    const local = translateJaToEnPrompt(value);
    options.onLocal(local);
    if (!value) {
      engine.value = "idle";
      return;
    }

    engine.value = "dictionary";
    if (!options.enabled) return;

    const cached = cache.get(value);
    if (cached) {
      options.onOllama(cached);
      engine.value = "ollama";
      return;
    }

    const id = requestId;
    loading.value = true;
    timer = setTimeout(async () => {
      controller = new AbortController();
      try {
        const response = await $fetch<OllamaPromptTranslation>(
          "/api/translate-prompt",
          {
            method: "POST",
            body: { text: value },
            signal: controller.signal,
            timeout: 95000,
          },
        );
        if (id !== requestId) return;
        if (response.engine === "ollama" && response.positive.trim()) {
          rememberTranslation(value, response);
          options.onOllama(response);
          engine.value = "ollama";
          notice.value = "";
        } else {
          engine.value = "dictionary";
          notice.value = response.notice || "";
        }
      } catch {
        // Keep the local dictionary preview and expose the failure via the badge tooltip.
        if (id === requestId) {
          engine.value = "dictionary";
          notice.value = "Ollamaでの英訳に失敗したため、辞書で表示しています。";
        }
      } finally {
        if (id === requestId) loading.value = false;
      }
    }, options.delay ?? 900);
  }

  return { engine, loading, notice, translate, cancel, reset };
}
