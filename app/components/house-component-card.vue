<script lang="ts" setup>
import type { SelectHouseComponent } from "~~/lib/db/schema";

defineProps<{
  houseComponent: SelectHouseComponent;
}>();
</script>

<template>
  <NuxtLink
    :to="`/dashboard/components/${houseComponent.slug}`"
    class="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
  >
    <div class="card-body">
      <h3 class="card-title">
        <Icon name="tabler:home-cog" size="20" />
        {{ houseComponent.name }}
      </h3>
      <p
        v-if="houseComponent.description"
        class="text-base-content/70 line-clamp-2"
      >
        {{ houseComponent.description }}
      </p>
      <p v-else class="text-base-content/50 italic">
        No description
      </p>
    </div>
  </NuxtLink>
</template>
