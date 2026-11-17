<template>
  <details class="prompt-guide" open>
    <summary>
      <Lightbulb :size="13" />英語プロンプトのサジェスト
      <span>押すだけで追加</span>
    </summary>
    <p class="prompt-guide-lead">
      「絵柄 → 形 → 素材 → ディテール → 色 → 雰囲気」の順で選ぶと伝わりやすくなります。既定はシンプル絵柄。日本語のコーデ名でも自動で補います。
    </p>
    <div class="prompt-guide-groups">
      <div
        v-for="group in PROMPT_SUGGESTIONS"
        :key="group.id"
        class="prompt-guide-group"
      >
        <span class="prompt-guide-label"
          >{{ group.label }}<small>{{ group.hint }}</small></span
        >
        <div class="prompt-guide-chips">
          <button
            v-for="item in group.items"
            :key="item.token"
            type="button"
            :class="{ recommended: item.recommended }"
            :disabled="disabled"
            :title="`${item.label} → ${item.token}`"
            @click="$emit('pick', item.token)"
          >
            <em v-if="item.recommended">おすすめ</em>{{ item.label }}<small>{{ item.token }}</small>
          </button>
        </div>
      </div>
    </div>
  </details>
</template>
<script setup lang="ts">
import { Lightbulb } from "lucide-vue-next";
import { PROMPT_SUGGESTIONS } from "~/utils/generationPrompt";

defineProps<{ disabled?: boolean }>();
defineEmits<{ pick: [token: string] }>();
</script>
