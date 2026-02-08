<script lang="ts" setup>
import type { SelectTaskImage } from "~~/lib/db/schema";

const props = defineProps<{
  images: SelectTaskImage[];
}>();

const config = useRuntimeConfig();

const lightboxVisible = ref(false);
const lightboxIndex = ref(0);

const lightboxImgs = computed(() =>
  props.images.map(image => `${config.public.s3BucketUrl}/${image.key}`),
);

function showLightbox(index: number) {
  lightboxIndex.value = index;
  lightboxVisible.value = true;
}

function hideLightbox() {
  lightboxVisible.value = false;
}
</script>

<template>
  <div>
    <div class="flex gap-3 overflow-x-auto pb-2">
      <div
        v-for="(image, index) in images"
        :key="image.id"
        class="card bg-base-300 border border-base-content/10 shrink-0 w-40 h-32 cursor-pointer"
        @click="showLightbox(index)"
      >
        <figure class="h-full">
          <img
            class="w-full h-full object-cover"
            :src="`${config.public.s3BucketUrl}/${image.key}`"
            alt="Task work progress"
          >
        </figure>
        <slot :image="image" />
      </div>
    </div>
    <VueEasyLightbox
      :visible="lightboxVisible"
      :imgs="lightboxImgs"
      :index="lightboxIndex"
      @hide="hideLightbox"
    />
  </div>
</template>
