<script lang="ts" setup>
const route = useRoute();
const router = useRouter();
const taskId = route.params.id as string;
const { $csrfFetch } = useNuxtApp();

const { data: task, status } = await useFetch(`/api/tasks/${taskId}`);

const loading = ref(false);
const error = ref<string | null>(null);

async function handleSubmit(data: { title: string; description: string | null; dueAt: number | null; status?: string }) {
  loading.value = true;
  error.value = null;

  try {
    await $csrfFetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      body: data,
    });
    router.push(`/dashboard/tasks/${taskId}`);
  }
  catch (e: unknown) {
    const fetchError = e as { statusMessage?: string };
    error.value = fetchError.statusMessage ?? "Failed to update task";
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
    <div v-else-if="status === 'error' || !task" class="alert alert-error">
      <Icon name="tabler:alert-circle" size="20" />
      <span>Task not found</span>
      <NuxtLink to="/dashboard" class="btn btn-sm">
        Back to Dashboard
      </NuxtLink>
    </div>

    <!-- Content -->
    <template v-else>
      <div class="flex items-center gap-2">
        <NuxtLink
          :to="`/dashboard/tasks/${taskId}`"
          class="btn btn-ghost btn-sm btn-square"
        >
          <Icon name="tabler:arrow-left" size="20" />
        </NuxtLink>
        <div>
          <p class="text-sm text-base-content/70">
            {{ task.houseComponent.name }}
          </p>
          <h1 class="text-2xl font-bold">
            Edit Task
          </h1>
        </div>
      </div>

      <div v-if="error" class="alert alert-error">
        <Icon name="tabler:alert-circle" size="20" />
        <span>{{ error }}</span>
      </div>

      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <TaskForm
            :task="task"
            :loading="loading"
            :cancel-url="`/dashboard/tasks/${taskId}`"
            @submit="handleSubmit"
          />
        </div>
      </div>
    </template>
  </div>
</template>
