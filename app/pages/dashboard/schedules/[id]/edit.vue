<script lang="ts" setup>
const route = useRoute();
const router = useRouter();
const scheduleId = route.params.id as string;
const { $csrfFetch } = useNuxtApp();

const { data: schedule, status } = await useFetch(`/api/schedules/${scheduleId}`);

const loading = ref(false);
const error = ref<string | null>(null);

async function handleSubmit(data: { name: string; description: string | null; intervalDays: number }) {
  loading.value = true;
  error.value = null;

  try {
    await $csrfFetch(`/api/schedules/${scheduleId}`, {
      method: "PUT",
      body: data,
    });
    router.push(`/dashboard/schedules/${scheduleId}`);
  }
  catch (e: unknown) {
    const fetchError = e as { statusMessage?: string };
    error.value = fetchError.statusMessage ?? "Failed to update schedule";
  }
  finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 max-w-xl">
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
      <div class="flex items-center gap-2">
        <NuxtLink
          :to="`/dashboard/schedules/${scheduleId}`"
          class="btn btn-ghost btn-sm btn-square"
        >
          <Icon name="tabler:arrow-left" size="20" />
        </NuxtLink>
        <div>
          <p class="text-sm text-base-content/70">
            {{ schedule.houseComponent.name }}
          </p>
          <h1 class="text-2xl font-bold">
            Edit Schedule
          </h1>
        </div>
      </div>

      <div v-if="error" class="alert alert-error">
        <Icon name="tabler:alert-circle" size="20" />
        <span>{{ error }}</span>
      </div>

      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <ScheduleForm
            :schedule="schedule"
            :loading="loading"
            :cancel-url="`/dashboard/schedules/${scheduleId}`"
            @submit="handleSubmit"
          />
        </div>
      </div>
    </template>
  </div>
</template>
