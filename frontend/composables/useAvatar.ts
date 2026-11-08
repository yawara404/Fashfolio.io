import { ref, watch } from "vue";
import { defineStore } from "pinia";
import { defaultAvatar, mannequinTypes, resolveAvatar } from "~/data/avatarPresets";
import type { AvatarConfig, MannequinGender } from "~/types/avatar";

const MANNEQUIN_STORAGE_NAME = "fashfolio-mannequin-v1";
export const useAvatar = defineStore("avatar", () => {
  // Hydrate after mount so SSR and the first browser render use the same default.
  const config = ref<AvatarConfig>({ ...defaultAvatar });
  const lastChange = ref("");
  let hydrated = false;
  function hydrate() {
    if (hydrated || !import.meta.client) return;
    hydrated = true;
    try {
      const stored = localStorage.getItem(MANNEQUIN_STORAGE_NAME) || localStorage.getItem("fashfolio.avatar.v5");
      if (stored) config.value = resolveAvatar(JSON.parse(stored));
    } catch { /* Storage is optional. */ }
  }
  watch(config, (value) => {
    if (!import.meta.client) return;
    try { localStorage.setItem(MANNEQUIN_STORAGE_NAME, JSON.stringify({ gender: value.gender })); }
    catch { /* The fitting room remains usable without persistent storage. */ }
  }, { deep: true });
  function setGender(gender: MannequinGender) {
    if (gender !== "girl" && gender !== "boy") return;
    config.value = resolveAvatar({ gender });
    lastChange.value = `${gender === 'boy' ? '少年' : '少女'}のキャラクターに変更しました。`;
  }
  function reset() {
    config.value = { ...defaultAvatar };
    lastChange.value = "素体を初期状態に戻しました。";
  }
  return { config, mannequinTypes, lastChange, hydrate, setGender, reset, resolved: () => resolveAvatar(config.value) };
});
