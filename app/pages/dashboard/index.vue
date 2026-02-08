<script lang="ts" setup>
const authStore = useAuthStore();

const { data: dashboard, status } = await useFetch("/api/dashboard");
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        Welcome, {{ authStore.user?.name }}
      </h1>
      <NuxtLink to="/dashboard/components/new" class="btn btn-primary">
        <Icon name="tabler:plus" size="20" />
        Add Component
      </NuxtLink>
    </div>

    <!-- Loading State -->
    <div v-if="status === 'pending'" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg" />
    </div>

    <template v-else-if="dashboard">
      <!-- Stats -->
      <DashboardStats
        :component-count="dashboard.stats.componentCount"
        :pending-task-count="dashboard.stats.pendingTaskCount"
        :overdue-task-count="dashboard.stats.overdueTaskCount"
      />

      <!-- Empty State - No Components Yet -->
      <div
        v-if="!dashboard.houseComponents.length"
        class="card bg-base-200 border border-base-300 w-full"
      >
        <div class="card-body items-center text-center">
          <Icon
            name="tabler:home-cog"
            size="48"
            class="text-base-content/50"
          />
          <h2 class="card-title">
            No components yet
          </h2>
          <p class="text-base-content/70">
            Start by adding the first component of your home to track.
          </p>
          <div class="card-actions mt-4">
            <NuxtLink to="/dashboard/components/new" class="btn btn-primary">
              <Icon name="tabler:plus" size="20" />
              Add Your First Component
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Dashboard Content -->
      <template v-else>
        <div class="grid gap-6 lg:grid-cols-2">
          <!-- Left Column: Tasks -->
          <div class="flex flex-col gap-6">
            <!-- Overdue Tasks -->
            <section v-if="dashboard.overdueTasks.length">
              <div class="flex items-center gap-2 mb-3">
                <Icon
                  name="tabler:alert-circle"
                  size="20"
                  class="text-error"
                />
                <h2 class="text-lg font-semibold">
                  Overdue
                </h2>
                <span class="badge badge-error badge-sm">{{ dashboard.overdueTasks.length }}</span>
              </div>
              <div class="flex flex-col gap-2">
                <DashboardTaskItem
                  v-for="task in dashboard.overdueTasks"
                  :key="task.id"
                  :task="task"
                />
              </div>
            </section>

            <!-- Upcoming Tasks -->
            <section>
              <div class="flex items-center gap-2 mb-3">
                <Icon
                  name="tabler:calendar"
                  size="20"
                  class="text-warning"
                />
                <h2 class="text-lg font-semibold">
                  Upcoming
                </h2>
                <span v-if="dashboard.upcomingTasks.length" class="badge badge-warning badge-sm">
                  {{ dashboard.upcomingTasks.length }}
                </span>
              </div>
              <div v-if="dashboard.upcomingTasks.length" class="flex flex-col gap-2">
                <DashboardTaskItem
                  v-for="task in dashboard.upcomingTasks"
                  :key="task.id"
                  :task="task"
                />
              </div>
              <p v-else class="text-base-content/70">
                No upcoming tasks in the next 7 days.
              </p>
            </section>

            <!-- Recently Completed -->
            <section v-if="dashboard.recentlyCompletedTasks.length">
              <div class="flex items-center gap-2 mb-3">
                <Icon
                  name="tabler:circle-check"
                  size="20"
                  class="text-success"
                />
                <h2 class="text-lg font-semibold">
                  Recently Completed
                </h2>
              </div>
              <div class="flex flex-col gap-2">
                <DashboardTaskItem
                  v-for="task in dashboard.recentlyCompletedTasks"
                  :key="task.id"
                  :task="task"
                />
              </div>
            </section>
          </div>

          <!-- Right Column: Components -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-lg font-semibold">
                Your House
              </h2>
              <NuxtLink to="/dashboard/components/new" class="btn btn-ghost btn-sm">
                <Icon name="tabler:plus" size="18" />
                Add
              </NuxtLink>
            </div>
            <ComponentTree :components="dashboard.componentsTree" />
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
