import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import { defaultAvatar, mannequinTypes, resolveAvatar } from "~/data/avatarPresets";
import type { AvatarConfig, MannequinGender } from "~/types/avatar";
import { resolveStudioPose, studioPoses } from "~/data/studioPoses";

const MANNEQUIN_STORAGE_NAME = "fashfolio-mannequin-v1";
export const useAvatar = defineStore("avatar", () => {
  // Hydrate after mount so SSR and the first browser render use the same default.
  const config = ref<AvatarConfig>({ ...defaultAvatar });
  const lastChange = ref("");
  const browsingPoses = ref(false);
  const pose = computed(() => resolveStudioPose(config.value.pose));
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
    try { localStorage.setItem(MANNEQUIN_STORAGE_NAME, JSON.stringify({ gender: value.gender, pose: value.pose })); }
    catch { /* The fitting room remains usable without persistent storage. */ }
  }, { deep: true });
  function setGender(gender: MannequinGender) {
    if (gender !== "girl" && gender !== "boy") return;
    config.value = resolveAvatar({ gender, pose: config.value.pose });
    lastChange.value = `${gender === 'boy' ? '少年' : '少女'}のキャラクターに変更しました。`;
  }
  function setPose(id: string) {
    if (!studioPoses.some(pose => pose.id === id)) return;
    config.value = resolveAvatar({ ...config.value, pose: resolveStudioPose(id).id });
    lastChange.value = `${pose.value.name}に変更しました。`;
  }
  function reset() {
    config.value = { ...defaultAvatar };
    lastChange.value = "素体を初期状態に戻しました。";
  }
  return { config, mannequinTypes, pose, browsingPoses, lastChange, hydrate, setGender, setPose, reset, resolved: () => resolveAvatar(config.value) };
});
