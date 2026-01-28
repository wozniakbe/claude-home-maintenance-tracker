<script lang="ts" setup>
const route = useRoute();
const router = useRouter();
const slug = route.params.slug as string;
const { $csrfFetch } = useNuxtApp();

const { data: houseComponent, status, refresh } = await useFetch(`/api/house-components/${slug}`);

const showDeleteDialog = ref(false);
const deleteLoading = ref(false);
const completingTaskId = ref<number | null>(null);

async function handleDelete() {
  deleteLoading.value = true;
  try {
    await $csrfFetch(`/api/house-components/${slug}`, {
      method: "DELETE",
    });
    router.push("/dashboard");
  }
  catch {
    deleteLoading.value = false;
    showDeleteDialog.value = false;
  }
}

async function handleCompleteTask(taskId: number, status: "completed" | "skipped") {
  completingTaskId.value = taskId;
  try {
    await $csrfFetch(`/api/tasks/${taskId}/complete`, {
      method: "POST",
      body: { status },
    });
    await refresh();
  }
  catch {
    // Could show error toast
  }
  finally {
    completingTaskId.value = null;
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Loading State -->
    <div v-if="status === 'pending'" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <!-- Error State -->
    <div v-else-if="status === 'error' || !houseComponent" class="alert alert-error">
      <Icon name="tabler:alert-circle" size="20" />
      <span>House component not found</span>
      <NuxtLink to="/dashboard" class="btn btn-sm">
        Back to Dashboard
      </NuxtLink>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Breadcrumbs -->
      <Breadcrumbs
        v-if="houseComponent.ancestors?.length"
        :ancestors="houseComponent.ancestors"
        :current-name="houseComponent.name"
      />

      <!-- Header -->
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-center gap-3">
          <NuxtLink
            :to="houseComponent.parent ? `/dashboard/components/${houseComponent.parent.slug}` : '/dashboard'"
            class="btn btn-ghost btn-sm btn-square"
          >
            <Icon name="tabler:arrow-left" size="20" />
          </NuxtLink>
          <div>
            <h1 class="text-2xl font-bold">
              {{ houseComponent.name }}
            </h1>
            <p v-if="houseComponent.description" class="text-base-content/70 mt-1">
              {{ houseComponent.description }}
            </p>
          </div>
        </div>
        <div class="flex gap-2">
          <NuxtLink
            :to="`/dashboard/components/${slug}/edit`"
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

      <!-- Child Components Section -->
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            Sub-components
          </h2>
          <NuxtLink
            :to="`/dashboard/components/new?parentId=${houseComponent.id}`"
            class="btn btn-ghost btn-sm"
          >
            <Icon name="tabler:plus" size="18" />
            Add
          </NuxtLink>
        </div>
        <div v-if="houseComponent.children?.length" class="flex flex-col gap-2">
          <NuxtLink
            v-for="child in houseComponent.children"
            :key="child.id"
            :to="`/dashboard/components/${child.slug}`"
            class="card bg-base-200 border border-base-300 hover:bg-base-300 transition-colors"
          >
            <div class="card-body py-3 px-4">
              <div class="flex items-center gap-2">
                <Icon
                  name="tabler:home-cog"
                  size="18"
                  class="text-base-content/70"
                />
                <span class="font-medium">{{ child.name }}</span>
              </div>
            </div>
          </NuxtLink>
        </div>
        <p v-else class="text-base-content/50 text-sm">
          No sub-components yet.
        </p>
      </div>

      <!-- Tasks Section -->
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            Tasks
          </h2>
          <NuxtLink
            :to="`/dashboard/components/${slug}/tasks/new`"
            class="btn btn-primary btn-sm"
          >
            <Icon name="tabler:plus" size="18" />
            Add Task
          </NuxtLink>
        </div>

        <div
          v-if="!houseComponent.tasks?.length"
          class="card bg-base-200 border border-base-300"
        >
          <div class="card-body items-center text-center py-8">
            <Icon
              name="tabler:clipboard-list"
              size="32"
              class="text-base-content/50"
            />
            <p class="text-base-content/70">
              No tasks yet
            </p>
          </div>
        </div>

        <div v-else class="flex flex-col gap-2">
          <TaskCard
            v-for="task in houseComponent.tasks"
            :key="task.id"
            :task="task"
            :loading="completingTaskId === task.id"
            @complete="handleCompleteTask(task.id, $event)"
          />
        </div>
      </div>

      <!-- Schedules Section -->
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            Maintenance Schedules
          </h2>
          <NuxtLink
            :to="`/dashboard/components/${slug}/schedules/new`"
            class="btn btn-primary btn-sm"
          >
            <Icon name="tabler:plus" size="18" />
            Add Schedule
          </NuxtLink>
        </div>

        <div
          v-if="!houseComponent.schedules?.length"
          class="card bg-base-200 border border-base-300"
        >
          <div class="card-body items-center text-center py-8">
            <Icon
              name="tabler:calendar-repeat"
              size="32"
              class="text-base-content/50"
            />
            <p class="text-base-content/70">
              No maintenance schedules yet
            </p>
          </div>
        </div>

        <div v-else class="flex flex-col gap-2">
          <ScheduleCard
            v-for="schedule in houseComponent.schedules"
            :key="schedule.id"
            :schedule="schedule"
          />
        </div>
      </div>

      <!-- Delete Confirmation Dialog -->
      <ConfirmDialog
        :open="showDeleteDialog"
        title="Delete Component"
        :message="`Are you sure you want to delete '${houseComponent.name}'? This will also delete all tasks and schedules associated with it. This action cannot be undone.`"
        confirm-label="Delete"
        :loading="deleteLoading"
        @confirm="handleDelete"
        @cancel="showDeleteDialog = false"
      />
    </template>
  </div>
</template>
