<script lang="ts" setup>
const route = useRoute();
const router = useRouter();
const slug = route.params.slug as string;
const { $csrfFetch } = useNuxtApp();

const { data: houseComponent, status } = await useFetch(`/api/house-components/${slug}`);

const loading = ref(false);
const error = ref<string | null>(null);

async function handleSubmit(data: { name: string; description: string | null }) {
  loading.value = true;
  error.value = null;

  try {
    const updated = await $csrfFetch(`/api/house-components/${slug}`, {
      method: "PUT",
      body: data,
    });
    // Navigate to the new slug in case it changed
    router.push(`/dashboard/components/${updated.slug}`);
  }
  catch (e: unknown) {
    const fetchError = e as { statusMessage?: string };
    error.value = fetchError.statusMessage ?? "Failed to update component";
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
    <div v-else-if="status === 'error' || !houseComponent" class="alert alert-error">
      <Icon name="tabler:alert-circle" size="20" />
      <span>House component not found</span>
      <NuxtLink to="/dashboard" class="btn btn-sm">
        Back to Dashboard
      </NuxtLink>
    </div>

    <!-- Content -->
    <template v-else>
      <div class="flex items-center gap-2">
        <NuxtLink
          :to="`/dashboard/components/${slug}`"
          class="btn btn-ghost btn-sm btn-square"
        >
          <Icon name="tabler:arrow-left" size="20" />
        </NuxtLink>
        <h1 class="text-2xl font-bold">
          Edit {{ houseComponent.name }}
        </h1>
      </div>

      <div v-if="error" class="alert alert-error">
        <Icon name="tabler:alert-circle" size="20" />
        <span>{{ error }}</span>
      </div>

      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <HouseComponentForm
            :house-component="houseComponent"
            :loading="loading"
            :cancel-url="`/dashboard/components/${slug}`"
            @submit="handleSubmit"
          />
        </div>
      </div>
    </template>
  </div>
</template>
