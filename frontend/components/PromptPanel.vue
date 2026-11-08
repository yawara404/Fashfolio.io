<template>
  <aside class="prompt-panel">
    <div class="section-heading">
      <div>
        <span class="eyebrow">03 / MAKE IT YOURS</span>
        <h2>言葉に、まとめる。</h2>
      </div>
      <span class="output-icon"
        ><FileText :size="21" :stroke-width="1.4"
      /></span>
    </div>
    <p class="panel-intro">
      選んだパーツと配色から、作画設定文と<br />AIに使えるプロンプトをつくります。
    </p>
    <label class="field-label" for="drawing-notes"
      >作画メモ <span>任意</span></label
    ><textarea
      id="drawing-notes"
      v-model="wardrobe.notes"
      rows="3"
      maxlength="1000"
      placeholder="例：袖はふんわり、金具は控えめに。"
      class="notes-input"
    />
    <div class="generate-actions">
      <button
        class="button primary"
        :disabled="wardrobe.generating || !wardrobe.selectedItems.length"
        @click="wardrobe.generate(false)"
      >
        <LoaderCircle
          v-if="wardrobe.generating"
          class="spin"
          :size="15"
        /><WandSparkles v-else :size="15" />{{
          wardrobe.generating ? "生成しています…" : "プロンプトを生成"
        }}</button
      ><button
        class="button secondary ai-refine"
        :disabled="wardrobe.generating || !wardrobe.selectedItems.length"
        title="Ollamaで選択した衣装の説明を整える"
        @click="wardrobe.generate(true)"
      >
        <Sparkles :size="14" />AIで整える
      </button>
    </div>
    <div class="output-heading">
      <span class="eyebrow">YOUR PROMPT</span
      ><span v-if="wardrobe.resultIsStale" class="dirty-label"
        ><Circle :size="6" fill="currentColor" />変更あり・再生成できます</span
      ><span v-else-if="wardrobe.result" class="generated-label"
        ><Check :size="11" />生成済み</span
      >
    </div>
    <div class="output-tabs" role="tablist" aria-label="出力形式">
      <button
        v-for="t in tabs"
        :id="`tab-${t.id}`"
        :key="t.id"
        role="tab"
        :aria-selected="tab === t.id"
        :tabindex="tab === t.id ? 0 : -1"
        :aria-controls="`output-${t.id}`"
        :class="{ active: tab === t.id }"
        @click="tab = t.id"
        @keydown="navigateTabs($event, t.id)"
      >
        {{ t.label
        }}<span v-if="t.id === 'links' && wardrobe.result">{{
          wardrobe.result.references.length
        }}</span>
      </button>
    </div>
    <div
      :id="`output-${tab}`"
      class="output-content"
      role="tabpanel"
      :aria-labelledby="`tab-${tab}`"
      tabindex="0"
      :aria-busy="wardrobe.generating"
    >
      <template v-if="wardrobe.result"
        ><div v-if="tab === 'links'" class="output-links">
          <div v-for="link in wardrobe.result.references" :key="link.item_id">
            <strong>{{ link.label }}</strong>
            <div>
              <a :href="link.danbooru" target="_blank" rel="noopener noreferrer"
                >Danbooru<ArrowUpRight :size="11" /></a
              ><a
                :href="link.pinterest"
                target="_blank"
                rel="noopener noreferrer"
                >Pinterest<ArrowUpRight :size="11"
              /></a>
            </div>
          </div>
        </div>
        <template v-else
          ><div class="output-format-label">
            {{
              tab === "brief"
                ? "ILLUSTRATION BRIEF / JA"
                : tab === "positive"
                  ? "POSITIVE PROMPT / EN"
                  : "NEGATIVE PROMPT / EN"
            }}
          </div>
          <p class="prompt-text" :class="{ english: tab !== 'brief' }">
            {{ text }}
          </p></template
        ></template
      >
      <div v-else class="output-empty">
        <TextCursorInput :size="27" :stroke-width="1" />
        <p>衣装を選んで、<br />最初のプロンプトをつくろう。</p>
      </div>
    </div>
    <p v-if="wardrobe.result?.notice" class="output-notice" role="status">
      {{ wardrobe.result.notice }}
    </p>
    <div class="output-meta">
      <span>{{
        wardrobe.result?.engine === "ollama"
          ? `Ollama · ${wardrobe.result.model}`
          : "選択内容から生成 · ローカル処理"
      }}</span
      ><span>{{ wardrobe.result?.tags.length || 0 }} tags</span>
    </div>
    <button
      class="button copy-button"
      :disabled="!wardrobe.result || wardrobe.generating"
      @click="copy"
    >
      <Check v-if="copied" :size="15" /><Copy v-else :size="15" />{{
        copied
          ? "コピーしました"
          : tab === "links"
            ? "資料リンクをコピー"
            : "この内容をコピー"
      }}
    </button>
    <div class="export-actions">
      <button
        :disabled="!wardrobe.result || wardrobe.resultIsStale"
        @click="download('md')"
      >
        <Download :size="13" />まとめて保存 <span>.md</span></button
      ><button
        :disabled="!wardrobe.result || wardrobe.resultIsStale"
        @click="download('json')"
      >
        <Braces :size="13" />JSON
      </button>
    </div>
    <p v-if="wardrobe.resultIsStale" class="export-hint">
      最新の選択内容を保存するには再生成してください。
    </p>
    <div class="next-canvas">
      <span class="next-canvas-icon"><ScanLine :size="19" /></span>
      <div>
        <strong>資料を並べて、もっと考える。</strong
        ><a
          href="https://reflens.wawa-app.me/"
          target="_blank"
          rel="noopener noreferrer"
          >Reflens.io を開く<ArrowUpRight :size="12"
        /></a>
      </div>
    </div>
  </aside>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import {
  FileText,
  LoaderCircle,
  WandSparkles,
  Sparkles,
  Circle,
  Check,
  ArrowUpRight,
  TextCursorInput,
  Copy,
  Download,
  Braces,
  ScanLine,
} from "lucide-vue-next";
import { useWardrobe } from "~/composables/useWardrobe";
const wardrobe = useWardrobe();
type Tab = "brief" | "positive" | "negative" | "links";
const tab = ref<Tab>("brief");
const copied = ref(false);
const tabs: { id: Tab; label: string }[] = [
  { id: "brief", label: "作画設定文" },
  { id: "positive", label: "Prompt" },
  { id: "negative", label: "Negative" },
  { id: "links", label: "資料" },
];
const text = computed(() => {
  const r = wardrobe.result;
  if (!r) return "";
  if (tab.value === "brief") return r.brief_ja;
  if (tab.value === "positive") return r.positive;
  if (tab.value === "negative") return r.negative;
  return r.references
    .map(
      (l) => `${l.label}\nDanbooru: ${l.danbooru}\nPinterest: ${l.pinterest}`,
    )
    .join("\n\n");
});
function navigateTabs(event: KeyboardEvent, current: Tab) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const index = tabs.findIndex((t) => t.id === current);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
          tabs.length;
  tab.value = tabs[next]!.id;
  document.getElementById(`tab-${tab.value}`)?.focus();
}
async function copy() {
  try {
    await navigator.clipboard.writeText(text.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1600);
  } catch {
    wardrobe.notify(
      "コピーできませんでした。テキストを選択するか、ファイルで保存してください。",
    );
  }
}
function download(format: "md" | "json") {
  const r = wardrobe.result;
  if (!r || wardrobe.resultIsStale) return;
  const markdown = [
    `# ${wardrobe.title}`,
    "",
    "## 作画設定文",
    r.brief_ja,
    "",
    "## Positive prompt",
    r.positive,
    "",
    "## Negative prompt",
    r.negative,
    "",
    "## Palette",
    r.palette.join(" / "),
    "",
    "## 資料リンク",
    ...r.references.map(
      (l) =>
        `### ${l.label}\n- [Danbooru](${l.danbooru})\n- [Pinterest](${l.pinterest})`,
    ),
  ].join("\n");
  const content =
    format === "json"
      ? JSON.stringify(
          {
            version: "2.0",
            source: "fashfolio",
            title: wardrobe.title,
            style: wardrobe.style,
            item_ids: wardrobe.selectedItems.map((item) => item.id),
            notes: wardrobe.notes,
            ...r,
          },
          null,
          2,
        )
      : markdown;
  const url = URL.createObjectURL(
    new Blob([content], {
      type:
        format === "json" ? "application/json" : "text/markdown;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `fashfolio-${Date.now()}.${format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
</script>
