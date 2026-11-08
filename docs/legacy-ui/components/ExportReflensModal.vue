<template>
  <Teleport to="body">
    <div v-if="board.isExportModalOpen" class="modal-scrim" @click.self="close">
      <section
        ref="modal"
        class="export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        tabindex="-1"
        @keydown="handleKeys"
      >
        <div class="modal-header">
          <div>
            <span class="eyebrow">CONTINUE YOUR CREATION</span>
            <h2 id="export-title">アイデアを、次のキャンバスへ。</h2>
          </div>
          <button class="icon-button" aria-label="閉じる" @click="close">
            <X :size="19" />
          </button>
        </div>
        <p class="modal-description">
          選んだ衣装と配色をひとつの資料に。データをコピーして、Reflensでの制作に持ち出せます。
        </p>
        <div class="export-summary">
          <h3>{{ payload.boardTitle }}</h3>
          <div v-if="payload.items.length" class="export-thumbnails">
            <div
              v-for="entry in board.equippedItemsList"
              :key="entry.definition.id"
              class="export-thumbnail"
            >
              <div><GarmentArtwork :item="entry.state.item!" /></div>
              {{ entry.definition.labelJa }}
            </div>
          </div>
          <p v-else class="export-empty">
            パーツを選ぶと、ここにコーデが表示されます。
          </p>
        </div>
        <div class="export-tabs">
          <div>
            <button
              class="export-tab"
              :class="{ active: tab === 'json' }"
              @click="tab = 'json'"
            >
              JSON</button
            ><button
              class="export-tab"
              :class="{ active: tab === 'markdown' }"
              @click="tab = 'markdown'"
            >
              Markdown
            </button>
          </div>
          <button class="button secondary" @click="copy()">
            <Check v-if="copied" :size="13" /><Copy v-else :size="13" />{{
              copied ? "コピーしました" : "データをコピー"
            }}
          </button>
        </div>
        <pre class="export-code">{{ exportText }}</pre>
        <p class="export-notice">
          「Reflensを開く」はJSONをコピーして別タブを開きます。ボードへの自動追加は行われません。
        </p>
        <p v-if="error" class="export-error" role="status">{{ error }}</p>
        <div class="export-footer">
          <button class="button secondary" @click="download">
            <Download :size="14" />JSONを保存</button
          ><button class="button primary" @click="launch">
            Reflensを開く<ArrowUpRight :size="15" />
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { computed, ref, watch, nextTick, onBeforeUnmount } from "vue";
import { X, Copy, Check, Download, ArrowUpRight } from "lucide-vue-next";
import { useFittingBoard } from "~/composables/useFittingBoard";
const board = useFittingBoard();
const modal = ref<HTMLElement | null>(null);
const tab = ref<"json" | "markdown">("json");
const copied = ref(false);
const error = ref("");
let previousFocus: HTMLElement | null = null;
const payload = computed(() => board.buildReflensPayload());
const json = computed(() => JSON.stringify(payload.value, null, 2));
const markdown = computed(() =>
  [
    `# ${payload.value.boardTitle}`,
    "",
    "## カラーパレット",
    ...payload.value.palette.map((s) => `- ${s.roleLabel}: ${s.hex}`),
    "",
    "## 衣装パーツ",
    ...payload.value.items.map(
      (i) =>
        `### ${i.slotLabel}\n${i.title}\n${i.sourceUrl}\n${i.artistTip || ""}`,
    ),
  ].join("\n"),
);
const exportText = computed(() =>
  tab.value === "json" ? json.value : markdown.value,
);
function close() {
  board.isExportModalOpen = false;
}
watch(
  () => board.isExportModalOpen,
  async (open) => {
    if (open) {
      previousFocus = document.activeElement as HTMLElement;
      error.value = "";
      await nextTick();
      modal.value?.focus();
    } else previousFocus?.focus();
  },
);
function handleKeys(event: KeyboardEvent) {
  if (event.key === "Escape") close();
  if (event.key !== "Tab") return;
  const focusable = Array.from(
    modal.value?.querySelectorAll<HTMLElement>(
      'button, a[href], input, [tabindex="0"]',
    ) || [],
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (
    event.shiftKey &&
    (document.activeElement === first || document.activeElement === modal.value)
  ) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
async function copy(text = exportText.value) {
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    error.value = "";
    setTimeout(() => (copied.value = false), 1800);
  } catch {
    error.value =
      "コピーできませんでした。JSONを保存するか、上のテキストを選択してコピーしてください。";
  }
}
function download() {
  const url = URL.createObjectURL(
    new Blob([json.value], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `fashfolio-${Date.now()}.reflens.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function launch() {
  window.open(
    `https://reflens.wawa-app.me/?source=fashfolio.io&title=${encodeURIComponent(payload.value.boardTitle)}`,
    "_blank",
    "noopener,noreferrer",
  );
  copy(json.value);
}
onBeforeUnmount(() => (previousFocus = null));
</script>
