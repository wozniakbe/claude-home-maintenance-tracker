<script lang="ts" setup>
const router = useRouter();
const loading = ref(false);
const error = ref<string | null>(null);
const { $csrfFetch } = useNuxtApp();

async function handleSubmit(data: { name: string; description: string | null }) {
  loading.value = true;
  error.value = null;

  try {
    await $csrfFetch("/api/house-components", {
      method: "POST",
      body: data,
    });
    router.push("/dashboard");
  }
  catch (e: unknown) {
    const fetchError = e as { statusMessage?: string };
    error.value = fetchError.statusMessage ?? "Failed to create component";
  }
  finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 max-w-xl">
    <div class="flex items-center gap-2">
      <NuxtLink to="/dashboard" class="btn btn-ghost btn-sm btn-square">
        <Icon name="tabler:arrow-left" size="20" />
      </NuxtLink>
      <h1 class="text-2xl font-bold">
        Add Component
      </h1>
    </div>

    <div v-if="error" class="alert alert-error">
      <Icon name="tabler:alert-circle" size="20" />
      <span>{{ error }}</span>
    </div>

    <div class="card bg-base-200 border border-base-300">
      <div class="card-body">
        <HouseComponentForm :loading="loading" @submit="handleSubmit" />
      </div>
    </div>
  </div>
</template>
