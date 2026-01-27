<script lang="ts" setup>
import type { SelectMaintenanceSchedule } from "~~/lib/db/schema";

defineProps<{
  schedule: SelectMaintenanceSchedule;
}>();

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

function formatInterval(days: number): string {
  if (days === 1)
    return "Daily";
  if (days === 7)
    return "Weekly";
  if (days === 14)
    return "Every 2 weeks";
  if (days === 30)
    return "Monthly";
  if (days === 60)
    return "Every 2 months";
  if (days === 90)
    return "Quarterly";
  if (days === 182 || days === 183)
    return "Every 6 months";
  if (days === 365)
    return "Yearly";
  return `Every ${days} days`;
}

function isDueSoon(nextDueAt: number): boolean {
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return nextDueAt - Date.now() < sevenDays;
}

function isOverdue(nextDueAt: number): boolean {
  return nextDueAt < Date.now();
}
</script>

<template>
  <NuxtLink
    :to="`/dashboard/schedules/${schedule.id}`"
    class="card bg-base-200 border border-base-300 hover:bg-base-300 transition-colors"
  >
    <div class="card-body py-3 px-4">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <Icon
              name="tabler:calendar-repeat"
              size="18"
              class="text-primary shrink-0"
            />
            <span class="font-medium truncate">{{ schedule.name }}</span>
          </div>
          <p class="text-sm text-base-content/70 mt-1">
            {{ formatInterval(schedule.intervalDays) }}
          </p>
        </div>

        <div class="text-right shrink-0">
          <p class="text-xs text-base-content/50">
            Next due
          </p>
          <p
            class="text-sm"
            :class="{
              'text-error font-medium': isOverdue(schedule.nextDueAt),
              'text-warning': !isOverdue(schedule.nextDueAt) && isDueSoon(schedule.nextDueAt),
            }"
          >
            <Icon
              v-if="isOverdue(schedule.nextDueAt)"
              name="tabler:alert-circle"
              size="14"
              class="inline"
            />
            {{ formatDate(schedule.nextDueAt) }}
          </p>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>
