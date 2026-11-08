<template>
  <section class="fitting-studio" aria-label="コーディネートボード">
    <div class="canvas-toolbar">
      <div class="canvas-label">
        <span class="eyebrow">COORDINATE BOARD</span
        ><span class="count-badge">{{ board.equippedCount }} / 5</span>
      </div>
      <div class="canvas-tools">
        <button
          class="icon-button"
          title="保存したコーデ"
          aria-label="保存したコーデを表示"
          :aria-expanded="showSaved"
          @click="showSaved = !showSaved"
        >
          <FolderHeart :size="17" /></button
        ><button
          class="icon-button"
          title="ロックしていない衣装をリセット"
          aria-label="衣装をリセット"
          @click="board.clearUnlockedSlots()"
        >
          <RotateCcw :size="16" />
        </button>
      </div>
    </div>
    <div v-if="showSaved" class="saved-popover">
      <div class="panel-heading">
        保存したコーデ<button
          class="icon-button"
          aria-label="保存一覧を閉じる"
          @click="showSaved = false"
        >
          <X :size="15" />
        </button>
      </div>
      <p v-if="!board.savedCoordinations.length" class="muted">
        まだ保存したコーデはありません。
      </p>
      <div
        v-for="saved in board.savedCoordinations"
        :key="saved.id"
        class="saved-row"
      >
        <button @click="loadSaved(saved)">{{ saved.name }}</button
        ><button
          class="icon-button"
          aria-label="保存を削除"
          @click="board.deleteSavedCoordination(saved.id)"
        >
          <X :size="13" />
        </button>
      </div>
    </div>
    <div class="canvas-heading">
      <div class="board-title-field">
        <input
          v-model="board.boardTitle"
          aria-label="コーデ名"
          maxlength="80"
          placeholder="コーデに名前をつける"
        /><PencilLine :size="13" />
      </div>
      <p>好きなパーツを重ねて、アイデアをひとつに。</p>
    </div>
    <div class="theme-presets" aria-label="コーデのスタイル">
      <span>スタイルからつくる</span
      ><button
        v-for="theme in themes"
        :key="theme.id"
        :class="{ active: board.activeStyleId === theme.id }"
        :disabled="randomizing"
        @click="applyTheme(theme.id, theme.title)"
      >
        {{ theme.label }}
      </button>
    </div>
    <div class="outfit-board">
      <span class="board-edition">FASHFOLIO / LOOK 001</span>
      <div class="outfit-collage">
        <div
          v-for="slot in SLOT_DEFINITIONS"
          :key="slot.id"
          class="outfit-slot"
          :class="[
            slot.id,
            {
              selected: board.activeSlot === slot.id,
              'drag-over': dragOver === slot.id,
            },
          ]"
          @dragover.prevent="dragOver = slot.id"
          @dragleave="dragOver = null"
          @drop.prevent="onDrop(slot.id, $event)"
        >
          <button
            class="slot-select"
            :aria-label="`${slot.labelJa}を選ぶ`"
            :aria-pressed="board.activeSlot === slot.id"
            @click="selectSlot(slot.id)"
          >
            <span class="slot-number">0{{ slot.step }}</span
            ><GarmentArtwork
              v-if="board.slots[slot.id].item"
              :key="board.slots[slot.id].item!.id"
              :item="board.slots[slot.id].item!"
            /><span v-else class="slot-empty"
              ><Plus :size="25" :stroke-width="1" /><span
                >{{ slot.labelJa }}を選ぶ</span
              ></span
            ><span class="slot-caption"
              >{{ slot.labelJa
              }}<Check v-if="board.slots[slot.id].item" :size="12"
            /></span>
          </button>
          <button
            class="slot-lock"
            :class="{ locked: board.slots[slot.id].locked }"
            :aria-label="`${slot.labelJa}のロック${board.slots[slot.id].locked ? 'を解除' : ''}`"
            :aria-pressed="board.slots[slot.id].locked"
            @click="board.toggleLock(slot.id)"
          >
            <Lock v-if="board.slots[slot.id].locked" :size="12" /><Unlock
              v-else
              :size="12"
            />
          </button>
        </div>
      </div>
      <div class="board-bottomline">
        <span>YOUR NEXT CHARACTER STARTS HERE.</span
        ><span>{{
          board.activeStylePreset?.label || "Original coordinate"
        }}</span>
      </div>
    </div>
    <div class="canvas-action-row">
      <span class="canvas-hint"
        ><MousePointer2 :size="13" />パーツをクリックして着せ替え</span
      ><button
        class="button random-button"
        :disabled="randomizing"
        @click="randomize"
      >
        <Dices :size="16" :class="{ spinning: randomizing }" />{{
          randomizing ? "組み合わせ中…" : "おまかせコーデ"
        }}
      </button>
    </div>
    <ColorPaletteBar />
    <div class="artist-tip">
      <Lightbulb :size="15" />
      <p>
        {{
          activeTip ||
          "気に入ったパーツをロックすると、そのアイテムを残して組み合わせを試せます。"
        }}
      </p>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import {
  FolderHeart,
  RotateCcw,
  X,
  PencilLine,
  Plus,
  Check,
  Lock,
  Unlock,
  Dices,
  MousePointer2,
  Lightbulb,
} from "lucide-vue-next";
import {
  SLOT_DEFINITIONS,
  type CostumeItem,
  type SlotCategory,
  type SavedCoordination,
} from "~/types/costume";
import { useFittingBoard } from "~/composables/useFittingBoard";
import { useCostumeSearch } from "~/composables/useCostumeSearch";
const board = useFittingBoard();
const search = useCostumeSearch();
const showSaved = ref(false);
const randomizing = ref(false);
const dragOver = ref<SlotCategory | null>(null);
const themes = [
  { id: "jirai-kei", label: "地雷系", title: "地雷系コーデ" },
  { id: "techwear", label: "Techwear", title: "テックウェアコーデ" },
  { id: "y2k", label: "Y2K", title: "Y2Kストリート" },
  { id: "ivy-preppy", label: "Preppy", title: "学院プレッピー" },
  { id: "wa-modern", label: "和モダン", title: "和モダンコーデ" },
];
const activeTip = computed(() =>
  board.activeSlot !== "all"
    ? board.slots[board.activeSlot].item?.artistTip
    : "",
);
function selectSlot(slot: SlotCategory) {
  board.activeSlot = slot;
  search.applyCategoryFilter(slot);
}
function loadSaved(saved: SavedCoordination) {
  board.loadCoordination(saved);
  search.selectedStyleId.value = saved.styleId;
  search.fetchCostumes(true);
  showSaved.value = false;
}
async function randomize() {
  randomizing.value = true;
  try {
    board.randomizeFromPool(await search.fetchFullPoolForRandomize());
  } finally {
    randomizing.value = false;
  }
}
async function applyTheme(id: string, title: string) {
  board.activeStyleId = id;
  board.boardTitle = title;
  search.selectedStyleId.value = id;
  search.selectedQuickTag.value = "";
  search.searchQuery.value = "";
  await Promise.all([search.fetchCostumes(true), randomize()]);
}
function onDrop(slot: SlotCategory, event: DragEvent) {
  dragOver.value = null;
  try {
    const item = JSON.parse(
      event.dataTransfer?.getData("application/json") || "",
    ) as CostumeItem;
    if (item?.id && item.category === slot) board.equipItem(item, slot);
  } catch {}
}
</script>
