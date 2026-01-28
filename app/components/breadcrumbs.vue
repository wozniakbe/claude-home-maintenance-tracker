<script lang="ts" setup>
defineProps<{
  ancestors: { id: number; name: string; slug: string }[];
  currentName: string;
}>();
</script>

<template>
  <div class="breadcrumbs text-sm">
    <ul>
      <li>
        <NuxtLink to="/dashboard" class="flex items-center gap-1">
          <Icon name="tabler:home" size="14" />
          Dashboard
        </NuxtLink>
      </li>
      <li v-for="ancestor in ancestors" :key="ancestor.id">
        <NuxtLink :to="`/dashboard/components/${ancestor.slug}`">
          {{ ancestor.name }}
        </NuxtLink>
      </li>
      <li>
        <span class="text-base-content/70">{{ currentName }}</span>
      </li>
    </ul>
  </div>
</template>
