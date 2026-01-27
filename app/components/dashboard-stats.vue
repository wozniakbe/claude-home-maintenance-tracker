<script lang="ts" setup>
defineProps<{
  componentCount: number;
  pendingTaskCount: number;
  overdueTaskCount: number;
}>();
</script>

<template>
  <div class="stats stats-vertical sm:stats-horizontal bg-base-200 border border-base-300 w-full">
    <div class="stat">
      <div class="stat-figure text-primary">
        <Icon name="tabler:home-cog" size="32" />
      </div>
      <div class="stat-title">
        Components
      </div>
      <div class="stat-value text-primary">
        {{ componentCount }}
      </div>
    </div>

    <div class="stat">
      <div class="stat-figure text-warning">
        <Icon name="tabler:list-check" size="32" />
      </div>
      <div class="stat-title">
        Pending Tasks
      </div>
      <div class="stat-value text-warning">
        {{ pendingTaskCount }}
      </div>
    </div>

    <div class="stat">
      <div class="stat-figure" :class="overdueTaskCount > 0 ? 'text-error' : 'text-success'">
        <Icon :name="overdueTaskCount > 0 ? 'tabler:alert-circle' : 'tabler:circle-check'" size="32" />
      </div>
      <div class="stat-title">
        Overdue
      </div>
      <div class="stat-value" :class="overdueTaskCount > 0 ? 'text-error' : 'text-success'">
        {{ overdueTaskCount }}
      </div>
    </div>
  </div>
</template>
