<script lang="ts" setup>
const route = useRoute();
const slug = route.params.slug as string;

const { data: houseComponent, status } = await useFetch(`/api/house-components/${slug}`);
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
      <!-- Header -->
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-center gap-3">
          <NuxtLink to="/dashboard" class="btn btn-ghost btn-sm btn-square">
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
          <button class="btn btn-ghost btn-sm text-error">
            <Icon name="tabler:trash" size="18" />
            Delete
          </button>
        </div>
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
          class="card bg-base-200"
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
          <div
            v-for="task in houseComponent.tasks"
            :key="task.id"
            class="card bg-base-200"
          >
            <div class="card-body py-3 px-4">
              <div class="flex items-center justify-between">
                <span :class="{ 'line-through text-base-content/50': task.status === 'completed' }">
                  {{ task.title }}
                </span>
                <span
                  class="badge badge-sm"
                  :class="{
                    'badge-warning': task.status === 'pending',
                    'badge-success': task.status === 'completed',
                    'badge-ghost': task.status === 'skipped',
                  }"
                >
                  {{ task.status }}
                </span>
              </div>
            </div>
          </div>
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
          class="card bg-base-200"
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
          <div
            v-for="schedule in houseComponent.schedules"
            :key="schedule.id"
            class="card bg-base-200"
          >
            <div class="card-body py-3 px-4">
              <div class="flex items-center justify-between">
                <span>{{ schedule.name }}</span>
                <span class="text-sm text-base-content/70">
                  Every {{ schedule.intervalDays }} days
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
