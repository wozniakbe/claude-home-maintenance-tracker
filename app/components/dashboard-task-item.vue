<script lang="ts" setup>
const props = defineProps<{
  task: {
    id: number;
    title: string;
    dueAt: number | null;
    status: string;
    completedAt: number | null;
    houseComponent: {
      name: string;
      slug: string;
    };
  };
}>();

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

function isOverdue(dueAt: number | null): boolean {
  if (!dueAt)
    return false;
  return dueAt < Date.now() && props.task.status === "pending";
}
</script>

<template>
  <NuxtLink
    :to="`/dashboard/tasks/${task.id}`"
    class="flex items-center justify-between gap-4 p-3 rounded-lg bg-base-200 border border-base-300 hover:bg-base-300 transition-colors"
  >
    <div class="flex-1 min-w-0">
      <p
        class="font-medium truncate"
        :class="{
          'line-through text-base-content/50': task.status !== 'pending',
        }"
      >
        {{ task.title }}
      </p>
      <p class="text-sm text-base-content/70">
        {{ task.houseComponent.name }}
      </p>
    </div>

    <div class="shrink-0 text-right">
      <template v-if="task.status === 'pending' && task.dueAt">
        <p
          class="text-sm"
          :class="isOverdue(task.dueAt) ? 'text-error font-medium' : 'text-base-content/70'"
        >
          <Icon
            v-if="isOverdue(task.dueAt)"
            name="tabler:alert-circle"
            size="14"
            class="inline"
          />
          {{ formatDate(task.dueAt) }}
        </p>
      </template>
      <template v-else-if="task.status !== 'pending'">
        <span
          class="badge badge-sm"
          :class="{
            'badge-success': task.status === 'completed',
            'badge-ghost': task.status === 'skipped',
          }"
        >
          {{ task.status }}
        </span>
        <p v-if="task.completedAt" class="text-xs text-base-content/50">
          {{ formatDate(task.completedAt) }}
        </p>
      </template>
      <template v-else>
        <span class="text-sm text-base-content/50">No due date</span>
      </template>
    </div>

    <Icon
      name="tabler:chevron-right"
      size="20"
      class="text-base-content/50 shrink-0"
    />
  </NuxtLink>
</template>
