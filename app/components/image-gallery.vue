<script lang="ts" setup>
import type { SelectTaskImage } from "~~/lib/db/schema";

defineProps<{
  images: SelectTaskImage[];
}>();

const config = useRuntimeConfig();
</script>

<template>
  <div class="flex gap-3 overflow-x-auto pb-2">
    <div
      v-for="image in images"
      :key="image.id"
      class="card bg-base-300 border border-base-content/10 shrink-0 w-40 h-32"
    >
      <figure class="h-full">
        <img
          class="w-full h-full object-cover"
          :src="`${config.public.s3BucketUrl}/${image.key}`"
          alt="Task image"
        >
      </figure>
      <slot :image="image" />
    </div>
  </div>
</template>
