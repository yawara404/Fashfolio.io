<template>
  <aside class="avatar-panel">
    <div class="section-heading"><div><span class="eyebrow">CHARACTER BASE</span><h2>少年・少女を選ぶ</h2></div><UserRound :size="21" :stroke-width="1.3" /></div>
    <p class="panel-intro">手描きのジト目と、白・薄灰の配色。<br />服の配色とシルエットを見比べるキャラクターです。</p>
    <div class="avatar-presets" aria-label="キャラクターのタイプ">
      <button v-for="type in avatar.mannequinTypes" :key="type.id" :aria-pressed="avatar.config.gender === type.id" :class="{ active: avatar.config.gender === type.id }" @click="avatar.setGender(type.id)">
        <span><strong>{{ type.name }}</strong><small>{{ type.caption }}</small></span><Check v-if="avatar.config.gender === type.id" :size="14" />
      </button>
    </div>
    <p class="avatar-note"><ShieldCheck :size="12" />素体はこのブラウザ内で描画されます。</p>
    <p v-if="avatar.lastChange" class="avatar-change" role="status">{{ avatar.lastChange }}</p>
  </aside>
</template>
<script setup lang="ts">
import { onMounted } from "vue";
import { Check, ShieldCheck, UserRound } from "lucide-vue-next";
import { useAvatar } from "~/composables/useAvatar";
const avatar = useAvatar();
onMounted(() => avatar.hydrate());
</script>
