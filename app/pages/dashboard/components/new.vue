<script lang="ts" setup>
const route = useRoute();
const router = useRouter();
const loading = ref(false);
const error = ref<string | null>(null);
const { $csrfFetch } = useNuxtApp();

// Get initial parent ID from query parameter
const initialParentId = computed(() => {
  const id = route.query.parentId;
  if (typeof id === "string") {
    const parsed = Number.parseInt(id, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
});

// Fetch available parents for the dropdown
const { data: components } = await useFetch("/api/house-components");

const availableParents = computed(() => {
  if (!components.value)
    return [];
  return components.value.map(c => ({ id: c.id, name: c.name, slug: c.slug }));
});

async function handleSubmit(data: { name: string; description: string | null; parentId: number | null }) {
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
        <HouseComponentForm
          :loading="loading"
          :available-parents="availableParents"
          :initial-parent-id="initialParentId"
          @submit="handleSubmit"
        />
      </div>
    </div>
  </div>
</template>
