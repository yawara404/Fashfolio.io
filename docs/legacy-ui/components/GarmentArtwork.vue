<template>
  <img
    v-if="!isSchematic"
    :src="item.previewUrl"
    :alt="item.title"
    class="garment-photo"
    loading="lazy"
    @error="imageFailed = true"
  />
  <svg
    v-else
    class="garment-art"
    viewBox="0 0 240 260"
    fill="none"
    aria-hidden="true"
  >
    <ellipse cx="120" cy="234" rx="66" ry="7" fill="#28243d" opacity=".06" />
    <g
      stroke="#36333f"
      stroke-width="1.6"
      stroke-linejoin="round"
      stroke-linecap="round"
    >
      <template v-if="item.category === 'tops'">
        <path
          d="M83 45 101 38Q120 52 139 38L157 45 190 86 164 107 151 90 157 206Q120 216 83 206L89 90 76 107 50 86Z"
          :fill="main"
        />
        <path d="m101 38 19 27 19-27M120 65v140" stroke-opacity=".4" />
        <path d="m101 38-9 15 17 22 11-10 11 10 17-22-9-15" :fill="light" />
        <path
          v-if="isRibbon"
          d="m120 69-21-7 3 18 18-8 18 8 3-18-21 7m-3 4-9 28 12-6 12 6-9-28"
          :fill="accent"
        />
        <template v-else>
          <circle
            v-for="y in [86, 108, 130, 152, 174]"
            :key="y"
            cx="120"
            :cy="y"
            r="1.6"
            :fill="accent"
          />
        </template>
        <path
          d="m89 125 9 27m53-27-9 27M88 194q31 7 64 0M60 87l17 13m86 0 17-13"
          stroke-opacity=".3"
        />
      </template>
      <template v-else-if="item.category === 'outer'">
        <path
          d="m85 46 20-10h30l20 10 33 38 10 107-31 5-13-92 5 111H81l5-111-13 92-31-5L52 84Z"
          :fill="main"
        />
        <path d="m105 36 15 48 15-48m-15 48v131" :fill="light" />
        <path
          d="m103 38-15 27 13 9-8 15 27 31m17-82 15 27-13 9 8 15-27 31"
          :fill="light"
        />
        <path
          d="M91 148h21v28H91zm37 0h21v28h-21z"
          :fill="accent"
          fill-opacity=".4"
        />
        <path d="m45 178 27 5m95 0 27-5M87 207h65" stroke-opacity=".4" />
      </template>
      <template v-else-if="item.category === 'bottoms'">
        <template v-if="isPants">
          <path d="M82 40h76l11 174-38 2-11-117-11 117-38-2Z" :fill="main" />
          <path
            d="M82 53h76m-38 0v46m-36 88h27m18 0h27M84 64q2 25 24 17m48-17q-2 25-24 17"
            stroke-opacity=".45"
          />
          <path
            d="M76 121h26v26H76zm62 0h26v26h-26z"
            :fill="accent"
            fill-opacity=".3"
          />
        </template>
        <template v-else>
          <path d="M84 61h72l34 139q-68 28-140 0Z" :fill="main" />
          <path d="M84 61h72v15H84z" :fill="accent" />
          <path
            d="m87 77-19 130m35-130-9 137m26-137v140m17-140 10 137m6-137 20 131"
            stroke-opacity=".5"
          />
          <path d="M54 190q67 24 132 0" :stroke="light" stroke-width="4" />
        </template>
      </template>
      <template v-else-if="item.category === 'head'">
        <template v-if="isGlasses">
          <path d="m33 119 20-19h134l20 19M106 124q14-12 28 0" />
          <rect
            x="46"
            y="108"
            width="60"
            height="43"
            rx="15"
            :fill="main"
            fill-opacity=".15"
            stroke-width="4"
          />
          <rect
            x="134"
            y="108"
            width="60"
            height="43"
            rx="15"
            :fill="main"
            fill-opacity=".15"
            stroke-width="4"
          />
        </template>
        <template v-else>
          <path
            d="M44 131C23 75 154 55 194 105q24 34-32 46l-88-2Z"
            :fill="main"
          />
          <path d="M64 134q54-18 111-2l-4 20q-51-6-103 2Z" :fill="accent" />
          <path d="m123 75 2-13" stroke-width="5" />
          <path d="m159 123 24-16-2 23 17 14-28-2Z" :fill="light" />
        </template>
      </template>
      <template v-else>
        <path
          d="m58 57 47 2-4 91 13 31-2 28H40v-25l13-25Zm78 0 47 2-4 91 19 27 3 32h-76v-25l9-25Z"
          :fill="main"
        />
        <path d="M41 199h71v15H40zm85 0h75v15h-76z" :fill="accent" />
        <path
          d="m58 71 45 2m34-2 44 2M57 151l43 3m36-3 42 3"
          :stroke="light"
          stroke-width="3"
        />
        <path
          d="m60 163 22 21m-23-10 22-10m58-1 23 21m-24-10 22-10"
          :stroke="light"
        />
      </template>
    </g>
  </svg>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import type { CostumeItem } from "~/types/costume";
const props = defineProps<{ item: CostumeItem }>();
const imageFailed = ref(false);
const isSchematic = computed(
  () => props.item.previewUrl.startsWith("data:") || imageFailed.value,
);
const main = computed(() => props.item.dominantColors[1] || "#b4aec5");
const accent = computed(() => props.item.dominantColors[2] || "#7f739c");
const light = computed(() => props.item.dominantColors[3] || "#f5f2ed");
const isPants = computed(() =>
  props.item.tags.some((t) =>
    ["jeans", "pants", "cargo_pants", "shorts"].includes(t),
  ),
);
const isGlasses = computed(() =>
  props.item.tags.some((t) => ["glasses", "sunglasses"].includes(t)),
);
const isRibbon = computed(() =>
  props.item.tags.some((t) =>
    ["blouse", "frilled_shirt", "sailor_collar", "ribbon"].includes(t),
  ),
);
</script>
