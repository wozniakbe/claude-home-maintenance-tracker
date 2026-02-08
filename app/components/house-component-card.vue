<script lang="ts" setup>
import type { SelectHouseComponent } from "~~/lib/db/schema";

defineProps<{
  houseComponent: SelectHouseComponent;
}>();
</script>

<template>
  <NuxtLink
    :to="`/dashboard/components/${houseComponent.slug}`"
    class="card bg-base-200 border border-base-300 hover:bg-base-300 transition-colors cursor-pointer"
  >
    <div class="card-body">
      <h3 class="card-title">
        <Icon name="tabler:home-cog" size="20" />
        {{ houseComponent.name }}
      </h3>
      <div
        v-if="houseComponent.floor !== null || houseComponent.room"
        class="flex items-center gap-2 text-sm text-base-content/70"
      >
        <span v-if="houseComponent.floor !== null" class="badge badge-sm badge-ghost">
          {{ houseComponent.floor === 0 ? 'Basement' : houseComponent.floor === 1 ? 'First Floor' : 'Second Floor' }}
        </span>
        <span v-if="houseComponent.room">
          {{ houseComponent.room }}
        </span>
      </div>
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
