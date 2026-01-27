<script lang="ts" setup>
const authStore = useAuthStore();

const { data: houseComponents, status } = await useFetch("/api/house-components");
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

    <!-- Empty State -->
    <div
      v-else-if="!houseComponents?.length"
      class="card bg-base-200 w-full"
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

    <!-- Components List -->
    <div v-else class="flex flex-col gap-4">
      <h2 class="text-lg font-semibold">
        Your Components
      </h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <HouseComponentCard
          v-for="component in houseComponents"
          :key="component.id"
          :house-component="component"
        />
      </div>
    </div>
  </div>
</template>
