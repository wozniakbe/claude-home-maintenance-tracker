<script lang="ts" setup>
import type { SelectTask } from "~~/lib/db/schema";

const props = defineProps<{
  task: SelectTask;
  loading?: boolean;
}>();

const emit = defineEmits<{
  complete: [status: "completed" | "skipped"];
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
  <div class="card bg-base-200 border border-base-300">
    <div class="card-body py-3 px-4">
      <!-- Mobile: stack vertically, SM+: horizontal row -->
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <NuxtLink
              :to="`/dashboard/tasks/${task.id}`"
              class="font-medium hover:underline"
              :class="{
                'line-through text-base-content/50': task.status !== 'pending',
              }"
            >
              {{ task.title }}
            </NuxtLink>
            <span
              v-if="task.status !== 'pending'"
              class="badge badge-sm"
              :class="{
                'badge-success': task.status === 'completed',
                'badge-ghost': task.status === 'skipped',
              }"
            >
              {{ task.status }}
            </span>
          </div>
          <div
            v-if="task.dueAt"
            class="text-sm mt-1"
            :class="isOverdue(task.dueAt) ? 'text-error' : 'text-base-content/70'"
          >
            <Icon
              v-if="isOverdue(task.dueAt)"
              name="tabler:alert-circle"
              size="14"
              class="inline"
            />
            Due: {{ formatDate(task.dueAt) }}
          </div>
          <div
            v-if="task.status !== 'pending' && task.completedAt"
            class="text-sm mt-1 text-base-content/70"
          >
            <Icon
              name="tabler:circle-check"
              size="14"
              class="inline text-success"
            />
            Completed: {{ formatDate(task.completedAt) }}
          </div>
          <div v-if="task.description" class="text-sm text-base-content/70 mt-1 line-clamp-2">
            {{ task.description }}
          </div>
        </div>

        <!-- Action buttons - full width on mobile, auto on SM+ -->
        <div v-if="task.status === 'pending'" class="flex gap-2 sm:gap-1 sm:shrink-0">
          <button
            class="btn btn-success btn-sm flex-1 sm:flex-none"
            :disabled="loading"
            title="Mark as completed"
            @click="emit('complete', 'completed')"
          >
            <span v-if="loading" class="loading loading-spinner loading-xs" />
            <Icon
              v-else
              name="tabler:check"
              size="18"
            />
            <span class="sm:hidden">Complete</span>
          </button>
          <button
            class="btn btn-ghost btn-sm flex-1 sm:flex-none"
            :disabled="loading"
            title="Skip this task"
            @click="emit('complete', 'skipped')"
          >
            <Icon name="tabler:x" size="18" />
            <span class="sm:hidden">Skip</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
