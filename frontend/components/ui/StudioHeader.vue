<template>
  <header class="studio-header">
    <div class="studio-header-brand">
      <button
        class="mobile-menu-button"
        type="button"
        aria-label="画面切り替えメニューを開く"
        aria-haspopup="dialog"
        @click="mobileMenu?.showModal()"
      >
        <Menu :size="20" />
      </button>
      <NuxtLink to="/" class="studio-brand" aria-label="Fashfolio ホーム"
        ><span class="studio-brand-mark"
          ><Shirt :size="17" :stroke-width="2" /></span
        ><span class="studio-brand-name"
          >Fashfolio<span>.io</span
          ><small>Illustration outfit studio</small></span
        ></NuxtLink
      >
    </div>
    <nav class="studio-nav" aria-label="メインナビゲーション">
      <NuxtLink
        v-for="item in modes"
        :key="item.key"
        :to="item.to"
        :class="{ active: mode === item.key }"
        :aria-current="mode === item.key ? 'page' : undefined"
        ><component :is="item.icon" :size="14" /><span>{{
          item.label
        }}</span></NuxtLink
      >
    </nav>
    <div class="studio-header-actions">
      <button
        class="saved-coordinates-button"
        type="button"
        @click="$emit('open-saved')"
      >
        <FolderHeart :size="15" /><span>保存したコーデ</span
        ><small>{{ savedCount }}</small></button
      ><a
        class="reflens-link"
        href="https://reflens.wawa-app.me/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Reflens.io を別タブで開く"
        ><ScanLine :size="15" /><span>Reflens.io</span><ArrowUpRight :size="12"
      /></a>
    </div>
    <dialog
      ref="mobileMenu"
      class="studio-mobile-menu"
      aria-labelledby="studio-menu-title"
      @click="closeOnBackdrop"
    >
      <div class="mobile-menu-heading">
        <span id="studio-menu-title">スタジオを切り替える</span
        ><button
          type="button"
          aria-label="画面切り替えメニューを閉じる"
          @click="mobileMenu?.close()"
        >
          <X :size="19" />
        </button>
      </div>
      <nav aria-label="モバイルのメインナビゲーション">
        <NuxtLink
          v-for="item in modes"
          :key="item.key"
          :to="item.to"
          :class="{ active: mode === item.key }"
          :aria-current="mode === item.key ? 'page' : undefined"
          @click="mobileMenu?.close()"
          ><component :is="item.icon" :size="20" /><span
            ><strong>{{ item.label }}</strong
            ><small>{{ item.description }}</small></span
          ><Check v-if="mode === item.key" :size="15"
        /></NuxtLink>
      </nav>
    </dialog>
  </header>
</template>
<script setup lang="ts">
import { ref } from "vue";
import {
  Shirt,
  Accessibility,
  FolderHeart,
  ScanLine,
  ArrowUpRight,
  Menu,
  X,
  Check,
} from "lucide-vue-next";
defineProps<{ mode: "outfit" | "try-on"; savedCount: number }>();
defineEmits<{ "open-saved": [] }>();
const mobileMenu = ref<HTMLDialogElement | null>(null);
const modes = [
  {
    key: "outfit",
    label: "outfit",
    to: "/",
    icon: Shirt,
    description: "衣装・配色とプロンプトを組み立てる",
  },
  {
    key: "try-on",
    label: "try-on",
    to: "/try-on",
    icon: Accessibility,
    description: "アニメ素体で頭身・丈・シルエットを確認",
  },
] as const;
function closeOnBackdrop(event: MouseEvent) {
  const dialog = mobileMenu.value;
  if (!dialog || event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    dialog.close();
}
</script>
<style scoped>
.studio-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  height: 56px;
  min-height: 56px;
  padding: 0 20px;
  background: var(--paper);
  border-bottom: 1px solid var(--line);
  z-index: 40;
  flex-shrink: 0;
}
.studio-header-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  justify-self: start;
}
.studio-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}
.studio-brand-mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 11px;
  background: var(--accent);
  color: var(--accent-fg);
  flex-shrink: 0;
}
.studio-brand-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.4px;
  line-height: 1.1;
  white-space: nowrap;
}
.studio-brand-name > span {
  color: var(--accent);
}
.studio-brand-name small {
  display: block;
  font-size: 8px;
  letter-spacing: 0.2px;
  font-weight: 400;
  color: var(--muted);
  margin-top: 5px;
}
.studio-nav {
  display: grid;
  grid-template-columns: repeat(2, 112px);
  gap: 2px;
  padding: 4px;
  border-radius: 12px;
  border: 1px solid var(--line-strong);
  background: var(--raised);
  justify-self: center;
}
.studio-nav > a {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 8px;
  color: var(--ink);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  transition:
    background 0.15s,
    color 0.15s;
}
.studio-nav > a:hover {
  background: var(--hover);
  color: var(--accent);
}
.studio-nav > a.active {
  background: var(--accent);
  color: var(--accent-fg);
  box-shadow: 0 1px 2px #0002;
}
.studio-header-actions {
  display: flex;
  align-items: center;
  gap: 9px;
  justify-self: end;
  min-width: 0;
}
.saved-coordinates-button,
.reflens-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 32px;
  padding: 7px 10px;
  border: 1px solid var(--line-strong);
  border-radius: 9px;
  background: var(--raised);
  color: var(--muted);
  font-size: 10px;
  white-space: nowrap;
}
.saved-coordinates-button:hover,
.reflens-link:hover {
  background: var(--hover);
  color: var(--accent);
}
.saved-coordinates-button small {
  min-width: 16px;
  text-align: center;
  font-size: 9px;
  color: var(--ink);
  background: var(--canvas);
  border-radius: 3px;
  padding: 1px 3px;
}
.reflens-link > svg:first-child {
  color: var(--accent);
}
.mobile-menu-button {
  display: none;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  padding: 5px;
  border-radius: 7px;
}
.studio-mobile-menu {
  background: var(--paper);
  color: var(--ink);
  border: 1px solid var(--line-strong);
  border-radius: 13px;
  width: 360px;
  max-width: calc(100% - 24px);
  padding: 17px;
  box-shadow: 0 16px 48px #0005;
}
.studio-mobile-menu::backdrop {
  background: #080a10a8;
}
.mobile-menu-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--muted);
  padding: 0 0 13px;
}
.mobile-menu-heading button {
  display: grid;
  place-items: center;
  color: var(--muted);
  padding: 4px;
}
.studio-mobile-menu nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.studio-mobile-menu nav > a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--muted);
}
.studio-mobile-menu nav > a.active {
  color: var(--accent);
  background: var(--accent-soft);
  border-color: var(--line-strong);
}
.studio-mobile-menu nav > a:hover {
  background: var(--hover);
}
.studio-mobile-menu nav > a > span {
  flex: 1;
}
.studio-mobile-menu strong {
  font-size: 14px;
  font-weight: 600;
  display: block;
}
.studio-mobile-menu small {
  font-size: 10px;
  line-height: 1.8;
  margin-top: 5px;
  display: block;
  color: var(--muted);
}
@media (max-width: 1000px) {
  .studio-header-actions .reflens-link > span {
    display: none;
  }
  .studio-nav {
    grid-template-columns: repeat(2, 100px);
  }
  .studio-header {
    padding: 0 16px;
  }
}
@media (max-width: 760px) {
  .studio-header {
    display: flex;
    justify-content: space-between;
    padding: 0 12px;
    gap: 8px;
  }
  .studio-nav {
    display: none;
  }
  .mobile-menu-button {
    display: flex;
  }
  .studio-brand-name {
    font-size: 14px;
  }
  .studio-brand-name small {
    display: none;
  }
  .studio-brand-mark {
    width: 29px;
    height: 29px;
    border-radius: 9px;
  }
  .saved-coordinates-button > span,
  .reflens-link > span {
    display: none;
  }
  .saved-coordinates-button,
  .reflens-link {
    padding: 7px;
    min-height: 31px;
  }
  .studio-header-actions {
    gap: 6px;
  }
}
</style>
