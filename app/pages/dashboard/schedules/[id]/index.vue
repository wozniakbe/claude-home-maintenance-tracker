<script lang="ts" setup>
const route = useRoute();
const router = useRouter();
const scheduleId = route.params.id as string;
const { $csrfFetch } = useNuxtApp();

const { data: schedule, status } = await useFetch(`/api/schedules/${scheduleId}`);

const showDeleteDialog = ref(false);
const deleteLoading = ref(false);

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

function isOverdue(nextDueAt: number): boolean {
  return nextDueAt < Date.now();
}

async function handleDelete() {
  deleteLoading.value = true;
  try {
    await $csrfFetch(`/api/schedules/${scheduleId}`, {
      method: "DELETE",
    });
    router.push(`/dashboard/components/${schedule.value?.houseComponent.slug}`);
  }
  catch {
    deleteLoading.value = false;
    showDeleteDialog.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 max-w-2xl">
    <!-- Loading State -->
    <div v-if="status === 'pending'" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <!-- Error State -->
    <div v-else-if="status === 'error' || !schedule" class="alert alert-error">
      <Icon name="tabler:alert-circle" size="20" />
      <span>Schedule not found</span>
      <NuxtLink to="/dashboard" class="btn btn-sm">
        Back to Dashboard
      </NuxtLink>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Header -->
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-center gap-3">
          <NuxtLink
            :to="`/dashboard/components/${schedule.houseComponent.slug}`"
            class="btn btn-ghost btn-sm btn-square"
          >
            <Icon name="tabler:arrow-left" size="20" />
          </NuxtLink>
          <div>
            <p class="text-sm text-base-content/70">
              {{ schedule.houseComponent.name }}
            </p>
            <h1 class="text-2xl font-bold">
              {{ schedule.name }}
            </h1>
          </div>
        </div>
        <div class="flex gap-2">
          <NuxtLink
            :to="`/dashboard/schedules/${scheduleId}/edit`"
            class="btn btn-ghost btn-sm"
          >
            <Icon name="tabler:edit" size="18" />
            Edit
          </NuxtLink>
          <button
            class="btn btn-ghost btn-sm text-error"
            @click="showDeleteDialog = true"
          >
            <Icon name="tabler:trash" size="18" />
            Delete
          </button>
        </div>
      </div>

      <!-- Schedule Details Card -->
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <div class="flex flex-wrap gap-6">
            <div>
              <p class="text-sm text-base-content/70">
                Interval
              </p>
              <p class="font-medium">
                <Icon
                  name="tabler:calendar-repeat"
                  size="18"
                  class="inline text-primary"
                />
                {{ formatInterval(schedule.intervalDays) }}
              </p>
            </div>

            <div>
              <p class="text-sm text-base-content/70">
                Next Due
              </p>
              <p :class="isOverdue(schedule.nextDueAt) ? 'text-error font-medium' : ''">
                <Icon
                  v-if="isOverdue(schedule.nextDueAt)"
                  name="tabler:alert-circle"
                  size="16"
                  class="inline"
                />
                {{ formatDate(schedule.nextDueAt) }}
              </p>
            </div>

            <div v-if="schedule.lastCompletedAt">
              <p class="text-sm text-base-content/70">
                Last Completed
              </p>
              <p>{{ formatDate(schedule.lastCompletedAt) }}</p>
            </div>

            <div>
              <p class="text-sm text-base-content/70">
                Created
              </p>
              <p>{{ formatDate(schedule.createdAt) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div v-if="schedule.description" class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h2 class="card-title text-base">
            Description
          </h2>
          <p class="whitespace-pre-wrap">
            {{ schedule.description }}
          </p>
        </div>
      </div>

      <!-- Delete Confirmation Dialog -->
      <ConfirmDialog
        :open="showDeleteDialog"
        title="Delete Schedule"
        :message="`Are you sure you want to delete '${schedule.name}'? Existing tasks will be kept but will no longer be linked to this schedule.`"
        confirm-label="Delete"
        :loading="deleteLoading"
        @confirm="handleDelete"
        @cancel="showDeleteDialog = false"
      />
    </template>
  </div>
</template>
