<template>
  <div class="fitting-items pose-items" role="group" aria-label="ポーズを選択">
    <button v-for="pose in poses" :key="pose.id" class="fitting-item pose-item" :class="{ selected: avatar.pose.id === pose.id }" :aria-label="pose.name" :aria-pressed="avatar.pose.id === pose.id" :title="pose.caption" @click="avatar.setPose(pose.id)">
      <span>
        <MannequinPreview class="pose-thumbnail" :heads="5" :gender="avatar.config.gender" :pose="pose.id" :selected="[]" :palette="[]" :dressed="false" :guides="false" :palette-colors="false" aria-hidden="true" />
        <i v-if="avatar.pose.id === pose.id"><Check :size="11" /></i>
      </span>
      <strong>{{ pose.name }}</strong>
    </button>
  </div>
</template>
<script setup lang="ts">
import { onMounted } from "vue";
import { Check } from "lucide-vue-next";
import MannequinPreview from "~/components/MannequinPreview.vue";
import { useAvatar } from "~/composables/useAvatar";
import type { StudioPose } from "~/data/studioPoses";
defineProps<{ poses: readonly StudioPose[] }>();
const avatar = useAvatar();
onMounted(() => avatar.hydrate());
</script>
